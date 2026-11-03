# Portfolio Completion Roadmap

This is the consolidated delivery plan for the existing static HTML/CSS/JavaScript portfolio and Owner Studio. Work is grouped into complete releases; do not create one pull request per small feature. Keep all work on the single `feature/portfolio-completion-phase` branch until the full release is ready for one review and one merge.

## Already present on main (preserve and integrate)

- Cinematic public portfolio and matching Owner Studio visual system.
- Owner authentication and project library with separate Long Video and Short Video flows.
- Theme, Text, Animation, SEO, Backup & Restore studios.
- Visual Builder with custom text/image/video elements, Adjustment Panel, desktop/mobile position overrides, device-specific Undo/Redo, and local Save Draft / Auto-save / Restore / Discard.
- Version History, Media Library, Analytics, Performance controls.
- Project detail route at `/project/?id=<uuid>`.
- Custom cursor, responsive breakpoint settings, public AI assistant, AI settings and AI conversation inbox.
- Supabase tables already include `portfolio_inquiries`; RLS is enabled with public insert and owner-only management policies.

## Consolidated delivery phases

### Phase 1 — Client workflow and lead management
- Persist public contact-form submissions in `portfolio_inquiries` while preserving Email / WhatsApp / Instagram handoff.
- Add authenticated Owner Studio Client Inquiries workspace.
- Show inquiry details, preferred contact method, timestamps, status counts and filters.
- Allow owner to move requests through New → Contacted → In progress → Completed.
- Keep visitor-submitted content rendered as text, never trusted HTML.

### Phase 2 — Visual Builder completeness
- Audit and finish selection, drag, sizing, positioning, layering and responsive overrides.
- Preserve independent Desktop and Mobile undo/redo histories.
- Keep local draft recovery separate from persisted/published site state.
- Verify custom element CRUD, media upload, preview, save and publish as one connected flow.
- Preserve the standalone Adjustment Panel and current Owner Studio navigation.

### Phase 3 — Portfolio and creator operations
- Verify project detail pages for published/unpublished records and all supported media URL types.
- Verify Long / Short video CRUD, thumbnail behavior, sorting and public rendering.
- Verify Media Library reference detection, storage usage and safe delete behavior.
- Verify AI inbox and owner-approved knowledge updates.
- Verify SEO metadata, analytics event collection and performance controls.

### Phase 4 — Responsive, security and release quality
- Verify public site and every Owner Studio panel on mobile and desktop.
- Verify custom cursor is disabled on touch/coarse pointers and respects reduced motion.
- Audit Supabase RLS, public inquiry insertion, owner-only reads/updates and least-privilege access.
- Review Supabase security/performance advisor findings; only apply safe, scoped fixes.
- Run JavaScript syntax checks, link/ID consistency checks and regression checks.
- Produce one consolidated draft PR with a single end-to-end test checklist. Do not merge until the owner reviews the preview and approves.

## Delivery rules

- One branch and one final PR for this completion release.
- No direct commits to `main`.
- No production database schema or policy changes without a verified need and explicit review.
- Never expose service-role or secret keys.
- Preserve existing project data and all working features.
- Clearly separate code-level checks from browser/manual tests; never claim unrun tests passed.
