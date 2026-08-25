# EVENT CREW — Build Preparation

## Prioritized prototype backlog

### P0 — prove the loop

- [x] Static browser entry point with no build step.
- [x] Keyboard movement and carry/drop interaction.
- [x] Wedding item set and readable target layout.
- [x] Real-time arrival deadline.
- [x] Circuit capacity, overload, visible breaker reset.
- [x] Requirement inspection and persistent HUD.
- [x] Live-event phase that uses the current world state.
- [x] Outcome copy and replay.
- [x] Collision between player, venue fixtures, and large equipment.
- [x] Contextual target outline and action label.
- [x] 30-second and 10-second arrival warning cues.
- [x] Continue crew control through the live event and evaluate three timed ceremony cues.
- [x] Separate carrying from power operation so powered equipment remains physical.
- [x] Forgiving snap placement and weighted carry speeds.

### P1 — make it testable and satisfying

- [x] Extract core geometry, load, readiness, and grade rules into a dependency-free module.
- [x] Add unit tests for core requirement, power, geometry, and grade logic.
- [x] Add placement magnetism without removing free placement.
- [x] Add pause, sound toggle, and extended-deadline option.
- [x] Add generated interaction, breaker, warning, and ceremony cue audio.
- [x] Add crowd avoidance and access-aisle hazard evaluation.
- [ ] Record completion, overload count, moves, and time-to-ready locally.
- [ ] Run five observed first-time sessions and tune from evidence.

### P2 — test systemic breadth

- [ ] Add rain as one legible modifier: forecast → warning → wet zones → safe response.
- [ ] Add dolly with momentum and stacked-chair capacity.
- [ ] Add fragile cake/decor item with damage feedback.
- [ ] Add a randomized “client changed the aisle” variation.
- [ ] Add a second circuit or generator choice.
- [ ] Add local two-player keyboard/controller experiment.

### Not before Unity graybox

- Network multiplayer, full 3D physics, account progression, matchmaking, Steam APIs, comprehensive town simulation, procedural venue generation, or production asset pipelines.

## Vertical-slice acceptance criteria

The first slice is accepted when:

1. A new player can start without reading external instructions and identify movement and interaction controls.
2. The job visibly begins with a three-minute deadline and cannot be paused by ignoring the brief.
3. All nine layout objects can be freely moved from staging to their targets.
4. Sound can be connected, lights can be connected, and connecting both exceeds 15A and trips the circuit.
5. A tripped circuit clearly communicates cause and can be reset at the breaker.
6. Checklist inspection reports missing categories and can be completed.
7. At zero, guests enter; the player does not receive an early binary failure.
8. Debrief changes for excellent, adequate, and poor configurations.
9. Restart fully restores the initial state.
10. Layout remains usable at 720px viewport width; keyboard focus is visible; critical state is not communicated by color alone.
11. No package install, compilation, account, or network connection is required.
12. No uncaught console errors occur during one complete setup/live/debrief/restart cycle.

## QA checklist

### Functional

- [ ] Start button dismisses brief and focuses play area.
- [ ] WASD and arrow keys move in all directions at equal normalized speed.
- [ ] Space prevents page scrolling and picks the nearest valid object.
- [ ] Held object follows player; second Space drops it.
- [ ] Each zone registers only its matching object.
- [ ] Circuit reads 8A for sound and 9A for lights.
- [ ] 17A trips breaker, disconnects both devices, and updates feedback.
- [ ] Breaker interaction restores readiness without silently reconnecting devices.
- [ ] E reports all currently missing requirement categories.
- [ ] Timer crosses setup to live exactly once.
- [ ] Player remains controllable during the live event and can change later cue outcomes.
- [ ] Procession, vows, and toast each evaluate once at their scheduled timestamp.
- [ ] Guests continue even with zero completed requirements.
- [ ] Large misplaced items in the access aisle cause visible guest detours and increase the debrief counter.
- [ ] Each result tier is reachable.
- [ ] R and result button produce identical clean initial states.
- [ ] P freezes both setup/live clocks and Resume restores input focus.
- [ ] F handles power without preventing unpowered speaker/light pickup.

### Experience and accessibility

- [ ] Primary task and deadline are readable at first glance.
- [ ] Item silhouettes remain distinguishable without relying only on color.
- [ ] Requirement completion has icon/text feedback as well as color.
- [ ] Circuit trip has world, meter, and radio feedback.
- [ ] Canvas has an accessible label and visible keyboard focus.
- [ ] UI does not overlap the game at 1280×720, 1024×768, or 720×900.
- [ ] Reduced-motion preference removes nonessential transitions.
- [ ] A first-time player can explain why power failed.
- [ ] A first-time player can recover from the overload without outside help.

### Regression targets after modularization

- Pure requirement tests for 0/partial/all targets.
- Boundary tests at 15A and 16A.
- Phase transition at exactly 0 seconds.
- Restart deep-reset test.
- Verification-before/after-placement behavior.

## File-level next tasks

- `game.js`: count overloads/interactions; isolate input edge events; add recovery behavior for guests trapped between multiple blockers.
- `game.js` → `src/data/wedding.js`: extract zone, equipment, deadline, and requirement definitions.
- `game.js` → `src/data/wedding.js`: extract authored scenario, cue, and equipment data.
- `game.js`: extract phase/cue transition functions for deterministic tests.
- `tests/`: add snap-boundary, overload/reset, and cue-timing coverage.
- `GDD.md`: update scope, controls, and decisions whenever behavior changes.

## Manual test scenarios

1. **Perfect:** place all layout objects, power sound only, inspect, wait; expect 10/10 and top result.
2. **Power mistake:** power sound and lights; expect trip, darkness, reset path; reconnect sound; expect recovery.
3. **No setup:** wait out clock; guests still enter; expect poor result.
4. **Unverified:** complete layout and sound but never press E; expect readiness but lower narrative result.
5. **Late drop:** hold an object as time expires; expect it to remain where deadline caught it and event to continue.
6. **Blocked aisle:** leave a table in the marked access aisle; expect guests to steer around it, radio feedback to identify the cause, and a nonzero detour count.

## Definition of done for next milestone

M1 is done when all P0 items are checked, acceptance criteria pass in a browser, automated rule tests cover the core state transitions, and at least three novice playtests produce no unrecoverable confusion. Update the living GDD with measured completion times and resulting tuning decisions.
