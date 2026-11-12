import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { AssistantRuntimeProvider, useExternalStoreRuntime, type AppendMessage, type ThreadMessageLike } from "@assistant-ui/react";
import { Thread } from "./assistant-ui/thread";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Kbd, KbdGroup } from "./ui/kbd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { ArrowUpRight } from "./icons/arrow-up-right";
import { BotCircle } from "./icons/bot-circle";
import { BotSquare } from "./icons/bot-square";
import { BotSquare as BotSquareFill } from "./icons/fill/bot-square";
import { RotateCcw } from "./icons/rotate-ccw";
import { X } from "./icons/x";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "./ui/alert-dialog";
import { useChatWorker } from "../hooks/use-chat-worker";
import { formatChatError } from "../lib/chat-errors";
import { type ChatRecord } from "../lib/chat-history";
import { useChatMotion } from "../hooks/use-chat-motion";
import { ChatMotionContext } from "../lib/chat-motion";
import "../custom.css";

type ThreadRecord = ChatRecord & { isOptimistic?: true };
const chatKeyShortcuts = "Meta+K Control+K";

const convertMessage = (message: ThreadRecord): ThreadMessageLike => ({
    id: message.id,
    role: message.type === "usermessage" ? "user" : "assistant",
    content: [{ type: "text", text: message.type === "error" || message.type === "severe" ? formatChatError(message.message) : message.message }],
    createdAt: message.timestamp === undefined ? undefined : new Date(message.timestamp),
    metadata: { isOptimistic: message.isOptimistic, custom: { timestamp: message.timestamp } },
});

/** Same component props and React/ReactDOM exports as the original embeddable widget. */
function ChatBot(props: ChatbotProp | null | undefined) {
    const widgetRef = useRef<HTMLDivElement>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);
    const restartButtonRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const { open, present, motion, toggle, keyboard, press, release } = useChatMotion({ widget: widgetRef, panel: panelRef, launcher: launcherRef, closeControl: closeButtonRef });
    const [confirmRestart, setConfirmRestart] = useState(false);
    const panelID = useId();
    const titleID = useId();
    const { messages, isRunning, verifyingMessage, verificationError, status, send, restart } = useChatWorker(props || {}, widgetRef);
    const isVerifying = verifyingMessage !== null;
    const threadMessages = useMemo<ThreadRecord[]>(() => verifyingMessage
        ? [...messages, { ...verifyingMessage, isOptimistic: true }]
        : messages, [messages, verifyingMessage]);
    const runtime = useExternalStoreRuntime({
        messages: threadMessages,
        isRunning,
        isDisabled: status === "expired",
        isSendDisabled: status !== "connected" || isVerifying,
        convertMessage,
        onNew: async (message: AppendMessage) => {
            const text = message.content.map((part) => part.type === "text" ? part.text : "").join("");
            await send(text);
        },
    });
    const title = props?.chatbox_title || "Guest assistant";
    const statusText = status === "connected" ? "Ready to help with your stay" : status === "expired" ? "Session expired · restart to continue" : status === "disconnected" ? "Reconnecting…" : "Connecting…";
    const shortcutModifier = /^(Mac|iPhone|iPad|iPod)/.test(navigator.platform) ? "⌘" : "Ctrl";
    const LauncherIcon = open ? BotSquareFill : BotSquare;
    const launcherLabel = open ? "Hide chat" : "Open chat";

    useEffect(() => {
        if (confirmRestart) return;
        const handleShortcut = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.repeat || event.isComposing || event.key.toLowerCase() !== "k"
                || event.metaKey === event.ctrlKey || event.altKey || event.shiftKey) return;
            const path = event.composedPath();
            const insideWidget = widgetRef.current !== null && path.includes(widgetRef.current);
            if (path.some((target) => target instanceof HTMLElement && (
                target.matches('dialog[open], [aria-modal="true"]')
                || (!insideWidget && (target.isContentEditable || target.matches('input, textarea, select, [role="textbox"]')))
            ))) return;
            event.preventDefault();
            toggle(undefined, false);
        };
        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, [confirmRestart, toggle]);

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
                data-present={present}
                tabIndex={-1}
                onKeyDownCapture={keyboard}
                onPointerDownCapture={(event) => press(event.target)}
                onPointerLeave={release}
                onKeyDown={(event) => {
                    if (event.key === "Escape" && (open || present) && !confirmRestart && !event.defaultPrevented && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        toggle(false, false);
                    }
                }}
                onClick={(event) => {
                    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href='#restart']");
                    if (link) { event.preventDefault(); requestRestart(); }
                }}
            >
                <section ref={panelRef} id={panelID} hidden={!present} aria-hidden={!open} aria-labelledby={titleID} tabIndex={-1} className="chat-panel">
                    <header className="chat-header">
                        <Avatar className="chat-header-avatar">
                            <AvatarImage src={props?.avatar} alt="" />
                            <AvatarFallback className="bg-accent text-primary"><BotCircle className="size-5" /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <h2 id={titleID} className="chat-title">{title}</h2>
                            <p className="chat-status" role="status">
                                <span className="chat-status-dot" data-connected={status === "connected"} aria-hidden="true" />
                                {statusText}
                            </p>
                        </div>
                        <Button ref={restartButtonRef} variant="ghost" size="icon" className="chat-icon-button" onClick={requestRestart} aria-label="Restart chat" title="Restart chat"><RotateCcw aria-hidden="true" /></Button>
                        <Button ref={closeButtonRef} variant="ghost" size="icon" className="chat-icon-button" onClick={(event) => toggle(false, event.detail > 0)} aria-label="Close chat" aria-keyshortcuts={chatKeyShortcuts} title="Close chat"><X aria-hidden="true" /></Button>
                    </header>
                    {props?.booking_link ? (
                        <div className="chat-guest-actions">
                            <Button asChild variant="outline" className="chat-booking">
                                <a href={props.booking_link} target="_blank" rel="noopener noreferrer" title="Book a room (opens in a new tab)">Book a room<ArrowUpRight aria-hidden="true" /></a>
                            </Button>
                        </div>
                    ) : null}
                    <ChatMotionContext.Provider value={motion}>
                        <Thread isRunning={isRunning} isVerifying={isVerifying} expired={status === "expired"} verificationError={verificationError} />
                    </ChatMotionContext.Provider>
                </section>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                ref={launcherRef}
                                className="chat-launcher"
                                size="icon"
                                onClick={(event) => toggle(undefined, event.detail > 0)}
                                aria-label={launcherLabel}
                                aria-expanded={open}
                                aria-controls={panelID}
                                aria-keyshortcuts={chatKeyShortcuts}
                            >
                                <LauncherIcon aria-hidden="true" />
                            </Button>
                        </TooltipTrigger>
                        {(!present || open) && (
                            <TooltipContent className="chat-launcher-tooltip flex items-center gap-2" side="left" sideOffset={10}>
                                {launcherLabel}
                                <KbdGroup><Kbd>{shortcutModifier}</Kbd>+<Kbd>K</Kbd></KbdGroup>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
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
