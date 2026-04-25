---
name: viralco-ui-guardrails
description: Enforce ViralCo frontend UI guardrails when building or editing interfaces in the ViralCo project. Use this for any new page, component, dashboard, form, table, card, modal, tooltip, chart wrapper, or reusable UI work in frontend. Requires using existing design-system tokens and reusable components first, forbids hardcoded UI values, and mandates marking unresolved one-off UI with a comp_hardcode label.
---

Use this skill for any UI work in `frontend` of the ViralCo project.

## Mandatory rules

1. Reuse before creating.
   Use existing reusable UI from:
   - `src/design-system/components`
   - `src/design-system/tokens`
   - `src/design-system/ui.css`
   - `src/design-system/portal.tsx`

2. Tokens first.
   Never hardcode colors, spacing, radius, elevation, focus rings, or semantic states in component code or CSS.
   Always map UI values to existing tokens or CSS variables derived from those tokens.

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
   then do not ship it as loose one-off UI first.
   Create or extend a reusable design-system component and expose it in `/ui-components`.

5. Hardcoded exception marker.
   If a screen must temporarily ship before the reusable component exists, mark the hardcoded area with a visible label.
   Requirements:
   - text: `comp_hardcode`
   - position: `absolute`
   - corner: top left
   - must be clearly visible
   - use token-based colors only

6. `/ui-components` is the contract.
   Any new reusable UI primitive must be demonstrated in `/ui-components` so it can be reviewed and reused.

## Workflow

For every UI task:

1. Inspect existing tokens and reusable components first.
2. Decide whether the request fits an existing primitive.
3. If not, create a reusable primitive in `src/design-system/components`.
4. Wire styling through existing tokens and semantic CSS variables.
5. Add a showcase block in `/ui-components`.
6. Check touched files for hardcoded UI values before finishing.

## Required checks before finishing

Run a search on touched frontend files for hardcoded UI values such as:
- hex colors
- rgb/rgba
- color-mix
- ad hoc box-shadow
- ad hoc border radius
- arbitrary spacing values outside the token scale

If found:
- replace with tokens or semantic variables, or
- if truly blocked, keep only as temporary and mark the affected UI with `comp_hardcode`.

## Current source of truth

Use these as source of truth:
- `src/design-system/tokens/value.tokens.json`
- `src/design-system/tokens/light.tokens.json`
- `src/design-system/tokens/dark.tokens.json`
- `src/design-system/components`
- `src/design-system/ui.css`
- `src/design-system/portal.tsx`

## Output standard

When completing UI work, explicitly state:
- whether only reusable components were used
- whether any `comp_hardcode` labels remain
- which reusable components were added or extended
