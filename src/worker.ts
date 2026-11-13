import { io, Socket } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { v4 as uuidv4 } from "uuid";

const CHAT_SERVER = import.meta.env.VITE_CHAT_SERVER;

type ClientPort = MessagePort | Worker;
const ports: ClientPort[] = [];
const chatEvents = new Set(["response", "error", "severe", "expired"]);

function broadcast(event: object) {
    ports.forEach((port) => port.postMessage(event));
}

function bookingToken(jwt: string) {
    return jwtDecode<IJwtPayload>(jwt).data?.x_auth_token || "";
}

let authToken = self.name;
let x_auth_token = bookingToken(authToken);
let socket: Socket | undefined;
let authenticated = false;
let pendingLogins = 0;
let authPool: ReturnType<typeof setInterval> | undefined;
let previousChatEvent: string | undefined;
let expiry: { type: "expired" | "host-expired"; id: string; timestamp: number } | undefined;

function relayChat(type: string, message = "") {
    const key = JSON.stringify([type, message]);
    if (key === previousChatEvent) return;
    previousChatEvent = key;
    broadcast({ id: uuidv4(), timestamp: Date.now(), type, message });
}

function flushLogins() {
    if (!socket?.connected || !authenticated) return;
    for (; pendingLogins > 0; pendingLogins--) {
        socket.emit("login", JSON.stringify({ x_auth_token }));
    }
}

function retireSocket() {
    clearInterval(authPool);
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = undefined;
    authenticated = false;
    pendingLogins = 0;
    previousChatEvent = undefined;
}

function expireSession(type: "expired" | "host-expired") {
    if (expiry?.type === type || expiry?.type === "host-expired") return;
    retireSocket();
    if (type === "host-expired") x_auth_token = "";
    expiry = { type, id: expiry?.id ?? uuidv4(), timestamp: expiry?.timestamp ?? Date.now() };
    broadcast(expiry);
}

function connect() {
    // A new manager keeps late packets from a previous session off this socket.
    const current = io(CHAT_SERVER, { autoConnect: false, forceNew: true });
    socket = current;
    const markAuthenticated = () => {
        if (authenticated) return;
        authenticated = true;
        clearInterval(authPool);
        flushLogins();
        broadcast({ type: "authenticated" });
    };

    current.onAny((type: string) => {
        if (!chatEvents.has(type)) previousChatEvent = undefined;
    });
    current.on("connect", () => {
        previousChatEvent = undefined;
        if (authenticated) {
            flushLogins();
            broadcast({ type: "connected" });
            return;
        }

        current.emit("authenticate", authToken);
        // Some servers acknowledge authentication with their first reply.
        authPool = setInterval(() => current.emit("authenticate", authToken), 5000);
    });
    current.on("success", markAuthenticated);
    current.on("response", (message: string) => {
        markAuthenticated();
        relayChat("response", message);
    });
    current.on("error", (message: string) => relayChat("error", message));
    current.on("severe", (message: string) => relayChat("severe", message));
    current.on("disconnect", () => {
        clearInterval(authPool);
        previousChatEvent = undefined;
        broadcast({ type: "disconnected" });
    });
    current.on("expired", () => expireSession("expired"));
    current.on("logout", (message: string) => broadcast({ type: "logout", message }));
    current.on("trigger", (message: string) => broadcast({ type: "trigger", message }));
    current.connect();
}

function changeSession(jwt: string) {
    const previousAuthToken = expiry?.type === "host-expired" ? null : authToken;
    retireSocket();
    authToken = jwt;
    x_auth_token = bookingToken(jwt);
    expiry = undefined;
    broadcast({ type: "session-changed", authToken, previousAuthToken });
    connect();
}

function start(port: ClientPort) {
    ports.push(port);
    port.onmessage = ({ data }) => {
        switch (data.type) {
            case "detach": {
                const index = ports.indexOf(port);
                if (index >= 0) ports.splice(index, 1);
                break;
            }
            case "auth": {
                const nextToken = bookingToken(data.message);
                const expiredToken = expiry?.type === "host-expired" && bookingToken(authToken);
                if (nextToken !== x_auth_token && nextToken !== expiredToken) changeSession(data.message);
                port.postMessage({
                    type: "session-settled",
                    expired: !!expiry,
                    ready: !!socket?.connected && authenticated,
                });
                break;
            }
            case "login":
                if (expiry) break;
                pendingLogins++;
                flushLogins();
                break;
            case "logout":
                if (socket?.connected) socket.emit("logout", JSON.stringify({ x_auth_token }));
                changeSession(data.message);
                port.postMessage({ type: "session-settled" });
                break;
            case "host-expired":
                expireSession("host-expired");
                port.postMessage({ type: "session-settled" });
                break;
            case "restart":
                changeSession(data.message);
                port.postMessage({ type: "session-settled" });
                break;
            case "usermessage":
                if (expiry || data.authToken !== authToken || !socket?.connected || !authenticated) break;
                previousChatEvent = undefined;
                socket.emit("chat", JSON.stringify({ input: data.message, x_auth_token }));
                broadcast({ id: data.id, timestamp: data.timestamp, type: "usermessage", message: data.message });
                break;
        }
    };

    if (expiry) port.postMessage(expiry);
    else if (!socket) connect();
    else if (socket.connected && authenticated) port.postMessage({ type: "authenticated" });
}

self.onconnect = (event: MessageEvent) => {
    const [port] = event.ports;
    start(port);
};

// The dedicated-worker fallback uses the same message protocol.
if (!("SharedWorkerGlobalScope" in self)) start(self);

export {};
