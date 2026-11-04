import { ComposerPrimitive, MessagePrimitive, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { ArrowDown, ArrowRight, ArrowUp, BellRing } from "lucide-react";
import { Button } from "../ui/button";
import remarkGfm from "remark-gfm";
import { useContext, useRef } from "react";
import { ChatMotionContext, enterChatElement, gsap, useGSAP } from "../../lib/chat-motion";

const MarkdownText = () => <MarkdownTextPrimitive className="chat-markdown" remarkPlugins={[remarkGfm]} smooth={false} />;

const starterQuestions = [
    { label: "Rooms & reservations", prompt: "Can you help me book a room?" },
    { label: "Check-in & check-out", prompt: "What are the check-in and check-out times?" },
    { label: "Hotel amenities", prompt: "What amenities are available at the hotel?" },
];

function StarterQuestions() {
    const visible = useAuiState((state) => !state.thread.messages.some((message) => message.role === "user") && state.composer.text.trim() === "" && !state.thread.isDisabled);
    const ref = useRef<HTMLDivElement>(null);
    const considered = useRef(false);
    const motion = useContext(ChatMotionContext);
    useGSAP(() => {
        if (!motion?.open || considered.current) return;
        considered.current = true;
        if (!motion.intro || !motion.pageVisible || !ref.current) return;
        return enterChatElement(motion, ref.current.querySelectorAll("button"), 4, 0.16, 0.04);
    }, { scope: ref, dependencies: [motion?.open] });
    if (!visible) return null;
    return (
        <div ref={ref} className="chat-suggestions" aria-label="Starter questions">
            <p className="chat-suggestions-label">A few ways we can help</p>
            {starterQuestions.map(({ label, prompt }) => (
                <ThreadPrimitive.Suggestion
                    key={label}
                    prompt={prompt}
                    send={false}
                    clearComposer
                    asChild
                    onClick={(event) => event.currentTarget.closest(".chat-panel")?.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true })}
                >
                    <Button variant="outline" className="chat-suggestion">{label}<ArrowRight aria-hidden="true" /></Button>
                </ThreadPrimitive.Suggestion>
            ))}
        </div>
    );
}

const UserMessage = () => (
    <MessagePrimitive.Root className="chat-message chat-message-user" data-message-role="user">
        <div className="chat-bubble chat-bubble-user">
            <MessagePrimitive.Content />
        </div>
    </MessagePrimitive.Root>
);

function AssistantMessage() {
    const hasText = useAuiState((state) => state.message.content.some((part) => part.type === "text" && part.text.trim().length > 0));
    return hasText ? <AssistantReply /> : null;
}

function MessageTimestamp() {
    const timestamp = useAuiState((state) => state.message.metadata.custom?.timestamp);
    if (typeof timestamp !== "number" || !Number.isFinite(new Date(timestamp).getTime())) return null;
    const date = new Date(timestamp);
    const fullDate = date.toLocaleString();
    return <time className="chat-message-time" dateTime={date.toISOString()} title={fullDate} aria-label={fullDate}>{date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>;
}

function AssistantReply() {
    const ref = useRef<HTMLDivElement>(null);
    const id = useAuiState((state) => state.message.id);
    const motion = useContext(ChatMotionContext);
    // Eligibility belongs to this message's arrival, not later visibility changes.
    const arrival = useRef({ id, animate: Boolean(motion?.open && motion.pageVisible && !motion.seenReplies.has(id)) });
    if (arrival.current.id !== id) arrival.current = { id, animate: Boolean(motion?.open && motion.pageVisible && !motion.seenReplies.has(id)) };
    useGSAP(() => {
        motion?.seenReplies.add(id);
        if (!motion || !ref.current || !arrival.current.animate) return;
        return enterChatElement(motion, ref.current, 6, 0.18);
    }, { scope: ref, dependencies: [id], revertOnUpdate: true });
    return (
    <MessagePrimitive.Root ref={ref} className="chat-message chat-message-assistant" data-message-role="assistant">
        <div className="chat-message-avatar" aria-hidden="true"><BellRing /></div>
        <div className="chat-message-body">
            <div className="chat-bubble chat-bubble-assistant">
                <MessagePrimitive.Content components={{ Text: MarkdownText }} />
            </div>
            <MessageTimestamp />
        </div>
    </MessagePrimitive.Root>
    );
}

function TypingIndicator() {
    const ref = useRef<HTMLDivElement>(null);
    const motion = useContext(ChatMotionContext);
    useGSAP(() => {
        if (!motion?.open || !motion.pageVisible || motion.reduced || !ref.current) return;
        const dots = ref.current.children;
        gsap.set(dots, { opacity: 0.35 });
        gsap.timeline({ repeat: -1 })
            .to(dots, { opacity: 1, duration: 0.3, stagger: 0.15, ease: "sine.inOut" })
            .to(dots, { opacity: 0.35, duration: 0.3, stagger: 0.15, ease: "sine.inOut" });
    }, { scope: ref, dependencies: [motion?.open, motion?.pageVisible, motion?.reduced], revertOnUpdate: true });
    return <div role="status" className="chat-waiting"><div ref={ref} className="chat-typing" aria-hidden="true"><span /><span /><span /></div><span>Preparing your reply…</span></div>;
}

export function Thread({ isRunning, expired, verificationError }: { isRunning: boolean; expired: boolean; verificationError: string | null }) {
    return (
        <ThreadPrimitive.Root className="chat-thread">
            <div className="chat-scroll-container">
                <ThreadPrimitive.Viewport className="chat-viewport" autoScroll>
                    <ThreadPrimitive.Empty>
                        <div className="chat-welcome">
                            <div className="chat-welcome-icon" aria-hidden="true"><BellRing /></div>
                            <h3>Make yourself at home.</h3>
                            <p>From finding a room to planning your stay, we're here to help.</p>
                        </div>
                    </ThreadPrimitive.Empty>
                    <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
                    <StarterQuestions />
                    {isRunning ? <TypingIndicator /> : null}
                </ThreadPrimitive.Viewport>
                <ThreadPrimitive.ScrollToBottom asChild onClick={(event) => event.currentTarget.closest<HTMLElement>(".chat-panel")?.focus({ preventScroll: true })}>
                    <Button variant="outline" size="icon" className="chat-scroll-latest disabled:invisible" aria-label="Scroll to latest message"><ArrowDown aria-hidden="true" /></Button>
                </ThreadPrimitive.ScrollToBottom>
            </div>
            <div className="chat-composer-footer">
                <ComposerPrimitive.Root className="chat-composer">
                    <ComposerPrimitive.Input
                        className="chat-input"
                        placeholder={expired ? "Restart chat to continue" : "How can we help with your stay?"}
                        aria-label="Message"
                        rows={1}
                        addAttachmentOnPaste={false}
                    />
                    <ComposerPrimitive.Send asChild>
                        <Button size="icon" className="chat-send" aria-label="Send message" title="Send message"><ArrowUp aria-hidden="true" /></Button>
                    </ComposerPrimitive.Send>
                </ComposerPrimitive.Root>
                {verificationError ? <p className="chat-verification-error" role="alert">{verificationError}</p> : null}
                <p className="chat-composer-hint">Enter to send · Shift + Enter for a new line</p>
            </div>
        </ThreadPrimitive.Root>
    );
}
