# Chat UI migration notes

## Delivered

`ChatBot.tsx` uses assistant-ui with local shadcn Button, Avatar, and AlertDialog
components. The WBE-only project retains the default component export, named
React/ReactDOM exports, prop names, library entry point, and backend settings.

UI features: floating launcher, responsive panel, plain user bubbles, Markdown assistant responses with GFM tables and links, copy-message button, typing indicator, automatic scrolling and scroll-to-bottom control, connection status, session restart, keyboard submission, and Escape-to-close with focus restoration.

See [`docs/concierge-widget.md`](docs/concierge-widget.md) for widget previews
and [`docs/guest-landing-page.md`](docs/guest-landing-page.md) for the guest page.

## Integration changes

The old widget's imperative add-message functions are replaced by React state supplied to `useExternalStoreRuntime`. A small hook adapts the existing SharedWorker messages; it creates the worker once per configuration and removes listeners/ports on unmount.

Small worker lifecycle changes support the migrated UI:

- Client-side event IDs deduplicate persisted broadcasts across tabs without changing server payloads.
- A newly attached tab receives the current connection/authentication state.
- A detached widget removes its port.
- Restart reconnects an expired socket and clears the previous authentication polling timer.
- Authentication `success` informs the UI.

The current cleanup removes unused integration variants, their host auth
listeners and outbound worker messages, Recoil state infrastructure, legacy
chat CSS, starter assets, and unreferenced server samples. The WBE
`x_auth_token` prop, JWT fields, authentication/chat payloads, server logout and
expiry, trigger events, storage, and worker fallback remain supported.

## Verification

The WBE-only cleanup passed typechecking, linting, all 36 Chromium/WebKit
checks, both WBE widget builds, and the standalone landing build. The landing
JavaScript bundle decreased from 1,120.56 kB to 1,060.26 kB.

Run typechecking, linting, `npm run test:ui`, `npm run build`, and
`npm run build:landing`. The existing suite contains 36 Chromium/WebKit checks
using the actual guest page, widget, worker, and a controlled Socket.IO backend.
It covers messaging, Markdown, errors, restored history, expiry/restart,
viewport bounds, keyboard/focus behavior, guest-page navigation, booking,
draft retention, and host-style isolation.

Local fixtures do not validate production credentials, deployed host CSP, or
live booking/backend transactions. Check those in the target integration.

## Deployment

WBE widget builds are in `dist/production/wbe/` and `dist/staging/wbe/`.
Keep `style.css` and the corresponding `assets/worker-*.js` alongside
`chatbot.es.js`. The standalone landing build uses `production.wbe` and is
deployed as the complete `dist/landing/` directory.
