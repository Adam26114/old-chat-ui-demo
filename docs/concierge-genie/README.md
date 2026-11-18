# Boutique concierge genie

Open [the live browser preview](Boutique_Concierge_Genie.html) to try the chat launcher and compare all four poses at 32 px on light and dark surfaces. The 56 px launcher opens a sample chat. Choose **Ask about check-in** to see the Typing pose. The preview runs offline and uses a simulated reply. On narrow touch layouts, the mascot moves into the open chat header.

## Artwork

- [Labeled 2×2 state sheet](state-sheet.png)
- [Layered SVG master](genie-master.svg)
- Transparent pose exports · [Natural](natural.svg) · [Hover](hover.svg) · [Active](active.svg) · [Typing](typing.svg)

The master uses a 112 × 112 viewBox. Its shared shapes are grouped as shoulders and wisp, portrait, and concierge cap. Individual expression groups and a group for the thinking dots sit on top of those shapes. Set the root SVG’s `data-pose` to `natural`, `hover`, `active`, or `typing` to preview a pose. The Hover art supports `data-direction="left"` and `data-direction="center"` for the head tilt. The standalone preview embeds the same SVG. Keep that embedded copy and the static exports in sync when editing the master.

## Character concept

| Element | How it signals a helpful hotel assistant |
| --- | --- |
| Silhouette | The floating bust ends in a short wisp shaped like a speech-bubble tail, suggesting a genie who answers questions. |
| Face | An ivory face with broad, softly faceted cheeks, dark eyes, and clear brow strokes gives the guest an easy-to-read expression. |
| Color and finish | A forest-green jacket frames the face. A shallow glazed highlight gives the mascot depth while keeping the eyes and mouth clear. |
| Concierge cap | A low forest-green cap with a single brass band supplies the front-desk cue. |

The first reference informed the soft finish and labeled grid. The original drawing uses its own rounded face, cap, jacket, and speech-tail silhouette.

## State and motion spec

Use one-shot easing `cubic-bezier(0.23, 1, 0.32, 1)` and `ease-in-out` for loops. Movement distances below refer to the 56 px launcher. The mascot is decorative within the accessible chat button. The chat exposes its pending status as text.

| State | Face, body, and guest message | Motion and neighboring states | Reduced motion |
| --- | --- | --- | --- |
| **Natural** | Centered oval eyes, relaxed brows, and a small closed smile. The head and shoulders are level. “You can ask me about your stay.” | A 1 px peak-to-peak float loops every 6,000 ms. A single 200 ms blink repeats at irregular 7–10 second intervals. Hover or opening interrupts both. | Hold the level, open-eyed smile. |
| **Hover** | One brow lifts higher than the other. Wider eyes follow the pointer, the smile deepens slightly, and the head tilts 5° toward the pointer. The tile highlight brightens. “You have my attention.” | Lift 2 px and ease into the pose over 160 ms, then hold while the pupils follow the pointer. On pointer exit, return over 140 ms unless keyboard focus still applies. Keyboard focus produces a centered gaze. Pressing shifts directly into Active. | Hold the asymmetric brow and brighter highlight with a level head, centered eyes, and no lift. |
| **Active** | Both brows lift evenly above open eyes. A broader smile and level shoulders read as attentive after the brief nod. “I’m listening.” | The button compresses to 97% over 100 ms and releases over 120 ms. After pointer or touch activation, the head dips and returns once over 240 ms as the chat opens. Keyboard activation goes straight to the listening pose. Typing takes over for a pending reply. Closing returns to the current hover or focus pose, or to Natural. | Show the listening pose immediately. |
| **Typing** | The pupils look up and aside, one brow pulls inward, and the mouth settles into a level line. Three ivory dots sit against a dark shoulder inset. “I’m thinking about your question.” | Enter over 140 ms. Stagger the three dots by 200 ms in a 1,200 ms loop, keeping each dot at 58% opacity or higher. A reply, cancellation, or error returns to Active over 140 ms. Closing restores the launcher pose. Reopening during a pending reply shows Typing immediately. | Hold the thinking face and three steady dots. |

The preview follows the system’s reduced-motion preference until the preview checkbox is used. Idle and typing loops pause when the browser tab is hidden.

## Visual QA

The checks combine visual inspection of the sheet and unlabeled 32 px samples with browser checks of the interactive preview. State recognition was assessed in design review.

| Check | Result | Evidence or correction |
| --- | --- | --- |
| Same character in all four states | **Pass** | The shoulder and wisp, portrait, and cap layers and their paint definitions matched exactly across all four exports. The Hover transform moves the shared layers together. |
| Four distinguishable states at 32 px | **Pass** | The first review found Natural and Hover too similar. A higher, asymmetric brow, more visible whites, and a directional gaze distinguish Hover in the unlabeled retest. Active reads through the broad smile. Typing reads through the side glance, flat mouth, and three dots. |
| Contrast on light and dark | **Pass** | Essential facial marks measured at least 6.26:1 against the darkest face color. The light and dark button outlines measured at least 8.59:1 and 9.96:1 respectively. Typing dots measured 4.70:1 at minimum opacity. The dark-preview outline initially carried into the light mobile chat header. Scoping that outline to the guest-page launcher restored the dark outline on the header avatar. |
| Quiet idle motion | **Pass** | The live launcher floated 1 px peak-to-peak across two 6-second cycles beside sample hotel copy. An observed blink compressed the eye shapes, with steady lighting and a fixed button. |
| Reduced motion for every state | **Pass** | Changed the system preference during each state and verified all running loops and nods stopped. The preview toggle also stopped the Typing cycle and left three steady dots. |
| Professional boutique tone | **Pass** | Reviewed the 56 px launcher and 32 px samples. The limited palette, low cap, restrained expression changes, and single brass detail fit the boutique concierge direction. |
| Originality against reference 2 | **Pass** | Direct comparison confirmed a distinct cap, face shape, eye treatment, costume, palette, and speech-tail outline across the four poses. |

Desktop pointer and keyboard flows and an emulated touch flow were exercised in Chromium. The demo covered opening, focus return, typing, completion, cancellation, error, and reopening a pending reply.

WebKit also passed the desktop flow from Hover through opening, Typing, reduced motion, cancellation, and closing.
