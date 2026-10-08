import { ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { ArrowDown, ArrowUp, Bot, Check, Copy } from "lucide-react";
import { ActionBarPrimitive } from "@assistant-ui/react";
import { Button } from "../ui/button";
import remarkGfm from "remark-gfm";

const MarkdownText = () => <MarkdownTextPrimitive className="chat-markdown" remarkPlugins={[remarkGfm]} smooth={false} />;

const UserMessage = () => (
    <MessagePrimitive.Root className="mb-5 flex justify-end" data-message-role="user">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
            <MessagePrimitive.Content />
        </div>
    </MessagePrimitive.Root>
);

const AssistantMessage = () => (
    <MessagePrimitive.Root className="group mb-5 flex gap-2.5" data-message-role="assistant">
        <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-primary" aria-hidden="true"><Bot className="size-4" /></div>
        <div className="min-w-0 max-w-[85%] flex-1">
            <div className="rounded-2xl rounded-tl-sm border border-border bg-background px-4 py-3 text-sm leading-relaxed">
                <MessagePrimitive.Content components={{ Text: MarkdownText }} />
            </div>
            <ActionBarPrimitive.Root className="mt-1 flex">
                <ActionBarPrimitive.Copy asChild>
                    <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label="Copy message" title="Copy message">
                        <MessagePrimitive.If copied><Check /></MessagePrimitive.If>
                        <MessagePrimitive.If copied={false}><Copy /></MessagePrimitive.If>
                    </Button>
                </ActionBarPrimitive.Copy>
            </ActionBarPrimitive.Root>
        </div>
    </MessagePrimitive.Root>
);

export function Thread({ isRunning, expired }: { isRunning: boolean; expired: boolean }) {
    return (
        <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
            <div className="relative flex min-h-0 flex-1 flex-col">
                <ThreadPrimitive.Viewport className="chat-viewport min-h-0 flex-1 overflow-y-auto px-5 py-6" autoScroll>
                    <ThreadPrimitive.Empty>
                        <div className="flex min-h-56 flex-col items-center justify-center text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent text-primary"><Bot className="size-7" /></div>
                            <h3 className="text-lg font-semibold tracking-tight">How can we help?</h3>
                            <p className="mt-2 max-w-60 text-sm leading-relaxed text-muted-foreground">Ask about rooms, reservations, or anything you need for your stay.</p>
                        </div>
                    </ThreadPrimitive.Empty>
                    <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
                    {isRunning ? (
                        <div role="status" className="flex items-center gap-3 px-1 text-sm text-muted-foreground">
                            <div className="chat-typing flex gap-1" aria-hidden="true"><span /><span /><span /></div>
                            <span>Thinking…</span>
                        </div>
                    ) : null}
                </ThreadPrimitive.Viewport>
                <ThreadPrimitive.ScrollToBottom asChild>
                    <Button variant="outline" size="icon" className="absolute bottom-3 left-1/2 size-8 -translate-x-1/2 rounded-full shadow-sm disabled:invisible" aria-label="Scroll to latest message"><ArrowDown /></Button>
                </ThreadPrimitive.ScrollToBottom>
            </div>
            <div className="border-t border-border bg-background px-4 pb-3 pt-4">
                <ComposerPrimitive.Root className="flex items-end gap-2 rounded-xl border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring/30">
                    <ComposerPrimitive.Input
                        className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                        placeholder={expired ? "Restart chat to continue" : "Type your message…"}
                        aria-label="Message"
                        rows={1}
                        autoFocus
                        addAttachmentOnPaste={false}
                    />
                    <ComposerPrimitive.Send asChild>
                        <Button size="icon" className="size-10 shrink-0 rounded-lg" aria-label="Send message" title="Send message"><ArrowUp /></Button>
                    </ComposerPrimitive.Send>
                </ComposerPrimitive.Root>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">Enter to send · Shift + Enter for a new line</p>
            </div>
        </ThreadPrimitive.Root>
    );
}
