# UBIQ chatbot frontend

React 18 + TypeScript + Vite guest page and embeddable WBE chat widget. The
widget uses **assistant-ui** with local **shadcn/ui** components and retains its
Socket.IO backend, SharedWorker, JWT payload, props, and React/ReactDOM exports.

## Run locally

From the project directory, run:

```bash
npm install
npm run dev:wbe
```

Use the URL printed by Vite.

The local app opens a Bay Hotel guest landing page with rooms, amenities,
neighbourhood highlights, booking, and the existing floating concierge. The
green-and-ivory page uses illustrative artwork and demo branding. See
[`docs/guest-landing-page.md`](docs/guest-landing-page.md) for previews and setup.

WBE configuration uses `.env.development.wbe`, `.env.production.wbe`, and
`.env.staging.wbe`. Server configuration remains in `VITE_CHAT_SERVER` and
`VITE_CHAT_SERVER_KEY`; the guest page passes its client identifiers and links
from the existing environment variables.

## Build and check

```bash
npm run typecheck
npm run lint
npm run build
npm run build:landing
npm run test:ui
```

`npm run build` typechecks and builds both WBE widget environments. Run
`npm run build:production` or `npm run build:staging` for an individual build.

The outputs are `dist/production/wbe/` and `dist/staging/wbe/`. Each contains:

- `chatbot.es.js`: the embeddable widget module.
- `style.css`: the widget styles; load this alongside the module.
- `assets/worker-*.js`: deploy the worker asset with the module; keep its relative location.

To build the standalone guest page, run `npm run build:landing`, then
`npm run preview:landing`. Deploy the complete `dist/landing/` directory. This
separate build defaults to `production.wbe`; choose another WBE environment
with `npm run build:landing -- --mode development.wbe`, for example. The
widget entry point remains independent of the landing build.

The module continues to export the default `ChatBot` component and named `React` / `ReactDOM` exports. Existing host-page mounting code can keep its props:

```tsx
<ChatBot
    app_key={app_key}
    customer_id={customer_id}
    property_code={property_code}
    x_auth_token={x_auth_token}
    booking_link={booking_link}
    login_link={login_link}
    payment_link={payment_link}
    chatbox_title={chatbox_title}
    avatar={avatar}
/>
```

## Structure and customization

```text
src/
  components/
    ChatBot.tsx                 widget entry point, launcher, header, runtime provider
    assistant-ui/thread.tsx    bubbles, Markdown, timestamps, scrolling, composer
    hotel/guest-page.tsx        Bay Hotel guest page
    ui/button.tsx              local shadcn Button source
    ui/avatar.tsx              local shadcn Avatar source
  hooks/use-chat-motion.ts     scoped GSAP motion, presence, focus, and viewport lifecycle
  hooks/use-chat-worker.ts     worker authentication, history, and server events
  lib/chat-history.ts          compatible history records and cross-tab deduplication
  lib/utils.ts                shadcn class-name utility
  worker.ts                   existing Socket.IO worker and server event contract
  custom.css                  scoped widget theme and responsive styles
  App.tsx                     guest-page environment configuration
  main.tsx                    React entry point
```

Edit `src/custom.css` for colors and panel sizing. Theme variables are scoped to `.ubiq-chat`; Tailwind preflight is disabled and utilities are scoped to the widget to avoid changing WordPress page styles. `components.json`, path aliases, Tailwind, and PostCSS are configured for local shadcn components.

The widget uses a forest-green and ivory concierge theme. Starter questions fill
the composer for editing before sending and stay available after the server
greeting. A configured `booking_link` adds a Book a room shortcut that opens in a
new tab. Restarting a conversation with history requires confirmation, including
the restart link shown after expiry.

GSAP adds calm panel entrances/exits, new-reply entrances, a first-open prompt
stagger, visible-only typing feedback, and pointer press feedback. Keyboard
actions stay instant; reduced motion removes movement and stagger. See
[`docs/concierge-widget.md`](docs/concierge-widget.md) for timings and behavior.

Pending replies show animated dots and “Preparing your reply…”. Completed
assistant replies show the guest's local time under the bubble. Times persist
across tabs and reloads; legacy history without a recorded time stays undated.

Optional reCAPTCHA v3 verification uses `VITE_RECAPTCHA_SITE_KEY` and
`VITE_RECAPTCHA_ENDPOINT`, or the widget props `recaptcha_site_key` and
`recaptcha_endpoint` (props override the environment defaults). Both values
must be present to enable it. The supplied localhost values are configured in
ignored `.env.development.wbe.local`; deployment environments supply their own
values. `.env.example` documents the two names.

On each send, the widget loads/reuses Google's SDK, waits for readiness,
executes action `usermessage`, and posts `{ "token": "…" }` to the configured
endpoint. HTTP success and JSON `success: true` are required. The complete check
has a ten-second timeout. Failure restores the draft with retry feedback,
including text added while checking. Restart, disconnect and unmount invalidate
pending checks. Tests mock Google and the verifier; the live service is not
contacted by the browser suite.

On screens up to 640px wide, and touch-device landscape layouts up to 1024px wide
and 500px high, the open panel fills the visible viewport edge to edge. Safe-area
padding sits inside the panel. Opening on phones focuses the close control; the
keyboard opens when the guest chooses to type. Closing or resizing retains the
draft. The local demo uses `viewport-fit=cover`; embedded host pages control
their own viewport metadata.

## UI regression checks

Install the test browsers once with `npx playwright install chromium webkit`,
then run `npm run test:ui`. The suite starts its own Vite host and a local
Socket.IO fixture on ports 4180 and 4181. It uses test identifiers and a test
signing key, independent of the supplied environment files and live backend.
Chromium and WebKit checks cover navigation, starter questions, booking, host
session events, restart and expiry, mobile layout, drafts, Markdown, timestamps,
verification, errors, history, and reduced motion. Screenshots and failure
traces are saved under ignored `test-results/`.
Real device software-keyboard behavior still needs a mobile Safari/Chrome check.

## Preserved backend behavior

- Signed HS256 JWT with existing client data, booking token, and one-hour expiry.
- Socket.IO `authenticate` and `chat` payloads.
- Response, error/severe, expired, restart, and host trigger flows.
- Existing `chat_auth_token`, `chat_history`, and `chat_tab_id` storage keys.
- Restoration of old history records; new records carry IDs and creation timestamps.
- SharedWorker synchronization across tabs, plus dedicated Worker fallback.
- Server logout handling and session expiry.
- Bubbling `qikres/chatbot/<trigger>` custom events and Markdown `#restart` links.

The backend returns complete messages, so the UI displays a waiting indicator until a response arrives. Backend cancellation, regeneration, editing, and attachments are not exposed because the current server contract does not implement them.

Consecutive identical incoming chat events are suppressed by type and raw
message before fanout and persistence. A new guest message, different event,
or session reset starts a fresh comparison. `severe` uses the same display and
session handling as `error`. Known error codes receive the reference wording;
unknown errors display the `Unknown error:` fallback.

## Host website session events

Dispatch these events on the document containing the widget. The widget
registers its listeners on mount and removes them on unmount.

| Event | Widget behavior |
| --- | --- |
| `qikres/auth` | Reads the string `detail.auth_token`. A changed booking token starts a new chat session. |
| `qikres/login`, `myroompass/login` | Send Socket.IO `login` with the current `x_auth_token`. Dispatch the auth event first when updating the token. |
| `qikres/logout`, `myroompass/logout` | Send Socket.IO `logout` with the outgoing token if connected, clear signed-in chat and drafts, then reconnect as a guest. |
| `qikres/sessionExpired` | Discard the expired booking token and disable sending until the guest restarts or the host supplies a fresh token. Restarting before a fresh token arrives opens a guest session. |

```js
document.dispatchEvent(new CustomEvent("qikres/auth", {
  detail: { auth_token: bookingToken },
}));
document.dispatchEvent(new Event("qikres/login"));
```

Session changes cancel in-flight message verification and apply to tabs
attached to the same SharedWorker.

## Migration details

`react-chat-widget-react-18` is replaced by `@assistant-ui/react` and `@assistant-ui/react-markdown`. The runtime uses `useExternalStoreRuntime` to adapt the existing worker message store. GFM Markdown supports tables and booking links; user messages remain plain text.

Worker creation follows the React effect lifecycle, with cleanup on unmount.
Worker broadcasts get client-side event IDs so each shared response is persisted
once. Authentication success updates the UI state. WBE can receive its initial
booking token through the existing `x_auth_token` prop.

## Validation

See `MIGRATION-NOTES.md` for the integration changes and verification scope.
See `docs/concierge-widget.md` for the concierge behavior and previews.

References: https://www.assistant-ui.com/docs/runtimes/custom/external-store and https://ui.shadcn.com/docs
