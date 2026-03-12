# TODO-035 Workspace Home Control Plane Surface

- Priority: `P1`
- Execution Band: `NEXT`
- Status: `ACTIVE`
- Owner Lane: `Workspace Surface Agent`
- Cluster: `Workspace / control plane UI`

## Goal

Turn the authenticated root workspace into the first operator-facing control-plane surface over graph, queue, and assistant state.

## Why Now

The operator already wants `/` to feel like a real home surface instead of a static landing or an automatic jump into the vault. Once `TODO-012` clarified the control-plane model, the next UI step is to expose that model through a bounded workspace home.

## Scope

- `app/page.tsx`
- `components/home/*`
- `components/AppNav.tsx`
- `app/vault/*`
- relevant control-plane read surfaces under `app/api/*`

## Non-Goals

- no full redesign of the entire vault interface
- no 3D graph or large visualization program in this packet
- no deep auth refactor beyond what the workspace home needs to render safely

## Deliverables

- one authenticated workspace home shell at `/`
- one composition of graph, queue, and assistant-facing surfaces that reads as a personal operating desk
- one clear separation between guest landing and authenticated workspace

## Dependencies

- soft: `TODO-012`
- soft: `TODO-034` if workspace should read task or delegation projections directly

## Entry Checklist

- preserve guest landing behavior for non-authenticated users
- treat workspace as a composition lens, not as the owner of every subsystem
- keep the first surface intentionally small and legible

## Implementation Plan

1. Define the first workspace-home composition.
2. Bind it to the current authenticated root route.
3. Connect the smallest useful control-plane previews.

## Progress Update

- The authenticated `/` route now has the first workspace shell and a minimal home grid pass is in motion.
- The current slice intentionally stays small: `Grid`, `2D Graph`, search, sort, branch toggle, and vault-style type or tier filters land first before assistant chat or richer control-plane overlays.
- The home surface still composes existing vault primitives instead of creating a detached second vault runtime.
- The workspace header is now its own UI behavior layer so brand and profile can hide on downward scroll and reappear on upward scroll without coupling that behavior to the browse state.
- `Refine` is now its own workspace control surface rather than a growing row of chips, so sort, type, tier, and hub/atomic filtering can evolve without turning the main toolbar into cockpit noise.
- Grid selection now lives as its own lightweight layer over the shared browse state: individual capsules can be selected without breaking card navigation, the current selected count stays visible, and export opens only when at least one capsule is selected.
- Grid selection now survives sort changes, so the operator can keep building a deliberate export set while reordering the same visible capsule surface instead of losing the current selection every time the browse order changes.
- Grid selection is now tracked against stable branch-local `capsule_id` membership instead of the current rendered order, so selection state can survive reorder passes and remain usable as the operator keeps shaping one export set over the same workspace corpus.
- Grid selection is now also persisted per branch within the current browser session, so benign UI remounts or sort-driven browse reshaping should not silently discard the operator's current export set while they are still working inside the same branch surface.
- Export now supports two bounded modes on the home surface: one JSON bundle or a file-set path that stays separate for small selections but upgrades to a ZIP archive for larger selections, with the single-capsule path downloading directly without an extra menu.
- Search on the home surface now has explicit mode semantics: `Grid` uses it as a result filter, while `2D Graph` keeps the broader filtered graph intact and treats the same query as `find + focus`, including an in-graph search overlay during fullscreen mode.
- Graph search no longer blanks the graph on zero text matches, and automatic camera focus now stays bounded to the single-match case instead of silently selecting an arbitrary capsule and opening its preview.
- Graph search is now evolving toward exact-match autofocus plus explicit suggestion-driven focus: clearing the query returns the viewport to `Fit to Screen`, while the shared graph search surface can surface clickable capsule candidates without turning search focus into a forced selected-preview state.
- Suggestion hover and click now belong to that same graph-search loop: candidate rows can request focus directly, `Escape` clears the graph query, and focus retries stay resilient while the force-layout is still settling node coordinates.
- The graph search suggestions now also drive the graph match-set itself, so hover or click focus no longer drifts away from the visible candidate list, and clearing the graph query can explicitly clear manual selected-preview state before returning the viewport to fit.
- The shared suggestion list now also supports keyboard traversal, so the graph-search loop is not mouse-dependent: moving through candidates can advance focus without committing selection, while a later explicit confirm action can still reuse the same candidate list.
- Suggestion hover and explicit open are now separated: hover keeps acting as temporary graph focus, while click or keyboard confirmation can promote the same candidate into a real graph selection with preview and detail affordances.
- The graph suggestion surface now treats keyboard and mouse interaction consistently: traversal keeps the live focus moving without committing, while explicit open hides the suggestion list but preserves the query until the operator clears it.
- Explicit open from the graph suggestion list now uses its own commit path: click or keyboard confirmation may clear the query after opening the capsule, but that clear should not accidentally trigger a `Fit to Screen` reset that cancels the just-opened selected preview.
- Once a graph capsule is actually selected, `Escape` should act as a clean exit from that local inspection state by clearing selection, dismissing preview, and restoring the graph to a fit view instead of leaving the camera stuck in a zoomed node posture.
- The graph suggestion list now also has a more deliberate scroll lane: the scrollbar hit area and gutter are wider, and hover-driven autofocus is briefly suppressed while the operator is actively scrolling so the list can move without accidentally walking focus across every visible candidate.
- Graph preview semantics are now split more cleanly: hover can keep using the local cursor-adjacent tooltip, while the static detail preview belongs only to an explicit selected capsule and should remain pinned even if the operator briefly hovers a different node.

## Acceptance Criteria

- authenticated `/` reads like a personal workspace, not a public landing page
- guest `/` remains a clear preview and pre-registration surface
- the home surface composes existing systems instead of inventing a detached dashboard

## Verification

- `npm run typecheck`
- targeted route or component checks chosen by the implementation

## Risks

- over-designing the home surface before the task projection bridge exists
- duplicating vault behavior instead of composing it

## Stop Conditions

- the packet turns into a whole-site redesign
- the home surface starts owning subsystem semantics instead of projecting them

## Handoff Note

Keep `/` narrow and composition-first. The next continuation point after this pass is a lightweight preview or inspector layer on top of the shared browse state, not a new control stack. `Grid` and `2D Graph` now already share search, sort, branch, and type or tier posture, while selection and export stay isolated as a grid-only layer instead of becoming global cockpit chrome.
