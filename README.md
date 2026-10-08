# UBIQ chatbot frontend

React 18 + TypeScript + Vite chat widget. `src/components/ChatBot.tsx` now uses **assistant-ui** with local **shadcn/ui** components. The existing Socket.IO backend, SharedWorker, JWT payload, environment modes, component props, and React/ReactDOM exports are retained.

## Run locally

Extract this project, open a terminal in the `frontend` folder, then run:

```bash
npm install
npm run dev:wbe
```

Use the URL printed by Vite. Choose the script matching your integration:

| Integration | Command |
| --- | --- |
| WBE | `npm run dev:wbe` |
| WBE2 | `npm run dev:wbe2` |
| Myroompass | `npm run dev:myroompass` |

The supplied environment files are preserved. Server configuration remains in `VITE_CHAT_SERVER` and `VITE_CHAT_SERVER_KEY`; the demo passes its client identifiers and links from the existing environment variables. No new backend or AI provider configuration is needed.

## Build and check

```bash
npm run typecheck
npm run lint
npm run build
npm run test:ui
```

`npm run build` builds all six existing production/staging variants. You can also run `npm run build:production` or `npm run build:staging`.

Each build remains in `dist/<production|staging>/<wbe|wbe2|myroompass>/` and includes:

- `chatbot.es.js`: the embeddable widget module.
- `style.css`: the widget styles; load this alongside the module.
- `assets/worker-*.js`: deploy the worker asset with the module; keep its relative location.

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

The existing entry points are retained; only small UI and adapter folders are added.

```text
src/
  components/
    ChatBot.tsx                 widget entry point, launcher, header, runtime provider
    assistant-ui/thread.tsx    bubbles, Markdown, copy, scrolling, composer
    ui/button.tsx              local shadcn Button source
    ui/avatar.tsx              local shadcn Avatar source
  hooks/use-chat-worker.ts     original worker/auth/host-event integration in a hook
  lib/chat-history.ts          compatible history records and cross-tab deduplication
  lib/utils.ts                shadcn class-name utility
  worker.ts                   existing Socket.IO worker and server event contract
  custom.css                  scoped widget theme and responsive styles
  App.tsx                     existing development demo
  main.tsx                    existing React entry point
```

Edit `src/custom.css` for colors and panel sizing. Theme variables are scoped to `.ubiq-chat`; Tailwind preflight is disabled and utilities are scoped to the widget to avoid changing WordPress page styles. `components.json`, path aliases, Tailwind, and PostCSS are configured for local shadcn components.

The widget uses a forest-green and ivory concierge theme. Starter questions fill
the composer for editing before sending and stay available after the server
greeting. A configured `booking_link` adds a Book a room shortcut that opens in a
new tab. Restarting a conversation with history requires confirmation, including
the restart link shown after expiry.

On screens up to 640px wide, the open panel fills the visible viewport with
safe-area margins. Opening on phones focuses the close control; the keyboard
opens when the guest chooses to type. Closing or resizing retains the draft.

## UI regression checks

Install the test browsers once with `npx playwright install chromium webkit`,
then run `npm run test:ui`. The suite starts its own Vite host and a local
Socket.IO fixture on ports 4180 and 4181. It uses test identifiers and a test
signing key, independent of the supplied environment files and live backend.
Chromium and WebKit cover starter questions, booking, restart/expiry, mobile
layout, drafts, Markdown, clipboard (Chromium), errors, history, and reduced
motion. Screenshots and failure traces are saved under ignored `test-results/`.
Real device software-keyboard behavior still needs a mobile Safari/Chrome check.

## Preserved backend behavior

- Signed HS256 JWT with existing client data, booking token, and one-hour expiry.
- Socket.IO `authenticate`, `chat`, `login`, and `logout` payloads.
- Existing response, error, expired, restart, and host trigger flows.
- Existing `chat_auth_token`, `chat_history`, and `chat_tab_id` storage keys.
- Restoration of old history records; new records add an ID for deduplication.
- SharedWorker synchronization across tabs, plus dedicated Worker fallback.
- WBE2 `qikres/auth`, `qikres/login`, `qikres/logout`, and `qikres/sessionExpired` events.
- Myroompass `myroompass/login` and `myroompass/logout` events.
- Bubbling `qikres/chatbot/<trigger>` custom events and Markdown `#restart` links.

The backend returns complete messages, so the UI displays a waiting indicator until a response arrives. Backend cancellation, regeneration, editing, and attachments are not exposed because the current server contract does not implement them.

## Migration details

`react-chat-widget-react-18` is replaced by `@assistant-ui/react` and `@assistant-ui/react-markdown`. The runtime uses `useExternalStoreRuntime` to adapt the existing worker message store. GFM Markdown supports tables and booking links; user messages remain plain text.

Worker creation and host listeners now follow the React effect lifecycle, with cleanup on unmount. Worker broadcasts get client-side event IDs so each shared response is persisted once. Restart reconnects an expired socket, authentication success updates the UI state, and `qikres/auth` refreshes the worker JWT so subsequent chat/login payloads carry the updated booking token. Server URLs, keys, and event payload formats are unchanged.

`src/chat_style.css` is retained as a historical file and is no longer imported. The new UI lives in `src/custom.css`.

## Validation

See `MIGRATION-NOTES.md` for the checks performed and the limits of that verification.
See `docs/concierge-widget.md` for the concierge refresh, current previews, and its validation results.

References: https://www.assistant-ui.com/docs/runtimes/custom/external-store and https://ui.shadcn.com/docs
