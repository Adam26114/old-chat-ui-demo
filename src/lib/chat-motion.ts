import { createContext } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(CustomEase, useGSAP);
export { gsap, useGSAP };
export const chatEase = CustomEase.create("ubiq-chat-out", "0.23,1,0.32,1");
export const mobileChatQuery = "(max-width: 640px), (pointer: coarse) and (max-width: 1024px) and (max-height: 500px)";

export type ChatMotion = {
    open: boolean;
    intro: boolean;
    reduced: boolean;
    pageVisible: boolean;
    seenReplies: Set<string>;
    entries: Set<gsap.core.Animation>;
};

export const ChatMotionContext = createContext<ChatMotion | null>(null);

export function finishEntries(entries: Set<gsap.core.Animation>) {
    [...entries].forEach((tween) => tween.progress(1));
}

/** Track only active entrances; completed messages never replay on reopen. */
export function enterChatElement(motion: ChatMotion, target: gsap.TweenTarget, y: number, duration: number, stagger = 0) {
    const tween = gsap.fromTo(target, { opacity: 0, y: motion.reduced ? 0 : y }, {
        opacity: 1, y: 0, duration: motion.reduced ? 0.1 : duration,
        stagger: motion.reduced ? 0 : stagger, ease: chatEase,
        clearProps: "opacity,transform",
        onComplete: () => { motion.entries.delete(tween); },
    });
    motion.entries.add(tween);
    return () => { motion.entries.delete(tween); };
}
