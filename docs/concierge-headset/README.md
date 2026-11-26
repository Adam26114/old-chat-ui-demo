# Green headset bot

Open [the team preview](index.html) directly in a browser. Select any state to see it at presentation size, or use **Try live launcher** to try it on the guest page. The live preview uses a simulated check-in reply.

The redesigned SVG plays its idle float and blink when opened directly or used as an image. The preview uses the same artwork and adds six interactive states. [Download the animated SVG](headset-bot.svg).

## Motion

| State | Guest message | Animation | Reduced motion |
| --- | --- | --- | --- |
| Natural | “I’m here if you need me.” | A 6 s ease-in-out float peaks at 0.5 px at 56 px. A separate 200 ms blink plays once every 8.5 s. | Open eyes in a level pose. |
| Hover | “You have my attention.” | Eyes turn toward the mouse and open slightly wider. The bot lifts 1.5 px over 160 ms with ease-out. It holds while hovered and lowers over 160 ms on exit. | Fixed upward gaze and lifted pose. |
| Active | “I’m listening.” | Pointer or touch activation plays a single 240 ms ease-out nod. The band and cups move with the head, then the bot settles into a listening pose. Keyboard activation goes directly to that pose. | Still listening pose. |
| Focus | “I’m ready to open.” | The eyes widen and lift over 120 ms with ease-out. The button’s focus indicator appears immediately and holds until blur. | Widened eyes and the same steady focus indicator. |
| Typing | “I’m preparing your reply.” | Eyes glance up and three inset dots pulse with a 1.2 s ease-in-out cycle. The pose returns to Active when the reply completes or is cancelled. | Fixed upward gaze with three visible dots. |
| Sleeping | “I’m resting, but you can wake me.” | After 60 s of closed-chat inactivity, the bot drops 1 px and closes its eyes over 420 ms. Approach or focus wakes it. Tap opens chat on the first press. | Still, lowered pose with closed lids. |
| Looking Cursor | “I see you nearby.” | Within 160 px of the launcher, the eyes follow the mouse by up to 2 px with 140 ms ease-out. Leaving that area recenters them, and entering the button lifts the bot into Hover. | Fixed side glance. |

The live preview gives Typing and Active priority while chat is open. With chat closed, keyboard Focus takes priority over Hover and Looking Cursor. Recurring animations pause when the page is hidden.

## Reuse

Use the SVG as a regular image for the idle animation. For interactive states, inline the SVG, include [the motion CSS](headset-motion.css) and [the motion controller](headset-motion.js), and construct `new HeadsetBotMotion(svg)`. Call `setState(state)` with `natural`, `hover`, `active`, `focus`, `typing`, `sleeping`, or `looking`. Call `nod()` on pointer activation, `look(x, y)` with a normalized direction while hovering or looking, and `setReduced(reduced)` and `setPaused(paused)` when motion preferences or visibility change. The preview shows the live wiring.

The preview inlines a copy of the SVG markup so it can open directly from disk. Keep that template in sync with the export when editing the art.

## QA

| Check | Result |
| --- | --- |
| One character throughout | **Pass.** Every pose uses identical source geometry and colors for the shell, face, and headset. |
| Legibility at 32 px and 56 px | **Pass.** Checked on both surfaces. Closed lids, typing dots, and gaze stay inside the face. Hover and Looking Cursor are most distinct in motion. Focus also uses the button’s outline. |
| Light and dark surfaces | **Pass.** Eye bars have 19.05:1 contrast against the face. The main headset green has 4.69:1 contrast on white and 3.26:1 on the dark comparison surface. |
| Quiet idle motion | **Pass.** Only the occasional blink and half-pixel float repeat in Natural. |
| Reduced motion in every state | **Pass.** The standalone image and all seven preview poses hold still in reduced motion. |
| Professional hospitality tone | **Pass.** The clean face, restrained motion, and headset suit a guest-facing concierge. |
| Original silhouette | **Pass.** The green shell and offset face follow the supplied drawing. The video informed the headset and motion. |

Chromium and WebKit passed offline loading, state selection and replay, mouse approach and exit, keyboard focus and activation, Escape and focus return, phone touch, sleep and wake, reply completion and cancellation, and reduced motion. The full headset fits inside the launcher at the peak of the Active nod.
