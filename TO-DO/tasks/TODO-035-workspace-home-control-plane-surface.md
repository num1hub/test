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
- Grid, detail, and `2D Graph` now share one capsule palette resolver so the same capsule families read with the same accent language across cards, previews, and graph nodes instead of drifting by surface.
- CapsuleOS foundation surfaces now decompose into distinct color families inside that shared resolver, so the live graph can distinguish core, law, gates, runtime, taxonomy, status, and protocol surfaces by shade instead of one flat foundation color.
- `2D Graph` link rendering is now intentionally quieter in the idle state: inactive links are dimmer, arrows appear only on active focus paths, and the force layout settles faster to reduce visual noise and improve laptop FPS.
- Workspace now has an `Index` mode alongside `Grid` and `2D Graph`, so the operator can scan capsules as a compact memory list instead of only as cards or graph nodes.
- The current workspace view is now persisted per architect profile in the browser, so `capsule.person.egor-n1.v1` can keep a stable visual working posture instead of resetting every visit.
- The shared palette now also carries named memory tones such as `Archive Gold`, `Ember`, `Sea Teal`, `Cobalt`, and `Copper`, so color reads as a repeatable operator language rather than a pile of hex accents.
- That palette language now also extends across the broader vault instead of stopping at a few major hubs: identity, governance, economics, knowledge, spatial, control, and origin surfaces now have their own stable family accents.
- Capsule cards, detail view, the index rows, and graph overlays now also expose short family sigils such as `OS`, `LW`, `GT`, `AI`, `PL`, and `DM`, so the operator can build faster visual memory than color alone would allow.
- The visual language now also carries family motifs and shape grammar derived from manifesto and hub reading, so capsules can be recognized by color, sigil, and repeated form together rather than by accent alone.
- Cards, index rows, detail headers, the legend, and graph nodes now share one repeatable family mark, which turns major capsule families into stable visual actors instead of plain tinted records.
- The shared visual system now also gives each capsule a stable personal faceprint derived from its `capsule_id`, so one capsule can be remembered inside a family rather than only as a generic family-colored node.
- The family resolver now covers more of the live vault directly, including `n1hub`, `graph-maintenance`, `key-agents`, `night-shift`, and core doctrinal origin surfaces, so the graph no longer collapses as much of the foundation layer into one undifferentiated fallback color.
- The workspace now also carries a per-operator `Visual Memory` profile and `Graph Quality` posture, so the same vault can be read with stronger mnemonic emphasis, cleaner architectural emphasis, or softer cinematic emphasis without changing runtime behavior.
- Remaining generic vault surfaces have been pushed further into explicit families such as `architecture`, `integration`, and runtime stewardship, so the operator can read more of the vault by visual clan instead of by fallback type color.
- The same per-operator visual posture now also spans the wider vault surface instead of stopping at the home grid: `Vault`, capsule detail, `2D Graph`, and `Settings` all read the same profile and graph-quality state through one shared browser-persisted hook.
- The visual-language packet now has explicit persistence coverage, so profile or quality posture is not only a UI nicety but a tested personal working memory surface tied to the architect profile key.
- The visual-memory language now also carries `rank`, `silhouette`, and `hierarchy depth`, so major capsule families read by outer contour as well as by color. Law, gates, runtime, habitat, swarm, and interface surfaces now separate faster in the graph even before text or sigils are consciously read.
- The graph now also projects capsule `presence` as a second-order memory cue: `Axis`, `Major Hub`, `Hub`, `Core`, and ordinary capsule surfaces differ in halo weight and selected-preview language, so the operator can feel structural importance before reading labels.
- Presence grammar is now shared outside the graph too: cards, detail view, index rows, and the legend all reinforce the same structural reading so the operator can learn one vault language instead of separate UI dialects.
- The visual marks now also carry hero treatment for structural gravity: `Axis`, `Major Hub`, and `Hub` capsules render with stronger beacon or contour language, so top-level vault actors feel visually distinct even before the operator reads their labels.
- Graph quality presets now also tune node dimming, hero-mark intensity, and a cinematic backdrop layer, so `2D Graph` can read as a calmer scene on a laptop instead of a flat dark canvas with equally loud nodes.
- Temporary Vercel Hobby deployment hardening is now in place: unauthenticated traffic is forced onto a locked root access gate, the old public guest landing is suspended from the deploy path, and credential entry is reserved for the private owner route rather than a public `/login` page.
- Legacy client-side route guards now also collapse back to `/` instead of `/login`, so the deploy posture is consistent across the root shell, workspace surfaces, branch tools, and project views.
- The settings surface now carries explicit deploy-backed auth guidance, so Vercel Hobby production no longer presents password mutation as if it were the canonical rotation path when credentials are env-backed.
- A bounded cookie-first auth normalization wave is now in place for the main vault, projects, activity, AI, settings, and key detail flows, so a valid session cookie no longer depends on a matching `localStorage` token just to keep major surfaces readable.
- That same bounded normalization now also covers secondary validation, version-history, import, batch, activity, add-to-project, AI wallet, and mint flows, so the remaining deploy posture is no longer split between cookie-auth pages and `localStorage`-gated modals.
- The remaining deploy-compatible auth tail is now explicitly narrow: only the architect gate still writes the legacy token for backward compatibility, settings still clears it on logout, and the rest of the active UI reads the shared client-auth helper instead of scattering `localStorage` checks through normal operator flows.
- Production deploy auth is now also fail-closed: the owner login route returns `503` when required Vercel Hobby auth env is incomplete, and the root access gate can surface a generic misconfiguration warning instead of pretending owner auth is available.
- The private owner link is now intended to be env-driven for deploys instead of living as a repo-hardcoded path, so the Hobby access surface can rotate without code changes and fail closed when the route segment is missing.
- The deploy posture now also has a safe public smoke-check route and a Vercel Hobby env template, so owner bring-up can confirm locked-root behavior without exposing the secret owner route segment in repo code or public docs.
- The deploy packet now also has a local preflight command and a dedicated Hobby rollout checklist, so single-owner bring-up is repeatable instead of living only in README prose.

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

Keep `/` narrow and composition-first. The next continuation point after this pass is a lightweight preview or inspector layer on top of the shared browse state, not a new control stack. `Grid` and `2D Graph` now already share search, sort, branch, type or tier posture, and one palette language, while selection and export stay isolated as a grid-only layer instead of becoming global cockpit chrome.
