import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import SharedWorker from "@okikio/sharedworker";
import "navigator.locks";
import { KJUR } from "jsrsasign";
import { jwtDecode } from "jwt-decode";
import { v4 as uuidv4 } from "uuid";
import { appendHistory, newRecord, readHistory, type ChatRecord } from "../lib/chat-history";
import { MessageNotSentError } from "@assistant-ui/react";
import { verifyUserMessage } from "../lib/recaptcha";
import workerPath from "../worker.ts?sharedworker&url";

let workerURL = new URL(workerPath, import.meta.url).href;
if (!import.meta.env.MODE.includes("development")) {
    const js = `import ${JSON.stringify(new URL(workerPath, import.meta.url))}`;
    workerURL = `data:application/javascript;base64,${btoa(js)}`;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "expired";
const expiredMessage = "Session expired. Do you want to restart a new chat?\n\n[Yes, restart chat](#restart)";
const sessionErrors = ["Invalid token values", "JWT token not found", "server_restarted"];

type WorkerEvent = { type: string; message?: string; id?: string; timestamp?: number };

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
    const connectionStatus = useRef<ConnectionStatus>("connecting");
    const verification = useRef<AbortController | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const siteKey = (props.recaptcha_site_key ?? import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? "").trim();
    const endpoint = (props.recaptcha_endpoint ?? import.meta.env.VITE_RECAPTCHA_ENDPOINT ?? "").trim();
    const cancelVerification = useCallback((reason: string) => {
        const controller = verification.current;
        controller?.abort(reason);
        verification.current = null;
        if (controller && reason !== "unmount") setIsVerifying(false);
    }, []);

    useEffect(() => {
        if (!app_key || !customer_id) throw new Error("Unknown client.");
        let active = true;
        const workerConfig = { app_key, customer_id, property_code, booking_link, login_link, payment_link };
        const generateAuthToken = () => {
            const now = Date.now() / 1000;
            return KJUR.jws.JWS.sign("HS256", JSON.stringify({ alg: "HS256", typ: "JWT" }), JSON.stringify({
                nbf: now, iat: now, exp: now + 3600,
                data: { ...workerConfig, x_auth_token },
            }), import.meta.env.VITE_CHAT_SERVER_KEY);
        };
        const clearSession = () => {
            cancelVerification("restart");
            setVerificationError(null);
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
                const tokenData = { ...workerConfig, x_auth_token };
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
        connectionStatus.current = "connecting";
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
        const receive = (type: ChatRecord["type"], text: string, id?: string, timestamp?: number) => {
            const record = newRecord(type, text, id, timestamp);
            setMessages((previous) => previous.some((item) => item.id === record.id) ? previous : [...previous, record]);
            void appendHistory(record).catch(console.error);
        };
        const restart = async () => {
            cancelVerification("restart");
            await navigator.locks.request("restart_session", { ifAvailable: true }, (lock) => {
                if (!lock || !active) return;
                clearSession();
                authToken = generateAuthToken();
                localStorage.setItem("chat_auth_token", authToken);
                connectionStatus.current = "connecting";
                setStatus("connecting");
                connection.postMessage({ uuid: clientID.current, type: "restart", message: authToken });
            });
        };
        restartRef.current = restart;
        const expire = (id?: string, timestamp?: number) => {
            cancelVerification("restart");
            connectionStatus.current = "expired";
            setStatus("expired");
            stopWaiting();
            receive("expired", expiredMessage, id, timestamp);
        };
        connection.onmessage = ({ data }: MessageEvent<WorkerEvent>) => {
            if (!active) return;
            switch (data.type) {
                case "response":
                    receive("response", chatbox_title ? (data.message || "").replaceAll("group_name", chatbox_title) : data.message || "", data.id, data.timestamp);
                    stopWaiting();
                    break;
                case "usermessage":
                    receive("usermessage", data.message || "", data.id, data.timestamp);
                    pendingRef.current = true;
                    setIsRunning(true);
                    break;
                case "error":
                case "severe":
                    stopWaiting();
                    if (sessionErrors.includes(data.message || "")) {
                        clearSession();
                        setMessages([newRecord("response", "Session timeout, page will refresh now.")]);
                        void navigator.locks.request("restart_chat", { ifAvailable: true }, (lock) => {
                            if (lock && active) window.location.reload();
                        });
                    } else {
                        receive(data.type, data.message || "Something went wrong. Please try again.", data.id, data.timestamp);
                    }
                    break;
                case "expired":
                    expire(data.id, data.timestamp);
                    break;
                case "connected":
                case "authenticated":
                    connectionStatus.current = "connected";
                    setStatus("connected");
                    break;
                case "disconnected":
                    // An expired session must keep its restart affordance after disconnect.
                    cancelVerification("disconnect");
                    connectionStatus.current = connectionStatus.current === "expired" ? "expired" : "disconnected";
                    setStatus(connectionStatus.current);
                    stopWaiting();
                    break;
                case "restarted":
                    cancelVerification("restart");
                    setVerificationError(null);
                    setMessages([]);
                    stopWaiting();
                    connectionStatus.current = "connecting";
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
        const onStorage = (event: StorageEvent) => {
            if (event.key === "chat_history" && event.newValue === null) {
                cancelVerification("restart");
                setMessages([]);
                stopWaiting();
            }
        };
        window.addEventListener("storage", onStorage);
        return () => {
            active = false;
            cancelVerification("unmount");
            connectionStatus.current = "disconnected";
            window.removeEventListener("storage", onStorage);
            connection.onmessage = null;
            connection.postMessage({ type: "detach" });
            connection.close();
            workerRef.current = null;
            pendingRef.current = false;
        };
    }, [app_key, customer_id, property_code, x_auth_token, booking_link, login_link, payment_link, chatbox_title, widgetRef, cancelVerification]);

    useEffect(() => () => cancelVerification("configuration"), [siteKey, endpoint, cancelVerification]);

    const send = useCallback(async (text: string) => {
        const worker = workerRef.current;
        if (!text.trim() || !worker || pendingRef.current || verification.current || connectionStatus.current !== "connected") {
            throw new MessageNotSentError();
        }
        const controller = new AbortController();
        verification.current = controller;
        setIsVerifying(true);
        setVerificationError(null);
        const timeout = setTimeout(() => controller.abort("timeout"), 10000);
        try {
            await verifyUserMessage(siteKey, endpoint, controller.signal);
            controller.signal.throwIfAborted();
            if (workerRef.current !== worker || connectionStatus.current !== "connected" || pendingRef.current) {
                throw new MessageNotSentError();
            }
            const record = newRecord("usermessage", text.trim());
            worker.postMessage({ uuid: clientID.current, type: "usermessage", message: record.message, id: record.id, timestamp: record.timestamp });
            pendingRef.current = true;
            setIsRunning(true);
            setMessages((previous) => [...previous, record]);
            void appendHistory(record).catch(console.error);
        } catch {
            if (["restart", "unmount", "configuration"].includes(controller.signal.reason)) return;
            const message = "We couldn’t verify your message. Please try again.";
            setVerificationError(message);
            throw new MessageNotSentError(message);
        } finally {
            clearTimeout(timeout);
            if (verification.current === controller) {
                verification.current = null;
                setIsVerifying(false);
            }
        }
    }, [siteKey, endpoint]);
    const restart = useCallback(() => restartRef.current(), []);
    return { messages, isRunning, isVerifying, verificationError, status, send, restart };
}
