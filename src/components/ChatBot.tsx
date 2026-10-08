import React, { useEffect, useId, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { AssistantRuntimeProvider, useExternalStoreRuntime, type AppendMessage, type ThreadMessageLike } from "@assistant-ui/react";
import { ArrowUpRight, BellRing, RotateCcw, X } from "lucide-react";
import { Thread } from "./assistant-ui/thread";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "./ui/alert-dialog";
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
    const restartButtonRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const restoreLauncherFocus = useRef(false);
    const [open, setOpen] = useState(false);
    const [confirmRestart, setConfirmRestart] = useState(false);
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
    const statusText = status === "connected" ? "Ready to help with your stay" : status === "expired" ? "Session expired · restart to continue" : status === "disconnected" ? "Reconnecting…" : "Connecting…";

    useEffect(() => {
        if (open) {
            const input = widgetRef.current?.querySelector<HTMLTextAreaElement>("textarea");
            const touchOrPhone = window.matchMedia("(max-width: 640px), (pointer: coarse)").matches;
            const target = touchOrPhone || input?.disabled ? closeButtonRef.current : input;
            target?.focus({ preventScroll: true });
        } else if (restoreLauncherFocus.current) {
            launcherRef.current?.focus({ preventScroll: true });
            restoreLauncherFocus.current = false;
        }
    }, [open]);
    useEffect(() => {
        const widget = widgetRef.current;
        if (!open || !widget) return;
        const viewport = window.visualViewport;
        if (!viewport) return;
        const updateViewport = () => {
            widget.style.setProperty("--chat-viewport-height", `${viewport.height}px`);
            widget.style.setProperty("--chat-viewport-top", `${viewport.offsetTop}px`);
        };
        updateViewport();
        viewport.addEventListener("resize", updateViewport);
        viewport.addEventListener("scroll", updateViewport);
        window.addEventListener("resize", updateViewport);
        return () => {
            viewport.removeEventListener("resize", updateViewport);
            viewport.removeEventListener("scroll", updateViewport);
            window.removeEventListener("resize", updateViewport);
            widget.style.removeProperty("--chat-viewport-height");
            widget.style.removeProperty("--chat-viewport-top");
        };
    }, [open]);
    const close = () => {
        restoreLauncherFocus.current = true;
        setOpen(false);
    };
    const startNewChat = () => {
        runtime.thread.composer.setText("");
        void restart();
    };
    const requestRestart = () => {
        if (messages.length) setConfirmRestart(true);
        else startNewChat();
    };

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            <div
                ref={widgetRef}
                className="ubiq-chat"
                data-open={open}
                onKeyDown={(event) => {
                    if (event.key === "Escape" && open && !confirmRestart && !event.defaultPrevented && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        close();
                    }
                }}
                onClick={(event) => {
                    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href='#restart']");
                    if (link) { event.preventDefault(); requestRestart(); }
                }}
            >
                <section id={panelID} hidden={!open} aria-labelledby={titleID} tabIndex={-1} className="chat-panel">
                    <header className="chat-header">
                        <Avatar className="chat-header-avatar">
                            <AvatarImage src={props?.avatar} alt="" />
                            <AvatarFallback className="bg-accent text-primary"><BellRing className="size-5" aria-hidden="true" /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <h2 id={titleID} className="chat-title">{title}</h2>
                            <p className="chat-status" role="status">
                                <span className="chat-status-dot" data-connected={status === "connected"} aria-hidden="true" />
                                {statusText}
                            </p>
                        </div>
                        <Button ref={restartButtonRef} variant="ghost" size="icon" className="chat-icon-button" onClick={requestRestart} aria-label="Restart chat" title="Restart chat"><RotateCcw aria-hidden="true" /></Button>
                        <Button ref={closeButtonRef} variant="ghost" size="icon" className="chat-icon-button" onClick={close} aria-label="Close chat" title="Close chat"><X aria-hidden="true" /></Button>
                    </header>
                    {props?.booking_link ? (
                        <div className="chat-guest-actions">
                            <Button asChild variant="outline" className="chat-booking">
                                <a href={props.booking_link} target="_blank" rel="noopener noreferrer" title="Book a room (opens in a new tab)">Book a room<ArrowUpRight aria-hidden="true" /></a>
                            </Button>
                        </div>
                    ) : null}
                    <Thread isRunning={isRunning} expired={status === "expired"} />
                </section>
                <Button ref={launcherRef} className="chat-launcher" size="icon" onClick={() => open ? close() : setOpen(true)} aria-label={open ? "Hide chat" : "Open chat"} aria-expanded={open} aria-controls={panelID}>
                    {open ? <X aria-hidden="true" /> : <BellRing aria-hidden="true" />}
                </Button>
                <AlertDialog open={confirmRestart} onOpenChange={setConfirmRestart}>
                    <AlertDialogContent container={widgetRef.current} onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        restartButtonRef.current?.focus({ preventScroll: true });
                    }}>
                        <AlertDialogTitle className="chat-dialog-title">Start a new chat?</AlertDialogTitle>
                        <AlertDialogDescription className="chat-dialog-description">This will clear your current conversation.</AlertDialogDescription>
                        <div className="chat-dialog-actions">
                            <AlertDialogCancel asChild><Button variant="outline">Keep chatting</Button></AlertDialogCancel>
                            <AlertDialogAction asChild><Button onClick={startNewChat}>Start new chat</Button></AlertDialogAction>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AssistantRuntimeProvider>
    );
}

export default ChatBot;
export { React, ReactDOM };
