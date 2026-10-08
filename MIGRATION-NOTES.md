# Chat UI migration notes

## Delivered

`ChatBot.tsx` uses assistant-ui with local shadcn Button and Avatar components. It retains the original default component export, named React/ReactDOM exports, prop names, library entry point, environment modes, and backend settings.

UI features: floating launcher, responsive panel, plain user bubbles, Markdown assistant responses with GFM tables and links, copy-message button, typing indicator, automatic scrolling and scroll-to-bottom control, connection status, session restart, keyboard submission, and Escape-to-close with focus restoration.

Screenshots captured during the local browser test:

![Desktop widget](docs/chat-ui-desktop.png)

![Mobile widget](docs/chat-ui-mobile.png)

## Integration changes

The old widget's imperative add-message functions are replaced by React state supplied to `useExternalStoreRuntime`. A small hook adapts the existing SharedWorker messages; it creates the worker once per configuration and removes listeners/ports on unmount.

Small worker lifecycle changes support the migrated UI:

- Client-side event IDs deduplicate persisted broadcasts across tabs without changing server payloads.
- A newly attached tab receives the current connection/authentication state.
- A detached widget removes its port.
- Restart reconnects an expired socket and clears the previous authentication polling timer.
- Authentication `success` informs the UI, including after a refreshed booking token.
- WBE2 `qikres/auth` updates the JWT used by the worker for later chat and login requests.

Minor existing lint issues in the demo and Vite configuration were corrected. No server URLs, keys, or supplied environment file contents were changed.

## Validation completed

- `npm run typecheck`: passed.
- `npm run lint`: passed for the entire project.
- `npm run build`: all six existing production/staging builds passed.
- Browser tests using the actual widget, actual worker, and a controlled local Socket.IO backend: greeting, send/receive, typing state, Markdown tables/links, errors, local history restoration, tab synchronization, one-time broadcast persistence, session expiry, restart after socket disconnect, host trigger events, booking-token refresh, login payload, mobile panel bounds, Escape/focus behavior, and reload restoration passed.
- Dedicated Worker fallback without native SharedWorker: send/receive passed.
- Browser test of the compiled production ES module: default and named exports, stylesheet, production worker asset loading, signed authentication, chat send/receive, and host-page CSS isolation passed.
- No page errors were reported by those successful browser tests. Desktop and mobile screenshots were inspected.

The tests used a controlled local backend. The live backend and a deployed WordPress installation were not contacted, so production credentials, server behavior, CSP settings, and live hotel-specific booking flows still need your normal deployment check.

## Package contents

The ZIP contains the source, lockfile, original environment files, documentation, screenshots, and all six refreshed builds. It excludes installed node_modules, the old .git_ directory, macOS metadata, and the temporary local test server/configuration. Run `npm install` after extracting it.

Keep `style.css` and the corresponding `assets/worker-*.js` alongside `chatbot.es.js` when updating the existing site integration.
