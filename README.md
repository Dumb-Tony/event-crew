# EVENT CREW

A stylized 3D browser prototype and living design package for a cooperative event-setup game.

> **Play online:** https://dumb-tony.github.io/event-crew/

**Source and design:** https://github.com/Dumb-Tony/event-crew

## Play

Use the permanent online link above, or serve the folder with any simple static web server for local development. No installation, build command, account, CDN, or runtime network request is required; direct `file://` opening is not supported because the 3D renderer uses standard JavaScript modules.

- Move: WASD or arrow keys
- Pick up or drop: Space
- Connect power or reset breaker: F
- Take or park the dolly: G
- Inspect client requirements: E
- Pause/resume: P
- Toggle sound: M
- Restart the shift: R

Standard gamepads are supported: left stick moves; south face carries/drops; west face powers/resets; east face takes/parks the dolly; north face checks requirements; Start pauses; Select toggles sound.

The setup deadline is three minutes. The wedding begins when it expires, whether the venue is ready or not.

## Project map

- `index.html` — game shell, brief, HUD, and debrief
- `styles.css` — responsive industrial/event-crew presentation
- `game.js` — input, state, simulation, rule evaluation, guests, and renderer coordination
- `render3d.js` — stylized low-poly WebGL venue, characters, equipment, lighting, shadows, and follow camera
- `vendor/` — pinned Three.js runtime and its MIT license; no CDN is required while playing
- `docs/GDD.md` — living game design document, decisions, scope, architecture, milestones, and next work
- `docs/BUILD_PREP.md` — prioritized backlog, acceptance criteria, QA checklist, and file-level tasks

## Setup workaround

An initial project setup route was unavailable in the workspace. Because the requested first deliverable explicitly favors plain HTML/CSS/JavaScript with no build step, the project was recovered as a static site instead of retrying a framework scaffold. The pinned 3D runtime is committed under `vendor/`, keeping the player build portable and eliminating installs, CDNs, and build tooling. The GDD identifies the later Unity migration path.

## Repository and deployment policy

`C:\Dev\event-crew` is the canonical local project. The public GitHub repository is named `event-crew`, uses `main` as its primary branch, and publishes the root-level static prototype through GitHub Pages. The permanent playtest address is always `https://dumb-tony.github.io/event-crew/`; release IDs and cache-busting query strings must not be presented as new play links. Design decisions and implementation changes must update `docs/GDD.md` in the same commit when they affect the living design. Do not commit credentials, local settings, generated files, or machine-specific data.

## Current slice

The implemented loop includes delivery staging, weighted carrying, a usable dolly, a damageable wedding cake, forgiving target snapping, six chairs, two tables, an arch, movable sound and decorative-light equipment, a 15A circuit and resettable breaker, requirement verification, a hard guest-arrival deadline, and a continuously playable live wedding. Procession, vows, and toast cues judge the state of the venue when each moment occurs; players can keep working through the crowd to rescue later cues. The debrief grades arrival readiness, live cues, overloads, crowd detours, and late fixes, then explains the decisive events in a causal timeline and updates the best rank for that contract combination.

The prototype includes generated interaction/cue sounds, pause and mute controls, clear-skies and wind-advisory contracts, approved-plan and mid-shift change-order briefs, an optional five-minute relaxed shift, solid collision, visible local career records, pure-rule tests, and no build step. Known boundaries: keyboard-first controls, no networked persistence, no multiplayer, lightweight authored physics, and one venue with combinable contract variations. Those omissions are prioritized in `docs/BUILD_PREP.md` rather than hidden as implied functionality.

The current visual target blends municipal workwear, contextual blueprint guidance, and storybook wedding warmth. The venue is now a true low-poly 3D WebGL scene with an orthographic follow camera, modeled crew and guests, real geometry for every movable object, directional lighting, cast shadows, raised architecture, a parked crew van, landscaped beds, wooden flooring, powered materials, physical cable tubes, and contextual placement projections. The rendering runtime is pinned in the repository, so the permanent Pages build remains self-contained with no CDN dependency or build step.

Run the core rule checks with `node tests/rules.test.js`.
