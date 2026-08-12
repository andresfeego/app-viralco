---
name: viralco-ui-guardrails
description: Enforce ViralCo UI guardrails when building or editing interfaces in the ViralCo project across WEB/front and APP/mobile. Use this for any new page, screen, component, dashboard, form, table, card, modal, tooltip, menu, chart wrapper, media preview, or reusable UI work. Requires existing design-system tokens and reusable components first, forbids hardcoded UI values, mandates explicit light/dark theme compatibility, and mandates marking unresolved one-off UI with a comp_hardcode label.
---

Use this skill for any UI work in `WEB/front` or `APP/mobile` of the ViralCo project.

## Mandatory rules

1. Reuse before creating.
   Use existing reusable UI from the relevant surface before adding new UI.

   Web source of truth:
   - `WEB/front/src/design-system/components`
   - `WEB/front/src/design-system/tokens`
   - `WEB/front/src/design-system/ui.css`
   - `WEB/front/src/design-system/portal.tsx`

   Mobile source of truth:
   - `APP/mobile/src/design-system/tokens.ts`
   - `APP/mobile/src/design-system/theme.ts`
   - `APP/mobile/src/design-system/components`
   - `APP/mobile/src/components`

2. Tokens first.
   Never hardcode colors, spacing, margin, padding, gap, radius, elevation, focus rings, or semantic states in component code or CSS.
   Always map UI values to existing tokens, theme values, or CSS variables derived from those tokens.

3. Gray means gray scale only.
   If a gray tone is requested, use only the existing gray scale already defined in tokens.
   Do not generate new mixed grays, color-mix grays, or rgba-based pseudo-grays.

4. Reusable component required.
   If a needed UI pattern does not exist yet, such as:
   - data table
   - chart table
   - tooltip
   - tabs
   - dropdown
   - filter bar
   - empty state variant
   - form field
   - account selector
   - event resource row
   then do not ship it as loose one-off UI first.
   Create or extend a reusable component in the correct layer and expose it in the applicable component review surface when one exists.

5. Hardcoded exception marker.
   If a screen must temporarily ship before the reusable component exists, mark the hardcoded area with a visible label.
   Requirements:
   - text: `comp_hardcode`
   - position: `absolute`
   - corner: top left
   - must be clearly visible
   - use token-based colors only

6. Web `/ui-components` is the contract.
   Any new reusable web UI primitive must be demonstrated in `/ui-components` so it can be reviewed and reused.

7. No unsolicited copy.
   Do not add titles, subtitles, helper text, descriptive paragraphs, placeholder storytelling text, or marketing copy unless the user explicitly asks for that content.
   Default behavior: keep only strictly functional labels required for interaction.

8. Theme compatibility is mandatory.
   Any new or edited UI must work in both light and dark modes using the existing theme system.
   - Do not ship components that only render correctly in one theme.
   - Do not bypass theme variables with fixed colors.
   - Theme switching must not break contrast, borders, focus ring, or interactive states.

## Mobile reusable component inventory

For `APP/mobile`, always consider these components before creating new UI:

- `AppButton` for primary reusable actions.
- `SurfaceCard` for bordered/surface containers.
- `MediaPreview` for image/video previews.
- `BottomMainMenu` for bottom navigation.
- `HorizontalSubMenu` for local tab/submenu navigation.
- `SectionHeader` for section headers and back affordances.
- `StatusBadge` for status chips and semantic state labels.
- `EventListCard` for event list rows/cards.
- `EventQuickActions` for event action grids.
- `EventAnalyticsTab` for event analytics panels.
- `CopyActionButton` for copy actions.
- `ShareMenuButton` for share menus.
- `ProtectedButton`, `ProtectedView`, and `ProtectedScreen` for permission-gated UI.

## Mobile layout rules

For `APP/mobile` UI work:

1. Use `tokens.spacing` for margins, padding, gaps, scroll padding, and section rhythm.
2. Use `tokens.radius` for all border radii.
3. Use `tokens.typography` for font sizes unless a screen already has a deliberate local exception.
4. Use `getTheme(mode)` and passed `theme` values for color decisions.
5. Do not create custom `Pressable` buttons when `AppButton` or an existing action component fits.
6. Do not create custom card containers when `SurfaceCard` fits.
7. Do not duplicate badges, status pills, menus, event cards, media previews, share buttons, or permission wrappers.
8. Preserve safe-area behavior, bottom-menu clearance, and scroll bottom padding so content is not hidden by navigation.
9. Keep screen horizontal padding consistent with the current screen family; prefer token scale changes over isolated numeric offsets.
10. Avoid changing global density or component spacing unless the task explicitly asks for a broader redesign.

## Anti-regression rules

Before changing existing UI:

1. Identify reusable components already used by the touched screen.
2. Search with `rg` for every shared component being edited and inspect affected call sites.
3. Prefer local screen changes over shared component changes unless the behavior should change globally.
4. Preserve navigation behavior, permission gates, loading states, empty states, error states, and existing API flows.
5. Do not replace working components with new one-off UI for purely visual changes.
6. If changing a shared component, validate each impacted screen at least by static inspection and tests/lint when available.
7. Keep existing event, account, authentication, and permission behavior intact unless the task explicitly changes it.

## Workflow

For every UI task:

1. Determine whether the target is `WEB/front` or `APP/mobile`.
2. Inspect existing tokens and reusable components first.
3. Decide whether the request fits an existing primitive or domain component.
4. If not, create or extend a reusable component in the correct layer.
5. Wire styling through existing tokens and semantic theme variables.
6. For web primitives, add a showcase block in `/ui-components`.
7. For mobile shared components, update or add the closest available screen usage for review.
8. Check touched files for hardcoded UI values before finishing.
9. Check touched UI for unsolicited copy; remove any non-requested descriptive text.
10. Verify touched UI in both light and dark themes by implementation review or runtime inspection.

## Required checks before finishing

Run a search on touched UI files for hardcoded values such as:
- hex colors
- rgb/rgba
- color-mix
- ad hoc box-shadow/elevation
- ad hoc border radius
- arbitrary margins, padding, gaps, or positioning values outside the token scale

If found:
- replace with tokens, theme values, or semantic variables, or
- if truly blocked, keep only as temporary and mark the affected UI with `comp_hardcode`.

## Current source of truth

Use these as source of truth for web:
- `WEB/front/src/design-system/tokens/value.tokens.json`
- `WEB/front/src/design-system/tokens/light.tokens.json`
- `WEB/front/src/design-system/tokens/dark.tokens.json`
- `WEB/front/src/design-system/components`
- `WEB/front/src/design-system/ui.css`
- `WEB/front/src/design-system/portal.tsx`

Use these as source of truth for mobile:
- `APP/mobile/src/design-system/tokens.ts`
- `APP/mobile/src/design-system/theme.ts`
- `APP/mobile/src/design-system/components/AppButton.tsx`
- `APP/mobile/src/design-system/components/SurfaceCard.tsx`
- `APP/mobile/src/design-system/components/MediaPreview.tsx`
- `APP/mobile/src/components`

## Output standard

When completing UI work, explicitly state:
- whether reusable components were used
- whether any `comp_hardcode` labels remain
- which reusable components were added or extended
- which screens or pages were impacted
- whether light/dark mode was verified
- which tests, lint checks, or visual checks were run
