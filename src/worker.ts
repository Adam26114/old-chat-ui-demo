import { io, Socket } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { v4 as uuidv4 } from "uuid";

const CHAT_SERVER = import.meta.env.VITE_CHAT_SERVER;

let authToken:string = self.name;
let disconnected:boolean = false;
let authenticated:boolean = false;

let authPool:ReturnType<typeof setInterval>;
let socket:Socket;
const ports:(MessagePort|Worker)[] = [];
let previousChatEvent: string | undefined;
const chatEvents = new Set(["response", "error", "severe", "expired"]);

function relayChat(type: string, message = "") {
    const key = JSON.stringify([type, message]);
    if (key === previousChatEvent) return;
    previousChatEvent = key;
    const event = { id: uuidv4(), timestamp: Date.now(), type, message };
    ports.forEach((port) => port.postMessage(event));
}

const extractXAuthToken = (token:string) => {
    const decoded = jwtDecode(token) as IJwtPayload;
    return decoded?.data?.["x_auth_token"] || "";
};

let x_auth_token:string = extractXAuthToken(authToken);

const authenticate = () => {
    previousChatEvent = undefined;
    authenticated = false;
    clearInterval(authPool);

    socket.emit("authenticate", authToken);

    /**
     * Doing polling because authenticated event is not returned from websocket
     * The only mean of determining the authentication is successful is from
     * waiting event "response", "success" from websocket, which will then set 'authenticated'
     * as true and subsequently clear the polling
     */
    authPool = setInterval(() => {
        if(!authenticated) {
            socket.emit("authenticate", authToken);
        } else {
            clearInterval(authPool);
        }
    }, 5000);
};

const initSocket = () => {
    const _socket = io(CHAT_SERVER);
    _socket.onAny((type: string) => {
        if (!chatEvents.has(type)) previousChatEvent = undefined;
    });

    _socket.on("connect", () => {
        previousChatEvent = undefined;
        /**
         * Once connected we will send auth
         * Except in event disconnected
         */
        if( !disconnected ) {
            authenticate();
        }

        disconnected = false;

        ports.forEach((_port) => {
            _port.postMessage({
                type: "connected"
            });
        });
    });

    _socket.on("success", () => {
        if(!authenticated) {
            authenticated = true;
            ports.forEach((_port) => {
                _port.postMessage({ type: "authenticated" });
            });
        }
    });

    _socket.on("response", (message) => {
        if(!authenticated) {
            authenticated = true;

            /**
             * Let all socket client knows response received successfully,
             * marking first authenticated status
             */
            ports.forEach((_port) => {
                _port.postMessage({
                    type: "authenticated",
                    message
                });
            });
        }

        relayChat("response", message);
    });

    _socket.on("error", (message: string) => relayChat("error", message));
    _socket.on("severe", (message: string) => relayChat("severe", message));

    _socket.on("disconnect", () => {
        disconnected = true;
        previousChatEvent = undefined;

        ports.forEach((_port) => {
            _port.postMessage({
                type: "disconnected"
            });
        });
    });

    _socket.on("expired", () => {
        relayChat("expired");

        _socket.disconnect();
    });

    _socket.on("logout", (message) => {
        ports.forEach((_port) => {
            _port.postMessage({
                type: "logout",
                message
            });
        });
    });

    _socket.on("trigger", (message) => {
        ports.forEach((_port) => {
            _port.postMessage({
                type: "trigger",
                message
            });
        });
    });

    return _socket;
}

const start = (port:(MessagePort|Worker)) => {
    ports.push(port);

    port.onmessage = ({ data }) => {

        switch(data.type) {
            case "detach": {
                const index = ports.indexOf(port);
                if (index >= 0) ports.splice(index, 1);
                break;
            }
            case "restart":
                authToken = data.message;
                x_auth_token = extractXAuthToken(authToken);

                if (!socket.connected) socket.connect();
                authenticate();

                ports.forEach((_port) => {
                    if(_port != port) {
                        _port.postMessage({
                            type: "restarted"
                        });
                    }
                });

                break;

            case "usermessage":
                previousChatEvent = undefined;
                socket.emit("chat", JSON.stringify({
                    input: data.message,
                    x_auth_token
                }));

                //broadcast to other workers so messages are sync
                ports.forEach((_port) => {
                    if(_port != port) {
                        _port.postMessage({
                            id: data.id,
                            timestamp: data.timestamp,
                            type: "usermessage",
                            message: data.message
                        });
                    }
                });

                break;
        }
    };

    if(!socket) {
        socket = initSocket();
    } else {
        port.postMessage({ type: socket.connected ? "connected" : "disconnected" });
        if (authenticated) port.postMessage({ type: "authenticated" });
    }
}

self.onconnect = (e:MessageEvent<string>) => {
    // Get the MessagePort from the event. This will be the
    // communication channel between SharedWorker and the Tab
    const [port] = e.ports;

    start(port);
};

// This is the fallback for WebWorkers, in case the browser doesn't support SharedWorkers natively
if (!("SharedWorkerGlobalScope" in self)) {
    start(self);
}

export {};
