import React, { useEffect, useId, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { AssistantRuntimeProvider, useExternalStoreRuntime, type AppendMessage, type ThreadMessageLike } from "@assistant-ui/react";
import { Bot, MessageCircle, RotateCcw, X } from "lucide-react";
import { Thread } from "./assistant-ui/thread";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { useChatWorker } from "../hooks/use-chat-worker";
import { type ChatRecord } from "../lib/chat-history";
import "../custom.css";

const convertMessage = (message: ChatRecord): ThreadMessageLike => ({
    id: message.id,
    role: message.type === "usermessage" ? "user" : "assistant",
    content: [{ type: "text", text: message.message }],
});

/** Same component props and React/ReactDOM exports as the original embeddable widget. */
function ChatBot(props: ChatbotProp | null | undefined) {
    const widgetRef = useRef<HTMLDivElement>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const panelID = useId();
    const titleID = useId();
    const { messages, isRunning, status, send, restart } = useChatWorker(props || {}, widgetRef);
    const runtime = useExternalStoreRuntime({
        messages,
        isRunning,
        isDisabled: status === "expired",
        isSendDisabled: status !== "connected",
        convertMessage,
        onNew: async (message: AppendMessage) => {
            const text = message.content.map((part) => part.type === "text" ? part.text : "").join("");
            await send(text);
        },
    });
    const title = props?.chatbox_title || "Guest assistant";
    const statusText = status === "connected" ? "We'll be happy to help" : status === "expired" ? "Session expired · restart to continue" : status === "disconnected" ? "Reconnecting…" : "Connecting…";

    useEffect(() => {
        if (open) widgetRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    }, [open]);
    const close = () => {
        setOpen(false);
        launcherRef.current?.focus();
    };

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            <div
                ref={widgetRef}
                className="ubiq-chat"
                onKeyDown={(event) => { if (event.key === "Escape" && open) { event.preventDefault(); close(); } }}
                onClick={(event) => {
                    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href='#restart']");
                    if (link) { event.preventDefault(); void restart(); }
                }}
            >
                <section id={panelID} hidden={!open} aria-labelledby={titleID} className="chat-panel">
                    <header className="flex items-center gap-3 border-b border-border bg-background px-5 py-4">
                        <Avatar className="size-10 border border-border bg-background">
                            <AvatarImage src={props?.avatar} alt="" />
                            <AvatarFallback className="bg-accent text-primary"><Bot className="size-5" /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <h2 id={titleID} className="truncate text-sm font-semibold tracking-tight">{title}</h2>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
                                <span className={`size-1.5 shrink-0 rounded-full ${status === "connected" ? "bg-emerald-500" : "bg-muted-foreground"}`} aria-hidden="true" />
                                {statusText}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => { void restart(); }} aria-label="Restart chat" title="Restart chat"><RotateCcw /></Button>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={close} aria-label="Close chat" title="Close chat"><X /></Button>
                    </header>
                    <Thread isRunning={isRunning} expired={status === "expired"} />
                </section>
                <Button ref={launcherRef} className="chat-launcher" size="icon" onClick={() => setOpen((previous) => !previous)} aria-label={open ? "Hide chat" : "Open chat"} aria-expanded={open} aria-controls={panelID}>
                    {open ? <X /> : <MessageCircle />}
                </Button>
            </div>
        </AssistantRuntimeProvider>
    );
}

export default ChatBot;
export { React, ReactDOM };
