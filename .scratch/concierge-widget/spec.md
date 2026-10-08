# Concierge widget refresh

Status: resolved

## Agreed design

Improve the existing floating widget first, retaining shadcn/ui and assistant-ui.
Use forest green and ivory, softer surfaces, readable message spacing, a polished
composer, and a near-fullscreen phone panel. Preserve the configured title/avatar,
component props, module exports, worker integration, host events, and history.

## Behaviors

- Show editable starter questions before the first user message, even after a
  backend greeting. Hide them while the composer has a draft. Questions cover
  rooms/reservations, check-in/check-out, and hotel amenities. Selecting one fills
  and focuses the composer without sending it.
- Show Book a room only when a booking URL is configured. Open it in a new tab
  with noopener/noreferrer.
- Confirm user-initiated restart when history exists, including expiry/restart
  links. Cancel preserves history and draft. Confirm clears the draft and calls
  the existing restart operation. Empty conversations restart directly.
- Desktop panel is at most 420px wide and 640px tall. At widths up to 640px,
  use safe-area-aware 8px margins and no separate launcher while open.
- Header and composer remain stationary; only messages scroll. Track the visual
  viewport for mobile keyboard sizing, falling back to 100dvh.
- Opening on phones focuses Close chat without opening the keyboard. Desktop
  opening focuses the composer. Closing restores launcher focus. Resizing and
  closing preserve the draft and conversation.
- Preserve Enter/Shift+Enter, Markdown/tables/links, copy, typing, scrolling,
  status/send gates, and session expiry handling. Provide 44px touch targets,
  visible focus, reduced-motion support, and a nonmodal chat panel.
- Use a local Radix-backed shadcn AlertDialog for restart, portaled inside the
  widget container. Escape dismisses confirmation without closing chat.

## Boundaries and validation

Keep styling scoped to .ubiq-chat with Tailwind preflight disabled. Light theme
only. No full-page app, demo redesign, backend additions, attachments, or
regeneration. Browser/Socket.IO are the agreed test seams: exercise the visible
widget through its real runtime/worker against a controlled local server.

Run focused browser regression checks, typechecking, lint, and all six build
variants. Inspect desktop/mobile screenshots and review the change against this
spec and repository standards. Real mobile Safari/Chrome keyboard behavior must
be reported as unverified if those devices are unavailable.
