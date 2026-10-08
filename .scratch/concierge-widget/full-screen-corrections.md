# Copy icon and full-screen mobile corrections

Status: resolved

Use a small standalone copy icon and fill the visible browser viewport on phones.
Retain shadcn/ui, assistant-ui, the concierge theme, public interfaces, and backend.

- Copy: 16px Copy/Check glyph; transparent at rest; 24px rounded mint hover/focus
  tile inside a 44px touch target. Preserve the tooltip and clipboard behavior.
- Copy spacing: remove the negative margin and undersized action row; align below
  the message text with separation from the bubble.
- Mobile: zero outer gaps, border, radius, or shadow. Use full visualViewport
  height/offset and keep the 100dvh fallback. Safe-area padding belongs inside
  the header, message area, booking row, and composer.
- Apply at widths up to 640px and on touch devices in landscape up to 1024px
  wide and 500px high. Hide the open mobile launch button. Preserve desktop
  sizing, close/focus restoration, drafts, and keyboard-aware sizing.
- Add viewport-fit=cover to the local development page; do not modify a host
  page's viewport metadata from the widget.

Update browser bounds checks for zero gaps at 320px, 390px, and 640px. Check touch
landscape, shrinking viewports, the fallback without visualViewport, and copy
resting/hover/keyboard-focus/copied states. Run the existing browser suite,
typechecking, lint, and all six builds. Refresh documentation and previews.
Physical mobile keyboard behavior remains a device-check limitation.
