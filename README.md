# EVENT CREW

A dependency-free browser prototype and living design package for a cooperative event-setup game.

> **Play online:** GitHub Pages URL will be added here immediately after the public repository is connected and Pages is enabled.

## Play

Open `index.html` in a modern desktop browser. No installation, build command, account, or network connection is required.

- Move: WASD or arrow keys
- Pick up, drop, connect, or reset: Space
- Inspect client requirements: E
- Restart the shift: R

The setup deadline is three minutes. The wedding begins when it expires, whether the venue is ready or not.

## Project map

- `index.html` — game shell, brief, HUD, and debrief
- `styles.css` — responsive industrial/event-crew presentation
- `game.js` — input, state, simulation, rule evaluation, guests, and canvas rendering
- `docs/GDD.md` — living game design document, decisions, scope, architecture, milestones, and next work
- `docs/BUILD_PREP.md` — prioritized backlog, acceptance criteria, QA checklist, and file-level tasks

## Setup workaround

An initial project setup route was unavailable in the workspace. Because the requested first deliverable explicitly favors plain HTML/CSS/JavaScript with no build step, the project was recovered as a static, package-free site instead of retrying a framework scaffold. This is now an intentional prototype constraint: it keeps the slice portable and removes installer risk. The GDD identifies the point at which modularization and a later Unity migration become worthwhile.

## Repository and deployment policy

`C:\Dev\event-crew` is the canonical local project. The public GitHub repository is named `event-crew`, uses `main` as its primary branch, and publishes the root-level static prototype through GitHub Pages. Design decisions and implementation changes must update `docs/GDD.md` in the same commit when they affect the living design. Do not commit credentials, local settings, generated files, or machine-specific data.

## Current slice

The implemented loop includes delivery staging, free item placement, six chairs, two tables, an arch, sound and decorative-light power loads, a 15A circuit and resettable breaker, requirement verification, a hard guest-arrival deadline, a live-event crowd phase, graded outcome text, and full restart.

Known boundaries: keyboard-first controls, no sound, no collision/physics, no persistence, no networking, and only one authored wedding job. Those omissions are prioritized in `docs/BUILD_PREP.md` rather than hidden as implied functionality.
