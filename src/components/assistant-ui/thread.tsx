import { ComposerPrimitive, MessagePrimitive, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { ArrowDown, ArrowRight, ArrowUp, BellRing, Check, Copy } from "lucide-react";
import { ActionBarPrimitive } from "@assistant-ui/react";
import { Button } from "../ui/button";
import remarkGfm from "remark-gfm";

const MarkdownText = () => <MarkdownTextPrimitive className="chat-markdown" remarkPlugins={[remarkGfm]} smooth={false} />;

const starterQuestions = [
    { label: "Rooms & reservations", prompt: "Can you help me book a room?" },
    { label: "Check-in & check-out", prompt: "What are the check-in and check-out times?" },
    { label: "Hotel amenities", prompt: "What amenities are available at the hotel?" },
];

function StarterQuestions() {
    const visible = useAuiState((state) => !state.thread.messages.some((message) => message.role === "user") && state.composer.text.trim() === "" && !state.thread.isDisabled);
    if (!visible) return null;
    return (
        <div className="chat-suggestions" aria-label="Starter questions">
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

const AssistantMessage = () => (
    <MessagePrimitive.Root className="chat-message chat-message-assistant" data-message-role="assistant">
        <div className="chat-message-avatar" aria-hidden="true"><BellRing /></div>
        <div className="chat-message-body">
            <div className="chat-bubble chat-bubble-assistant">
                <MessagePrimitive.Content components={{ Text: MarkdownText }} />
            </div>
            <ActionBarPrimitive.Root className="chat-message-actions">
                <ActionBarPrimitive.Copy asChild>
                    <Button variant="ghost" size="icon" className="chat-copy" aria-label="Copy message" title="Copy message">
                        <MessagePrimitive.If copied><Check aria-hidden="true" /></MessagePrimitive.If>
                        <MessagePrimitive.If copied={false}><Copy aria-hidden="true" /></MessagePrimitive.If>
                    </Button>
                </ActionBarPrimitive.Copy>
            </ActionBarPrimitive.Root>
        </div>
    </MessagePrimitive.Root>
);

export function Thread({ isRunning, expired }: { isRunning: boolean; expired: boolean }) {
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
                    {isRunning ? (
                        <div role="status" className="chat-waiting">
                            <div className="chat-typing" aria-hidden="true"><span /><span /><span /></div>
                            <span>Thinking…</span>
                        </div>
                    ) : null}
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
                <p className="chat-composer-hint">Enter to send · Shift + Enter for a new line</p>
            </div>
        </ThreadPrimitive.Root>
    );
}
