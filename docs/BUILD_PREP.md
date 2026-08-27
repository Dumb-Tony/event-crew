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
- [x] Replace graybox/cardboard presentation with the approved Municipal Workwear + Living Blueprint + Storybook Warmth visual target.
- [ ] Record completion, overload count, moves, and time-to-ready locally.
- [ ] Run five observed first-time sessions and tune from evidence.

### P2 — test systemic breadth

- [ ] Add rain as one legible modifier: forecast → warning → wet zones → safe response.
- [x] Add a usable dolly with heavy-carry and fragile-cargo benefits; momentum/stacking remain deferred.
- [x] Add a fragile cake with damage feedback, requirement state, and toast consequence.
- [x] Add a selectable wind-advisory contract with forecast, advance warning, two gusts, and physical sandbag prevention.
- [x] Persist completed shifts, best rank/readiness, and cumulative overloads in local browser storage.
- [x] Add a selectable client change-order brief with warning, changed chair marks, and stale-checklist behavior.
- [x] Surface the device-local crew record on the briefing screen.
- [x] Track best rank per contract combination and show a causal event timeline in the debrief.
- [x] Add standard Gamepad API movement/actions with a tested analog deadzone.
- [ ] Add a randomized “client changed the aisle” variation.
- [x] Add an authored “client changed the aisle” variation; randomization remains deferred until tuning proves both layouts.
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
- [ ] G attaches/parks the dolly and changes heavy/fragile carry behavior.
- [ ] Rough cake drops and unprotected live-event crowd bumps reduce condition; the dolly prevents crowd-bump damage.
- [ ] Wind advisory adds two tie-point requirements and unsecured gusts move the arch off its client mark.
- [ ] Completing a shift updates local career history without affecting clean restart state.
- [ ] Debrief timeline contains doors-open state and all three cue outcomes in causal order.

### Experience and accessibility

- [ ] Primary task and deadline are readable at first glance.
- [ ] Item silhouettes remain distinguishable without relying only on color.
- [ ] Real objects remain visually distinct from cyan blueprint targets at setup and during the live event.
- [ ] Cables, plugs, breaker status, carried-item highlight, and tripped-power blackout remain legible against every venue surface.
- [ ] Staging asphalt, venue floor, landscaping, and access aisle read as separate physical spaces without requiring labels.
- [ ] Warm live-event lighting preserves requirement and interaction contrast.
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

- `game.js`: add subtle foliage, fabric, and powered-equipment animation; keep motion optional under reduced-motion settings.
- `game.js`: add visual variants for guest outfits, floral arrangements, and table dressing without changing collision footprints.
- `game.js`: count overloads/interactions; isolate input edge events; add recovery behavior for guests trapped between multiple blockers.
- `game.js` → `src/data/wedding.js`: extract zone, equipment, deadline, and requirement definitions.
- `game.js` → `src/data/wedding.js`: extract authored scenario, cue, and equipment data.
- `game.js`: extract phase/cue transition functions for deterministic tests.
- `tests/`: add snap-boundary, overload/reset, and cue-timing coverage.
- `GDD.md`: update scope, controls, and decisions whenever behavior changes.

## Manual test scenarios

Append `?qa=1` to the local or Pages URL to reduce setup to two seconds while preserving the complete 22-second live-event cue sequence.

1. **Perfect:** place all layout objects, power sound only, inspect, wait; expect 10/10 and top result.
2. **Power mistake:** power sound and lights; expect trip, darkness, reset path; reconnect sound; expect recovery.
3. **No setup:** wait out clock; guests still enter; expect poor result.
4. **Unverified:** complete layout and sound but never press E; expect readiness but lower narrative result.
5. **Late drop:** hold an object as time expires; expect it to remain where deadline caught it and event to continue.
6. **Blocked aisle:** leave a table in the marked access aisle; expect guests to steer around it, radio feedback to identify the cause, and a nonzero detour count.
7. **Cake run:** rough-drop the cake three times; expect condition to reach zero, the requirement to remain incomplete, and toast cue failure even on correct placement.
8. **Protected cargo:** take the dolly, carry the cake through the live crowd, and verify proximity does not damage it.
9. **Wind prevention:** choose Wind Advisory, secure both arch tie points, and expect both gusts to leave a correctly placed arch unchanged.
10. **Wind recovery:** leave the arch unsecured through the first gust, then replace and tie it before the second gust; expect only one displacement.
11. **Change order:** choose Pending Change Order, verify early, and wait for the new plan; expect chair marks to move, verification to clear, and the HUD to show PLAN B.

## Definition of done for next milestone

M1 is done when all P0 items are checked, acceptance criteria pass in a browser, automated rule tests cover the core state transitions, and at least three novice playtests produce no unrecoverable confusion. Update the living GDD with measured completion times and resulting tuning decisions.
