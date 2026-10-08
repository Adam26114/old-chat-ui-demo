import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import SharedWorker from "@okikio/sharedworker";
import "navigator.locks";
import { KJUR } from "jsrsasign";
import { jwtDecode } from "jwt-decode";
import { v4 as uuidv4 } from "uuid";
import { appendHistory, newRecord, readHistory, type ChatRecord } from "../lib/chat-history";
import workerPath from "../worker.ts?sharedworker&url";

let workerURL = new URL(workerPath, import.meta.url).href;
if (!import.meta.env.MODE.includes("development")) {
    const js = `import ${JSON.stringify(new URL(workerPath, import.meta.url))}`;
    workerURL = `data:application/javascript;base64,${btoa(js)}`;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "expired";
const expiredMessage = "Session expired. Do you want to restart a new chat?\n\n[Yes, restart chat](#restart)";
const sessionErrors = ["Invalid token values", "JWT token not found", "server_restarted"];

type WorkerEvent = { type: string; message?: string; id?: string };

export function useChatWorker(props: ChatbotProp, widgetRef: RefObject<HTMLDivElement>) {
    const {
        app_key = "", customer_id = "", property_code = "", x_auth_token = "",
        booking_link = new URL("reservation", window.location.href).href,
        login_link = new URL("login", window.location.href).href,
        payment_link = new URL("reservation/payment", window.location.href).href,
        chatbox_title = "",
    } = props;
    const [messages, setMessages] = useState<ChatRecord[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [status, setStatus] = useState<ConnectionStatus>("connecting");
    const workerRef = useRef<SharedWorker | null>(null);
    const pendingRef = useRef(false);
    const restartRef = useRef<() => Promise<void>>(async () => {});
    const clientID = useRef("");

    useEffect(() => {
        if (!app_key || !customer_id) throw new Error("Unknown client.");
        let active = true;
        let bookingToken = x_auth_token;
        const workerConfig = { app_key, customer_id, property_code, booking_link, login_link, payment_link };
        const generateAuthToken = () => {
            const now = Date.now() / 1000;
            return KJUR.jws.JWS.sign("HS256", JSON.stringify({ alg: "HS256", typ: "JWT" }), JSON.stringify({
                nbf: now, iat: now, exp: now + 3600,
                data: { ...workerConfig, x_auth_token: bookingToken },
            }), import.meta.env.VITE_CHAT_SERVER_KEY);
        };
        const clearSession = () => {
            localStorage.removeItem("chat_history");
            localStorage.removeItem("chat_auth_token");
            setMessages([]);
            pendingRef.current = false;
            setIsRunning(false);
        };
        let authToken = localStorage.getItem("chat_auth_token");
        if (authToken) {
            try {
                const decoded = jwtDecode<IJwtPayload>(authToken);
                const tokenData = { ...workerConfig, x_auth_token: bookingToken };
                if (Date.now() / 1000 >= (decoded.exp || 0) || Object.entries(tokenData).some(([key, value]) => decoded.data?.[key] !== value)) {
                    clearSession();
                    authToken = null;
                }
            } catch {
                clearSession();
                authToken = null;
            }
        }
        if (!authToken) {
            authToken = generateAuthToken();
            localStorage.setItem("chat_auth_token", authToken);
        }
        setMessages(readHistory());
        setStatus("connecting");
        clientID.current = sessionStorage.getItem("chat_tab_id") || uuidv4();
        sessionStorage.setItem("chat_tab_id", clientID.current);

        // One worker per effect, never per render. The wrapper handles dedicated-worker fallback.
        const connection = new SharedWorker(workerURL, { type: "module", name: authToken });
        workerRef.current = connection;
        const stopWaiting = () => {
            pendingRef.current = false;
            setIsRunning(false);
        };
        const receive = (type: ChatRecord["type"], text: string, id?: string) => {
            const record = newRecord(type, text, id);
            setMessages((previous) => previous.some((item) => item.id === record.id) ? previous : [...previous, record]);
            void appendHistory(record).catch(console.error);
        };
        const restart = async () => {
            await navigator.locks.request("restart_session", { ifAvailable: true }, (lock) => {
                if (!lock || !active) return;
                clearSession();
                authToken = generateAuthToken();
                localStorage.setItem("chat_auth_token", authToken);
                setStatus("connecting");
                connection.postMessage({ uuid: clientID.current, type: "restart", message: authToken });
            });
        };
        restartRef.current = restart;
        const expire = (id?: string) => {
            setStatus("expired");
            stopWaiting();
            receive("expired", expiredMessage, id);
        };
        connection.onmessage = ({ data }: MessageEvent<WorkerEvent>) => {
            if (!active) return;
            switch (data.type) {
                case "response":
                    receive("response", chatbox_title ? (data.message || "").replaceAll("group_name", chatbox_title) : data.message || "", data.id);
                    stopWaiting();
                    break;
                case "usermessage":
                    receive("usermessage", data.message || "", data.id);
                    pendingRef.current = true;
                    setIsRunning(true);
                    break;
                case "error":
                    stopWaiting();
                    if (sessionErrors.includes(data.message || "")) {
                        clearSession();
                        setMessages([newRecord("error", "Session timeout, page will refresh now.")]);
                        void navigator.locks.request("restart_chat", { ifAvailable: true }, (lock) => {
                            if (lock && active) window.location.reload();
                        });
                    } else {
                        receive("error", data.message || "Something went wrong. Please try again.", data.id);
                    }
                    break;
                case "expired":
                    expire(data.id);
                    break;
                case "connected":
                case "authenticated":
                    setStatus("connected");
                    break;
                case "disconnected":
                    // An expired session must keep its restart affordance after disconnect.
                    setStatus((current) => current === "expired" ? current : "disconnected");
                    stopWaiting();
                    break;
                case "restarted":
                    setMessages([]);
                    stopWaiting();
                    setStatus("connecting");
                    break;
                case "logout":
                    clearSession();
                    break;
                case "trigger":
                    widgetRef.current?.dispatchEvent(new CustomEvent(`qikres/chatbot/${data.message}`, { bubbles: true }));
                    break;
            }
        };
        connection.start();
        const login = () => connection.postMessage({ type: "login" });
        const logout = () => {
            clearSession();
            connection.postMessage({ type: "logout" });
        };
        const auth = (event: Event) => {
            bookingToken = (event as CustomEvent<{ auth_token?: string }>).detail?.auth_token || "";
            // Refresh the worker JWT as well so login/chat use the new booking token.
            void restart();
        };
        const hostExpired = () => expire();
        const listeners: [string, EventListener][] = import.meta.env.MODE.includes("myroompass")
            ? [["myroompass/login", login], ["myroompass/logout", logout]]
            : import.meta.env.MODE.includes("wbe2")
                ? [["qikres/auth", auth], ["qikres/login", login], ["qikres/logout", logout], ["qikres/sessionExpired", hostExpired]]
                : [];
        listeners.forEach(([name, listener]) => document.addEventListener(name, listener));
        const onStorage = (event: StorageEvent) => {
            if (event.key === "chat_history" && event.newValue === null) {
                setMessages([]);
                stopWaiting();
            }
        };
        window.addEventListener("storage", onStorage);
        return () => {
            active = false;
            listeners.forEach(([name, listener]) => document.removeEventListener(name, listener));
            window.removeEventListener("storage", onStorage);
            connection.onmessage = null;
            connection.postMessage({ type: "detach" });
            connection.close();
            workerRef.current = null;
            pendingRef.current = false;
        };
    }, [app_key, customer_id, property_code, x_auth_token, booking_link, login_link, payment_link, chatbox_title, widgetRef]);

    const send = useCallback(async (text: string) => {
        if (!text.trim() || !workerRef.current || pendingRef.current || status === "expired") return;
        const record = newRecord("usermessage", text.trim());
        pendingRef.current = true;
        setIsRunning(true);
        setMessages((previous) => [...previous, record]);
        await appendHistory(record).catch(console.error);
        workerRef.current?.postMessage({ uuid: clientID.current, type: "usermessage", message: record.message, id: record.id });
    }, [status]);
    const restart = useCallback(() => restartRef.current(), []);
    return { messages, isRunning, status, send, restart };
}
