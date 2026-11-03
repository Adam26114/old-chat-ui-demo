import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { chatEase, finishEntries, gsap, mobileChatQuery, useGSAP, type ChatMotion } from "../lib/chat-motion";

type Options = {
    widget: RefObject<HTMLDivElement>;
    panel: RefObject<HTMLElement>;
    launcher: RefObject<HTMLButtonElement>;
    closeControl: RefObject<HTMLButtonElement>;
};

export function useChatMotion({ widget, panel, launcher, closeControl }: Options) {
    const [open, setOpen] = useState(false);
    const [present, setPresent] = useState(false);
    const [intro, setIntro] = useState(false);
    const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const [pageVisible, setPageVisible] = useState(() => !document.hidden);
    const requested = useRef(false);
    const displayed = useRef(false);
    const firstOpen = useRef(true);
    const restoreFocus = useRef(false);
    const preferences = useRef({ mobile: window.matchMedia(mobileChatQuery).matches, reduced });
    const panelTween = useRef<gsap.core.Tween>();
    const pressed = useRef<HTMLElement>();
    const pressTweens = useRef(new Map<HTMLElement, gsap.core.Tween>());
    const entries = useRef(new Set<gsap.core.Tween>());
    const seenReplies = useRef(new Set<string>());
    const { contextSafe } = useGSAP({ scope: widget });

    const finishPanel = useCallback(() => { panelTween.current?.progress(1); }, []);
    const finishEntrances = useCallback(() => { finishEntries(entries.current); }, []);
    const resetPresses = contextSafe(() => {
        pressed.current = undefined;
        pressTweens.current.forEach((tween, button) => {
            tween.kill();
            gsap.set(button, { clearProps: "transform" });
        });
        pressTweens.current.clear();
    });
    const release = contextSafe(() => {
        const button = pressed.current;
        if (!button) return;
        pressed.current = undefined;
        pressTweens.current.get(button)?.kill();
        const tween = gsap.to(button, {
            scale: 1, duration: preferences.current.reduced ? 0 : 0.12,
            ease: chatEase, overwrite: "auto", clearProps: "transform",
            onComplete: () => { pressTweens.current.delete(button); },
        });
        pressTweens.current.set(button, tween);
    });
    const keyboard = contextSafe(() => {
        finishPanel();
        finishEntrances();
        resetPresses();
    });
    const press = contextSafe((target: EventTarget | null) => {
        const button = target instanceof Element ? target.closest<HTMLElement>("button, a.chat-booking") : null;
        if (!button || !widget.current?.contains(button) || button.matches(":disabled, [aria-disabled='true']") || preferences.current.reduced) return;
        release();
        pressed.current = button;
        pressTweens.current.get(button)?.kill();
        pressTweens.current.set(button, gsap.to(button, { scale: 0.97, duration: 0.1, ease: chatEase, overwrite: "auto" }));
    });
    const toggle = contextSafe((desired: boolean | undefined, pointer: boolean) => {
        const next = desired ?? !requested.current;
        const element = panel.current;
        if (!element) return;
        if (!next && element.contains(document.activeElement)) widget.current?.focus({ preventScroll: true });
        const wasDisplayed = displayed.current;
        requested.current = next;
        setOpen(next);
        panelTween.current?.kill();
        finishEntrances();
        if (next) {
            restoreFocus.current = false;
            displayed.current = true;
            setPresent(true);
            setIntro(firstOpen.current && pointer);
            firstOpen.current = false;
            element.hidden = false;
            element.removeAttribute("aria-hidden");
            element.inert = false;
            const input = element.querySelector<HTMLTextAreaElement>("textarea");
            const touchOrPhone = window.matchMedia("(max-width: 640px), (pointer: coarse)").matches;
            (touchOrPhone || input?.disabled ? closeControl.current : input)?.focus({ preventScroll: true });
        } else {
            element.inert = true;
            element.setAttribute("aria-hidden", "true");
        }
        const { mobile, reduced: reduce } = preferences.current;
        const moving = !mobile && !reduce;
        if (next && !wasDisplayed) gsap.set(element, { opacity: 0, scale: moving ? 0.97 : 1, y: moving ? 12 : 0 });
        const complete = () => {
            if (requested.current !== next) return;
            if (next) {
                gsap.set(element, { clearProps: "opacity,transform" });
            } else {
                element.hidden = true;
                displayed.current = false;
                restoreFocus.current = true;
                setPresent(false);
            }
        };
        const duration = !pointer || document.hidden ? 0 : reduce ? 0.1 : mobile ? (next ? 0.18 : 0.12) : (next ? 0.24 : 0.16);
        panelTween.current = gsap.to(element, {
            opacity: next ? 1 : 0, scale: next || !moving ? 1 : 0.97, y: next || !moving ? 0 : 12,
            duration, ease: chatEase, overwrite: "auto", onComplete: complete,
        });
    });

    useLayoutEffect(() => {
        if (!present && restoreFocus.current) {
            restoreFocus.current = false;
            launcher.current?.focus({ preventScroll: true });
        }
    }, [present, launcher]);

    useGSAP(() => {
        const media = gsap.matchMedia();
        media.add({ mobile: mobileChatQuery, reduced: "(prefers-reduced-motion: reduce)", normal: "(prefers-reduced-motion: no-preference)" }, (context) => {
            preferences.current = { mobile: Boolean(context.conditions?.mobile), reduced: Boolean(context.conditions?.reduced) };
            finishPanel();
            finishEntrances();
            resetPresses();
            if (panel.current) gsap.set(panel.current, { clearProps: "opacity,transform" });
            setReduced(preferences.current.reduced);
        });
        const visibility = () => {
            finishPanel();
            finishEntrances();
            resetPresses();
            setPageVisible(!document.hidden);
        };
        window.addEventListener("pointerup", release);
        window.addEventListener("pointercancel", release);
        document.addEventListener("visibilitychange", visibility);
        return () => {
            media.revert();
            panelTween.current?.kill();
            window.removeEventListener("pointerup", release);
            window.removeEventListener("pointercancel", release);
            document.removeEventListener("visibilitychange", visibility);
        };
    }, { scope: widget });

    useEffect(() => {
        if (!present) return;
        const viewport = window.visualViewport;
        const update = () => {
            if (!widget.current || !viewport) return;
            widget.current.style.setProperty("--chat-viewport-height", `${viewport.height}px`);
            widget.current.style.setProperty("--chat-viewport-top", `${viewport.offsetTop}px`);
        };
        const resize = () => { finishPanel(); finishEntrances(); update(); };
        update();
        viewport?.addEventListener("resize", resize);
        viewport?.addEventListener("scroll", update);
        window.addEventListener("resize", resize);
        const element = widget.current;
        return () => {
            viewport?.removeEventListener("resize", resize);
            viewport?.removeEventListener("scroll", update);
            window.removeEventListener("resize", resize);
            element?.style.removeProperty("--chat-viewport-height");
            element?.style.removeProperty("--chat-viewport-top");
        };
    }, [present, widget, finishPanel, finishEntrances]);

    const motion: ChatMotion = { open, intro, reduced, pageVisible, entries: entries.current, seenReplies: seenReplies.current };
    return { open, present, motion, toggle, keyboard, press, release };
}
