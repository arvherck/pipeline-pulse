# Light cyberpunk UI redesign

Refresh the full Pipeline Tracker interface using the selected **Light cyberpunk dashboard** direction. Keep every existing workflow, data rule, and tablet behavior unchanged.

## Visual system

- Use a cool near-white canvas (`#f1f5f9`), white work surfaces, deep ink (`#0f172a`), electric cyan (`#0891b2`) as the primary accent, and restrained indigo (`#4f46e5`) for secondary signals.
- Load **Space Grotesk** for headings and **DM Sans** for body copy, as selected.
- Add a faint technical dot grid, thin rules, small corner markers, compact uppercase status labels, and crisp focus states.
- Keep the look light and professional: no dark gamer theme, gradients, decorative glow, or heavy shadows.
- Tighten the component system globally: low-radius controls, sharper panels, cyan focus rings, technical table headers, and consistent compact spacing.

## Application frame

- Replace the flat top bar with a stronger command header: prominent Pipeline Tracker identity, small live-status marker, clear active navigation, last-import status, and sign-out action.
- Constrain the working area to a wide centered canvas while preserving horizontal room for the board and table.
- Give every page a consistent title band with a small contextual status label and clear hierarchy.
- Preserve the existing wrapping behavior at tablet widths.

## Dashboard

- Recompose the dashboard to match the selected direction: bold page identity, high-contrast operational metrics, and a compact lane-status band.
- Restyle target cards with technical labels, segmented progress indicators, stronger totals, and refined charts.
- Turn the empty target state into a deliberate dashed technical placeholder rather than a plain white box.

## Board

- Style lane headers as compact status modules with a strong lane-colour edge, count badge, and corner detail.
- Upgrade opportunity cards with clearer name/account/value hierarchy, technical metadata, crisp hover/focus feedback, and visual drag state.
- Preserve drag-and-drop, keyboard movement, horizontal scrolling, lane colours, and the manage-lanes control.

## Table and import

- Restyle filters as a compact command row with clearer grouping and active states.
- Give the data table a technical header, stronger row rhythm, clear sorting feedback, and focused hover selection without reducing density.
- Redesign the import drop zone, mapping table, preview, and confirmation action to use the same system-status visual language.

## Settings and side panels

- Restyle settings sections as clean control modules with indexed headers and stronger separation between lists and edit areas.
- Apply the same treatment to opportunity details and lane management: sharper panel header, technical tabs, compact field labels, consistent inputs, and a more visible sticky save area.
- Keep validation, history, actions, picklists, targets, lane reassignment, and all persistence behavior unchanged.

## Motion and accessibility

- Use short, restrained transitions for active navigation, cards, progress, and focus; disable them when reduced motion is requested.
- Retain semantic colours, visible keyboard focus, accessible labels, contrast, and existing screen-reader announcements.

## Technical details

- Centralize the palette, typography, surface, border, and shadow values in `src/styles.css` as semantic tokens.
- Load Space Grotesk and DM Sans from the document head; do not use remote CSS imports in the stylesheet.
- Update shared controls first, then the app frame and reusable data modules so all routes inherit the same treatment.
- Use existing components and libraries only; no new product features or backend changes.
- Verify the dashboard, board, table, import, settings, and side panels at desktop and tablet widths, including overflow and keyboard states.
