# Calm GSAP motion for the concierge

Status: resolved

Baseline: ae39f27 (main before this feature).

Implement the approved plan: desktop panel 240ms entrance from opacity 0,
scale .97 and y=12, with 160ms exit; mobile fade-only 180/120ms, retaining
full viewport coverage. New assistant replies enter once by ID with 180ms
opacity/y=6; outgoing messages stay immediate. Restored/hidden replies and
reopening must not replay motion. Starter questions stagger only on first
pointer opening (160ms, 40ms stagger), never on draft changes. Typing dots
use a GSAP opacity loop only while open, pending and the document is visible.
Pointer presses scale .97 in 100ms, release in 120ms. Use CustomEase
(0.23,1,0.32,1), scoped useGSAP/contextSafe and lifecycle cleanup.

Keep closing presence separate from requested open state; rapid toggles must
retarget current motion, preserve drafts, make closing content inert, move
focus before aria hiding, restore launcher focus after closing, and keep
viewport tracking through exit. Keyboard actions/Escape are instant and finish
active entrances. Preserve activation source through landing concierge buttons.
Reduced motion changes at runtime eliminate translation/scale/stagger, permit
fades <=100ms, and leave static typing dots. Pause loops in hidden panels/tabs.

Preserve theme, shadcn/ui, assistant-ui, public props/exports, backend, history,
scrolling, full-screen mobile layout, and restart confirmation. Add only gsap
and @gsap/react with bundled CustomEase. Run focused and existing browser checks,
typechecking/linting, two WBE widget builds and landing build. Inspect motion
at normal/slowed speed and update docs. Publish chat-gsap-motion and main
atomically without force, commit 'feature : chat-gsap-motion', leave clean main.


## Verification results

- All 52 Chromium/WebKit checks passed (36 existing, 16 motion).
- Typecheck, lint, production/staging WBE builds and landing build passed.
- Normal and quarter-speed desktop/mobile frames inspected; no page errors.
- Only gsap and @gsap/react were added; no backend or public API changes.

## Standards

| Before | After | Why |
| --- | --- | --- |
| Held/releasing buttons could retain scale after a reduced-motion change | Owned press/release tweens are killed entirely and transforms reset | Removes movement immediately, including stale completion callbacks |
| Same-frame close/reopen could park focus outside the panel | Each actual reopening restores focus directly | Focus survives batched state updates |

Standards recheck: 0 remaining findings.

## Spec

| Before | After | Why |
| --- | --- | --- |
| A missing reply-animation sample could count as opacity zero | A recorded sample is required before comparison | Regression cannot pass without observing the entrance |
| An old release callback could affect a new press | Per-button tween ownership kills the previous tween completely | Retargeting cannot retain stale callbacks |

Spec recheck: 0 remaining findings.
