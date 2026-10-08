# Bay Hotel guest page

Status: resolved

The user confirmed a Bay Hotel guest page with rooms, amenities, local highlights,
booking, and the existing chat widget, matching the green-and-ivory theme.

- Replace the Vite starter screen with a responsive, polished Bay Hotel Singapore
  guest page. Use the local shadcn Button and existing assistant-ui widget.
- Include accessible navigation, welcome hero, room concepts, amenities,
  neighbourhood highlights, stay/booking section, and footer.
- Preserve the existing environment-based widget configuration and query auth token.
  Mount exactly one ChatBot. Guest-page concierge controls open an existing closed
  widget and never toggle an open widget closed or clear its draft.
- When a booking URL exists, all booking controls open that configured URL in a new
  tab. Without one, offer 'Ask about a stay' through the concierge. Do not invent a
  reservation endpoint. If required widget configuration is absent, keep the page
  usable with unavailable chat controls rather than crashing the page.
- Keep Bay Hotel branding as a demo concept: the physical property now operates as
  Travelodge Harbourfront. Use illustrative artwork and conservative room concepts,
  without rates, star ratings, fake testimonials, or availability promises.
- Keep landing styles separate from the embeddable widget styles. Preserve all six
  widget builds and public widget props, types, exports, worker and backend contracts.
- Add an independent deployable landing build and preview command.
- Check navigation, booking, missing booking, concierge opening/drafts, and page
  layout at 320px, 390px, 640px and desktop. Existing mobile widget coverage remains
  edge to edge. Respect keyboard focus and reduced motion.
- Run the existing browser suite plus page checks, typechecking, linting, the six
  widget builds and the landing build. Save desktop/mobile previews and documentation.

Git naming follows the user's preference: guest-landing-page, with commit message
'feature : guest-landing-page'. Keep main at the latest completed work.

## Validation

36 browser checks passed across Chromium and WebKit. Typechecking, linting, all
six widget builds, and the independent landing build passed. Desktop/mobile
screenshots were inspected. Standards and Spec reviews found no blocking issues.
