# Clarify board opportunity cards

## Card redesign

- Apply the selected **Analytical professional card** direction within the existing board lane width and light-cyberpunk design system.
- Keep the opportunity reference at the top, followed by a stronger opportunity name and client hierarchy.
- Replace the ambiguous `50%` with a clearly identified **Probability** value and a compact progress bar.
- Make **Deal value** the primary numeric value and label it explicitly.
- Add a structured metadata area with concise labels for **Expected close**, **Owner**, and **Stage**.
- Keep action information in a visually separate footer, preserving open, overdue, next-due, and no-action states.
- Use existing semantic colours, typography, borders, and focus styles rather than copying the prototype palette directly.

## Behaviour and accessibility

- Preserve drag-and-drop, click-to-open, Enter, and Alt + arrow keyboard movement exactly as they work today.
- Keep long names, clients, owners, stages, dates, and large values contained without overlap or lane resizing.
- Give the probability bar an accessible text label; colour is supplementary rather than the only indicator.
- Preserve reduced-motion behaviour and clear hover, dragging, and keyboard-focus states.

## Verification

- Check representative cards with missing values, long text, open actions, overdue actions, and no actions.
- Verify the board at the current laptop viewport and tablet width, ensuring labels remain legible and cards do not overlap.
- Confirm card opening, dragging, and keyboard lane movement still work without browser errors.

## Technical notes

- Limit implementation to the board card presentation in `src/components/kanban-board.tsx`; no data or workflow changes.
- Reuse `formatMoney`, `formatDate`, current action rollups, and the existing Button/design tokens where applicable.
