"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const { clamp, distance, pointInRect, circleHitsRect, totalLoad, applyDeadzone, requirementScore, gradeJob } = EventCrewRules;
const ui = {
  start: document.getElementById("startScreen"), result: document.getElementById("resultScreen"),
  pause: document.getElementById("pauseScreen"),
  career: document.getElementById("careerText"),
  timer: document.getElementById("timer"), phase: document.getElementById("phaseLabel"),
  deadlineCaption: document.getElementById("deadlineCaption"), cue: document.getElementById("cueText"),
  reqs: document.getElementById("requirementsList"), score: document.getElementById("scoreText"),
  radio: document.getElementById("radioText"), hint: document.getElementById("hintText"),
  loadMeter: document.getElementById("loadMeter"), loadText: document.getElementById("loadText"),
  resultTitle: document.getElementById("resultTitle"), resultCopy: document.getElementById("resultCopy"),
  resultStats: document.getElementById("resultStats"), resultTimeline: document.getElementById("resultTimeline")
};

const keys = new Set();
const quickQa = new URLSearchParams(location.search).get("qa") === "1";
const world = { w: 960, h: 600, deadline: quickQa ? 2 : 180, ceremonyLength: 22 };
const colors = { chair: "#e8e0c6", table: "#a2734f", arch: "#ecd7ac", speaker: "#33383a", lights: "#b8a060", cake: "#f4d9df", dolly: "#c46f36", sandbag: "#6d6a58", cable: "#edb647" };
const aisle = { x: 310, y: 190, w: 230, h: 235 };
const fixedObstacles = [
  { x: 405, y: 478, w: 64, h: 92 },
  { x: 520, y: 175, w: 380, h: 10 },
  { x: 520, y: 330, w: 380, h: 10 }
];
let state;
let audioContext = null;
let soundOn = true;
let previousGamepadButtons = [];

function makeState(deadline = 180, windy = false, changeOrder = false) {
  const items = [];
  for (let i = 0; i < 6; i++) items.push({ id: `chair${i}`, kind: "chair", x: 80 + (i % 3) * 28, y: 390 + Math.floor(i / 3) * 36, w: 18, h: 18, held: false });
  items.push({ id: "table0", kind: "table", x: 85, y: 480, w: 52, h: 30, held: false });
  items.push({ id: "table1", kind: "table", x: 148, y: 480, w: 52, h: 30, held: false });
  items.push({ id: "arch", kind: "arch", x: 95, y: 545, w: 62, h: 20, held: false });
  items.push({ id: "speaker", kind: "speaker", x: 188, y: 545, w: 24, h: 30, held: false, amps: 8, powered: false });
  items.push({ id: "lights", kind: "lights", x: 226, y: 545, w: 30, h: 18, held: false, amps: 9, powered: false });
  items.push({ id: "cake", kind: "cake", x: 247, y: 480, w: 28, h: 28, held: false, fragile: true, durability: 3 });
  items.push({ id: "dolly", kind: "dolly", x: 270, y: 548, w: 25, h: 42, held: false, equipped: false });
  if (windy) {
    items.push({ id: "sandbag0", kind: "sandbag", x: 55, y: 545, w: 28, h: 17, held: false });
    items.push({ id: "sandbag1", kind: "sandbag", x: 58, y: 570, w: 28, h: 17, held: false });
  }
  return {
    phase: "brief", time: deadline, ceremonyTime: 0, paused: false, player: { x: 270, y: 450, r: 14, speed: 170, held: null, dolly: null },
    items, verified: false, fuseBlown: false, guests: [], particles: [], warnings: { thirty: false, ten: false },
    guestDetours: 0, tripHazards: 0, overloads: 0, interactions: 0, snaps: 0, liveFixes: 0,
    arrivalReadiness: 0, maxReadiness: windy ? 13 : 11, cakeBumpCooldown: 0, cues: { procession: null, vows: null, toast: null },
    weather: { windy, warned: false, gustOne: false, gustTwo: false },
    changeOrder: { enabled: changeOrder, warned: false, applied: false },
    eventLog: [],
    radio: "Foreman: Walk the site, then start unloading.", lastTime: 0
  };
}

const zones = [
  { id: "arch", kind: "arch", x: 710, y: 105, w: 110, h: 46, label: "ARCH" },
  { id: "table0", kind: "table", x: 700, y: 390, w: 90, h: 58, label: "TABLE" },
  { id: "table1", kind: "table", x: 812, y: 390, w: 90, h: 58, label: "TABLE" },
  { id: "speaker", kind: "speaker", x: 885, y: 215, w: 48, h: 64, label: "SOUND" },
  { id: "cake", kind: "cake", x: 790, y: 475, w: 74, h: 54, label: "CAKE" },
  { id: "sandbag0", kind: "sandbag", x: 685, y: 132, w: 34, h: 28, label: "TIE" },
  { id: "sandbag1", kind: "sandbag", x: 811, y: 132, w: 34, h: 28, label: "TIE" },
  ...Array.from({ length: 6 }, (_, i) => ({ id: `chair${i}`, kind: "chair", x: 560 + (i % 3) * 70, y: 245 + Math.floor(i / 3) * 58, w: 38, h: 38, label: String(i + 1) }))
];
const baseZonePositions = Object.fromEntries(zones.map(z => [z.id, { x: z.x, y: z.y, w: z.w, h: z.h }]));

function resetZones() {
  for (const zone of zones) Object.assign(zone, baseZonePositions[zone.id]);
}

function reset() { state = makeState(); updateUI(); }
function start() {
  const windy = document.getElementById("weatherMode").value === "wind";
  const changeOrder = document.getElementById("briefMode").value === "change";
  resetZones();
  state = makeState(document.getElementById("relaxedTime").checked ? 300 : world.deadline, windy, changeOrder);
  state.phase = "setup";
  ui.start.classList.add("hidden"); ui.result.classList.add("hidden"); ui.pause.classList.add("hidden");
  state.radio = windy ? "Forecast: strong gusts. Two sandbags are staged for the arch tie points." : changeOrder ? "Client says the seating plan may change. Stage cleanly and watch the radio." : "Foreman: Walk the site, then start unloading.";
  ensureAudio(); tone(180, .06, "square", .025); canvas.focus(); updateUI();
}

function requirementState() {
  const placed = Object.fromEntries(zones.map(z => [z.id, requirementStateForZone(z)]));
  const chairs = Array.from({ length: 6 }, (_, i) => placed[`chair${i}`]).filter(Boolean).length;
  const tables = [placed.table0, placed.table1].filter(Boolean).length;
  const arch = placed.arch;
  const speaker = state.items.find(i => i.id === "speaker");
  const cakeItem = state.items.find(i => i.id === "cake");
  const load = totalLoad(state.items);
  const audio = placed.speaker && speaker.powered && !state.fuseBlown;
  const cake = placed.cake && cakeItem.durability > 0;
  const sandbags = state.weather.windy ? [placed.sandbag0, placed.sandbag1].filter(Boolean).length : 0;
  const result = { chairs, tables, arch, audio, cake, sandbags, safePower: load <= 15 && !state.fuseBlown, load };
  result.complete = requirementScore(result);
  return result;
}

function update(dt) {
  if (state.paused) return;
  state.cakeBumpCooldown = Math.max(0, state.cakeBumpCooldown - dt);
  if (state.phase === "setup") {
    state.time = Math.max(0, state.time - dt);
    movePlayer(dt);
    if (!state.warnings.thirty && state.time <= 30) {
      state.warnings.thirty = true;
      state.radio = "Thirty seconds. The first guest car just turned into the drive.";
    }
    if (!state.warnings.ten && state.time <= 10) {
      state.warnings.ten = true;
      state.radio = "Ten seconds. Crew clear the aisle—guests are at the door.";
    }
    updateWeather();
    updateChangeOrder();
    if (state.time <= 0) beginCeremony();
  } else if (state.phase === "ceremony") {
    state.ceremonyTime += dt;
    movePlayer(dt);
    moveGuests(dt);
    runEventCues();
    if (state.ceremonyTime >= world.ceremonyLength) finish();
  }
  updateParticles(dt);
}

function updateChangeOrder() {
  if (!state.changeOrder.enabled) return;
  if (!state.changeOrder.warned && state.time <= 95) {
    state.changeOrder.warned = true; state.radio = "Client is reviewing the aisle width. Change order expected in 25 seconds.";
    addParticle(650, 210, "PLAN REVIEW", "#f0a33e"); tone(205, .12, "triangle", .03);
  }
  if (!state.changeOrder.applied && state.time <= 70) applyChangeOrder();
}

function applyChangeOrder() {
  state.changeOrder.applied = true;
  const positions = [
    [575,215],[720,215],[575,270],[720,270],[575,315],[720,315]
  ];
  for (let i=0;i<6;i++) { const z=zones.find(zone=>zone.id===`chair${i}`); z.x=positions[i][0]; z.y=positions[i][1]; }
  if (state.verified) state.verified = false;
  state.radio = "CHANGE ORDER: widen the center aisle. Chair marks updated; prior verification is void.";
  logEvent("Client moved all chair marks; verification cleared.", "bad");
  addParticle(650, 200, "LAYOUT CHANGED", "#e2634d"); tone(118, .3, "sawtooth", .045);
}

function updateWeather() {
  if (!state.weather.windy) return;
  if (!state.weather.warned && state.time <= 75) {
    state.weather.warned = true; state.radio = "Wind rising. Secure both arch tie points before the gust front hits.";
    addParticle(760, 90, "GUST INBOUND", "#f0a33e"); tone(135, .2, "triangle", .035);
  }
  if (!state.weather.gustOne && state.time <= 55) { state.weather.gustOne = true; applyWindGust("First gust"); }
  if (!state.weather.gustTwo && state.time <= 25) { state.weather.gustTwo = true; applyWindGust("Second gust"); }
}

function applyWindGust(name) {
  const r = requirementState(), arch = state.items.find(i => i.id === "arch");
  if (r.sandbags === 2 && r.arch) {
    state.radio = `${name}: the tied-down arch held.`; logEvent(`${name}: tied arch held.`, "good"); addParticle(765, 100, "SECURE", "#91bc68"); tone(480, .14, "sine", .035); return;
  }
  if (arch.held) { arch.held = false; state.player.held = null; }
  arch.x = clamp(arch.x + 78, 40, world.w - 40); arch.y = clamp(arch.y + 34, 60, world.h - 30);
  state.radio = `${name}: the unsecured arch was blown off its mark.`; addParticle(arch.x, arch.y, "ARCH MOVED", "#e2634d"); tone(88, .28, "sawtooth", .05);
  logEvent(`${name}: unsecured arch moved.`, "bad");
}

function movePlayer(dt) {
  let dx = Number(keys.has("ArrowRight") || keys.has("KeyD")) - Number(keys.has("ArrowLeft") || keys.has("KeyA"));
  let dy = Number(keys.has("ArrowDown") || keys.has("KeyS")) - Number(keys.has("ArrowUp") || keys.has("KeyW"));
  const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
  if (pad && !dx && !dy) { dx = applyDeadzone(pad.axes[0] || 0); dy = applyDeadzone(pad.axes[1] || 0); }
  if (dx || dy) { const n = Math.hypot(dx, dy); dx /= n; dy /= n; }
  const carrying = state.player.held ? carrySpeed(state.player.held.kind) : 1;
  const crowdSlow = state.phase === "ceremony" && state.guests.some(g => distance(g.x, g.y, state.player.x, state.player.y) < 30) ? .58 : 1;
  const speed = state.player.speed * carrying * crowdSlow;
  const nextX = clamp(state.player.x + dx * speed * dt, 24, world.w - 24);
  const nextY = clamp(state.player.y + dy * speed * dt, 45, world.h - 24);
  if (!playerBlocked(nextX, state.player.y)) state.player.x = nextX;
  if (!playerBlocked(state.player.x, nextY)) state.player.y = nextY;
  if (state.player.held) { state.player.held.x = state.player.x; state.player.held.y = state.player.y - 22; }
  if (state.player.dolly) { state.player.dolly.x = state.player.x; state.player.dolly.y = state.player.y + 25; }
  if (state.phase === "ceremony" && state.player.held?.fragile && !state.player.dolly && state.cakeBumpCooldown <= 0 && state.guests.some(g => distance(g.x, g.y, state.player.x, state.player.y) < 25)) {
    damageCake("A guest clipped the cake carrier in the crowd."); state.cakeBumpCooldown = 1.2;
  }
}

function carrySpeed(kind) {
  if (state.player.dolly) return kind === "chair" ? 1 : kind === "table" || kind === "arch" ? .84 : .9;
  return kind === "chair" ? .88 : kind === "speaker" || kind === "lights" ? .76 : kind === "cake" ? .56 : .62;
}

function playerBlocked(x, y) {
  const r = state.player.r;
  if (fixedObstacles.some(rect => circleHitsRect(x, y, r, rect))) return true;
  return state.items.some(item => !item.held && !item.equipped && itemIsSolid(item) && circleHitsRect(x, y, r, itemRect(item)));
}

function itemIsSolid(item) { return item.kind !== "chair"; }
function itemRect(item) { return { x: item.x - item.w / 2, y: item.y - item.h / 2, w: item.w, h: item.h }; }
function interact() {
  if (state.phase !== "setup" && state.phase !== "ceremony") return;
  const p = state.player;
  if (p.held) {
    dropHeldItem(); return;
  }
  const nearest = nearestItem(48);
  if (nearest && distance(p.x, p.y, nearest.x, nearest.y) < 48) {
    if (nearest.powered) { state.radio = `Disconnect the ${label(nearest.kind)} before moving it.`; tone(110, .08, "square", .025); return; }
    p.held = nearest; nearest.held = true; state.radio = `${label(nearest.kind)} in hand. Clear a path.`; updateUI(); return;
  }
  state.radio = "Nothing within reach."; updateUI();
}

function dropHeldItem() {
  const item = state.player.held;
  item.held = false; item.y += 20; state.player.held = null;
  const zone = zones.find(z => z.id === item.id);
  if (zone && distance(item.x, item.y, zone.x + zone.w / 2, zone.y + zone.h / 2) < Math.max(62, Math.max(zone.w, zone.h) * .72)) {
    item.x = zone.x + zone.w / 2; item.y = zone.y + zone.h / 2; state.snaps++;
    state.radio = `${label(item.kind)} locked to the client mark.`; addParticle(item.x, item.y, "READY", "#91bc68"); tone(520, .08, "sine", .035);
  } else {
    state.radio = `${label(item.kind)} placed off-plan. The client mark is still open.`; tone(190, .05, "triangle", .018);
    if (item.fragile) damageCake("The cake took damage from a rough off-plan drop.");
  }
  recordInteraction(); updateUI();
}

function damageCake(message) {
  const cake = state.items.find(i => i.id === "cake");
  if (!cake || cake.durability <= 0) return;
  cake.durability--;
  state.radio = cake.durability > 0 ? `${message} Cake condition: ${cake.durability}/3.` : `${message} The cake is now an abstract dessert.`;
  logEvent(`Cake condition fell to ${cake.durability}/3.`, "bad");
  addParticle(cake.x, cake.y, cake.durability > 0 ? `CAKE ${cake.durability}/3` : "CAKE RUINED", "#e2634d"); tone(95, .18, "sawtooth", .04);
}

function toolInteract() {
  if (state.phase !== "setup" && state.phase !== "ceremony") return;
  const dolly = state.items.find(i => i.id === "dolly");
  if (state.player.dolly) {
    dolly.equipped = false; dolly.x = state.player.x; dolly.y = state.player.y + 30; state.player.dolly = null;
    state.radio = "Dolly parked. Heavy carries are back to being heavy."; tone(145, .06, "square", .02); return;
  }
  if (distance(state.player.x, state.player.y, dolly.x, dolly.y) < 52) {
    dolly.equipped = true; state.player.dolly = dolly; state.radio = "Dolly attached. Heavy gear moves faster and fragile cargo is protected from crowd bumps."; tone(410, .08, "triangle", .025); recordInteraction();
  } else state.radio = "Move near the dolly to take it.";
}

function powerInteract() {
  if (state.phase !== "setup" && state.phase !== "ceremony") return;
  const p = state.player;
  if (state.fuseBlown && distance(p.x, p.y, 438, 525) < 48) {
    state.items.forEach(i => i.powered = false); state.fuseBlown = false;
    state.radio = "Breaker reset. Reconnect only the load the event needs."; addParticle(438, 500, "RESET", "#91bc68"); tone(240, .12, "square", .03); recordInteraction(); updateUI(); return;
  }
  const item = state.items.filter(i => i.amps && !i.held).sort((a,b) => distance(p.x,p.y,a.x,a.y)-distance(p.x,p.y,b.x,b.y))[0];
  if (!item || distance(p.x, p.y, item.x, item.y) >= 48) { state.radio = "No power control within reach."; return; }
  item.powered = !item.powered;
  const load = totalLoad(state.items);
  if (load > 15) {
    state.fuseBlown = true; state.overloads++; state.items.forEach(i => i.powered = false);
    state.radio = "POP! Circuit A overloaded. Everything on the line went dark."; addParticle(438, 500, "OVERLOAD", "#e2634d"); tone(72, .35, "sawtooth", .055);
    logEvent("Circuit A overloaded; connected gear went dark.", "bad");
  } else {
    state.radio = `${label(item.kind)} ${item.powered ? "connected" : "disconnected"}. Circuit draw: ${load} amps.`;
    tone(item.powered ? 330 : 170, .07, "square", .025);
  }
  recordInteraction(); updateUI();
}

function recordInteraction() { state.interactions++; if (state.phase === "ceremony") state.liveFixes++; }
function nearestItem(range = Infinity) {
  const p = state.player;
  const item = state.items.filter(i => !i.held && i.kind !== "dolly").sort((a,b) => distance(p.x,p.y,a.x,a.y)-distance(p.x,p.y,b.x,b.y))[0];
  return item && distance(p.x, p.y, item.x, item.y) <= range ? item : null;
}

function inspect() {
  if (state.phase !== "setup" && state.phase !== "ceremony") return;
  const r = requirementState(); state.verified = true;
  const missing = [];
  if (!r.arch) missing.push("arch"); if (r.tables < 2) missing.push(`${2-r.tables} table${2-r.tables === 1 ? "" : "s"}`);
  if (r.chairs < 6) missing.push(`${6-r.chairs} chair${6-r.chairs === 1 ? "" : "s"}`); if (!r.audio) missing.push("sound"); if (!r.cake) missing.push("intact cake");
  if (state.weather.windy && r.sandbags < 2) missing.push(`${2-r.sandbags} arch tie${2-r.sandbags === 1 ? "" : "s"}`);
  state.radio = missing.length ? `Checklist: still missing ${missing.join(", ")}.` : "Checklist verified. We could almost look professional."; tone(missing.length ? 150 : 620, .09, "triangle", .025); recordInteraction(); updateUI();
}

function contextAction() {
  if (state.phase !== "setup" && state.phase !== "ceremony") return null;
  const p = state.player;
  if (p.held) return { type: "held", item: p.held, text: `SPACE drop ${label(p.held.kind)}` };
  const dolly = state.items.find(i => i.id === "dolly");
  if (!p.dolly && distance(p.x, p.y, dolly.x, dolly.y) < 52) return { type: "item", item: dolly, text: "G take dolly" };
  if (state.fuseBlown && distance(p.x, p.y, 438, 525) < 48) return { type: "breaker", x: 438, y: 525, text: "F reset breaker" };
  const nearest = nearestItem(48);
  if (nearest) {
    const powerText = nearest.amps ? ` • F ${nearest.powered ? "disconnect" : "connect"}` : "";
    return { type: "item", item: nearest, text: `SPACE ${nearest.powered ? "disconnect first" : `pick up ${label(nearest.kind)}`}${powerText}` };
  }
  return { type: "none", text: `${p.dolly ? "G park dolly • " : ""}SPACE carry • F power • E inspect • P pause` };
}

function beginCeremony() {
  state.phase = "ceremony";
  const r = requirementState();
  state.arrivalReadiness = r.complete;
  state.tripHazards = state.items.filter(i => itemIsSolid(i) && i.kind !== "dolly" && pointInRect(i.x, i.y, aisle)).length;
  for (let i = 0; i < 24; i++) state.guests.push({ x: -20 - i * 18, y: 220 + (i % 6) * 35, targetX: 535 + (i % 3) * 70, targetY: 245 + (Math.floor(i / 3) % 2) * 58, speed: 45 + (i % 4) * 4, seated: false, avoided: [] });
  if (state.tripHazards) state.radio = `Guests entering. ${state.tripHazards} large ${state.tripHazards === 1 ? "item is" : "items are"} still in the access aisle.`;
  else state.radio = r.complete >= 8 ? "Guests entering. Smile like this was always the plan." : "Guests entering. The event is now working around the setup.";
  addParticle(480, 70, "DOORS OPEN", "#f0a33e"); tone(220, .18, "square", .045);
  logEvent(`Doors opened at ${r.complete}/${state.maxReadiness} ready.`, r.complete >= state.maxReadiness - 1 ? "good" : "bad");
  updateUI();
}

function runEventCues() {
  const r = requirementState();
  if (state.cues.procession === null && state.ceremonyTime >= 4) {
    state.cues.procession = state.tripHazards === 0 && state.guestDetours < 4;
    state.radio = state.cues.procession ? "Processional moving cleanly. The aisle is doing its one job." : "Processional is bunching up around the equipment. Keep the route clear.";
    logEvent(state.cues.procession ? "Procession route stayed clear." : "Procession detoured around equipment.", state.cues.procession ? "good" : "bad");
    addParticle(610, 205, state.cues.procession ? "AISLE CLEAR" : "PROCESSION DELAY", state.cues.procession ? "#91bc68" : "#e2634d");
    tone(state.cues.procession ? 520 : 105, .18, "triangle", .04);
  }
  if (state.cues.vows === null && state.ceremonyTime >= 10) {
    state.cues.vows = r.audio;
    state.radio = state.cues.vows ? "Vows are live and audible. Hold the circuit." : "The officiant is speaking. The back row is reading lips.";
    logEvent(state.cues.vows ? "Vows reached the back row." : "Vows cue occurred without working sound.", state.cues.vows ? "good" : "bad");
    addParticle(760, 145, state.cues.vows ? "VOWS AUDIBLE" : "NO SOUND", state.cues.vows ? "#91bc68" : "#e2634d");
    tone(state.cues.vows ? 680 : 82, .26, state.cues.vows ? "sine" : "sawtooth", .045);
  }
  if (state.cues.toast === null && state.ceremonyTime >= 16) {
    state.cues.toast = r.tables === 2 && r.cake;
    state.radio = state.cues.toast ? "Reception tables and cake are ready for the toast." : "Toast incoming. Catering is improvising the dessert presentation.";
    logEvent(state.cues.toast ? "Toast had tables and an intact cake." : "Toast lacked tables or an intact cake.", state.cues.toast ? "good" : "bad");
    addParticle(800, 370, state.cues.toast ? "TOAST READY" : "NO TABLE", state.cues.toast ? "#91bc68" : "#e2634d");
    tone(state.cues.toast ? 590 : 120, .18, "triangle", .04);
  }
}

function moveGuests(dt) {
  for (const g of state.guests) {
    if (g.seated) continue;
    const dx = g.targetX - g.x, dy = g.targetY - g.y, d = Math.hypot(dx,dy);
    if (d < 5) { g.seated = true; continue; }
    const blocker = state.items.find(i => !i.held && !i.equipped && itemIsSolid(i) && circleHitsRect(g.x, g.y, 24, itemRect(i)));
    let steerX = dx / d, steerY = dy / d;
    if (blocker) {
      const awayX = g.x - blocker.x, awayY = g.y - blocker.y;
      const awayLength = Math.hypot(awayX, awayY) || 1;
      steerX += awayX / awayLength * 1.7;
      steerY += awayY / awayLength * 1.7;
      if (!g.avoided.includes(blocker.id)) {
        g.avoided.push(blocker.id);
        state.guestDetours++;
        if (state.guestDetours === 1) state.radio = `Guest traffic is diverting around the misplaced ${label(blocker.kind)}.`;
      }
    }
    const steerLength = Math.hypot(steerX, steerY) || 1;
    g.x += steerX / steerLength * g.speed * dt;
    g.y += steerY / steerLength * g.speed * dt;
  }
}

function finish() {
  state.phase = "result"; const r = requirementState();
  const cueScore = Object.values(state.cues).filter(Boolean).length;
  const grade = gradeJob({ readiness: state.arrivalReadiness, maxReadiness: state.maxReadiness, verified: state.verified, cueScore, detours: state.guestDetours, overloads: state.overloads });
  const titles = { S: "A suspiciously competent wedding.", A: "The client would actually rebook.", B: "The photos will be strategically cropped.", C: "Legally, it was still a wedding.", D: "Rookery County has a new cautionary tale." };
  const cueCopy = `${state.cues.procession ? "The procession flowed" : "The procession detoured"}, ${state.cues.vows ? "the vows were heard" : "the vows became mime"}, and ${state.cues.toast ? "the toast had tables" : "catering found a crate"}.`;
  ui.resultTitle.textContent = `${grade.rank} — ${titles[grade.rank]}`; ui.resultCopy.textContent = `${cueCopy} ${grade.label}.`;
  const record = saveCareer(grade.rank, state.arrivalReadiness);
  ui.resultStats.innerHTML = `<span>RANK<strong>${grade.rank}</strong></span><span>ARRIVAL READY<strong>${state.arrivalReadiness}/${state.maxReadiness}</strong></span><span>LIVE CUES<strong>${cueScore}/3</strong></span><span>OVERLOADS<strong>${state.overloads}</strong></span><span>DETOURS<strong>${state.guestDetours}</strong></span><span>CONTRACT BEST<strong>${record.contractBest}</strong></span>`;
  ui.resultTimeline.innerHTML = state.eventLog.slice(-7).map(event => `<li class="${event.status}">${event.text}</li>`).join("");
  ui.result.classList.remove("hidden"); updateUI();
}

function loadCareer() {
  try { return JSON.parse(localStorage.getItem("eventCrewCareer")) || { shifts: 0, bestRank: "—", bestReadiness: 0, totalOverloads: 0 }; }
  catch { return { shifts: 0, bestRank: "—", bestReadiness: 0, totalOverloads: 0 }; }
}
function contractKey() { return `${state.weather.windy ? "wind" : "clear"}-${state.changeOrder.enabled ? "change" : "approved"}`; }
function betterRank(a, b) { const order = ["S", "A", "B", "C", "D", "—"]; return order.indexOf(a) < order.indexOf(b); }
function saveCareer(rank, readiness) {
  const record = loadCareer(), order = ["S", "A", "B", "C", "D", "—"];
  record.shifts++; record.bestReadiness = Math.max(record.bestReadiness, readiness); record.totalOverloads += state.overloads;
  if (order.indexOf(rank) < order.indexOf(record.bestRank)) record.bestRank = rank;
  record.contracts ||= {}; const key = contractKey(); record.contracts[key] ||= { shifts: 0, bestRank: "—" };
  record.contracts[key].shifts++; if (betterRank(rank, record.contracts[key].bestRank)) record.contracts[key].bestRank = rank;
  try { localStorage.setItem("eventCrewCareer", JSON.stringify(record)); } catch { /* private storage may be unavailable */ }
  return { ...record, contractBest: record.contracts[key].bestRank };
}

function logEvent(text, status = "info") { state.eventLog.push({ text, status }); }

function updateUI() {
  const r = requirementState(); const shownTime = state.phase === "ceremony" ? Math.max(0, world.ceremonyLength - state.ceremonyTime) : state.time;
  const career = loadCareer();
  ui.career.textContent = career.shifts ? `LOCAL CREW RECORD • ${career.shifts} SHIFTS • BEST ${career.bestRank} • ${career.totalOverloads} TOTAL OVERLOADS` : "NO COMPLETED SHIFTS ON THIS DEVICE";
  ui.timer.textContent = `${String(Math.floor(shownTime / 60)).padStart(2,"0")}:${String(Math.floor(shownTime % 60)).padStart(2,"0")}`;
  ui.phase.textContent = state.paused ? "PAUSED" : state.phase === "ceremony" ? "LIVE" : state.phase === "result" ? "DONE" : "SETUP";
  ui.deadlineCaption.textContent = state.phase === "ceremony" ? "CEREMONY LIVE" : state.phase === "result" ? "SHIFT COMPLETE" : "UNTIL GUESTS";
  const nextCue = state.phase !== "ceremony" ? "PREP" : state.cues.procession === null ? "PROCESSION" : state.cues.vows === null ? "VOWS" : state.cues.toast === null ? "TOAST" : "WRAP";
  const briefFlag = state.changeOrder.enabled && !state.changeOrder.applied ? " • CHANGE PENDING" : state.changeOrder.applied ? " • PLAN B" : "";
  ui.cue.textContent = `CH. 4 • ${nextCue}${state.weather.windy ? " • WIND" : ""}${briefFlag}`;
  const cake = state.items.find(i => i.id === "cake");
  const reqs = [["Ceremony arch", r.arch], [`Chairs ${r.chairs} / 6`, r.chairs === 6], [`Tables ${r.tables} / 2`, r.tables === 2], ["Sound placed + powered", r.audio], [`Cake intact ${cake.durability} / 3`, r.cake], ["Final checklist verified", state.verified]];
  if (state.weather.windy) reqs.splice(1, 0, [`Arch ties ${r.sandbags} / 2`, r.sandbags === 2]);
  ui.reqs.innerHTML = reqs.map(([text,done]) => `<li class="${done ? "done" : ""}">${text}</li>`).join("");
  ui.score.textContent = `${r.complete} / ${state.maxReadiness} READY`;
  ui.radio.textContent = state.radio; ui.loadText.textContent = `${r.load} / 15A`; ui.loadMeter.style.width = `${Math.min(100, r.load / 15 * 100)}%`;
  ui.loadMeter.style.background = state.fuseBlown ? "#e2634d" : r.load > 12 ? "#f0a33e" : "#91bc68";
  const action = contextAction();
  ui.hint.textContent = state.phase === "result" ? "Shift complete." : action ? action.text : "P pause • R restart";
}

function draw() {
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0,0,world.w,world.h); drawGround(); drawZones(); drawPower();
  state.items.forEach(drawItem); state.guests.forEach(drawGuest); drawContextHighlight(); if (state.phase !== "result") drawPlayer(); drawParticles();
  if (state.weather.windy) drawWind();
  if (state.fuseBlown) { const dark=ctx.createLinearGradient(315,40,960,600);dark.addColorStop(0,"#162023aa");dark.addColorStop(1,"#080b0ddd");ctx.fillStyle=dark;ctx.fillRect(315,40,645,560); }
}

function drawGround() {
  const lawn=ctx.createLinearGradient(0,0,310,600);lawn.addColorStop(0,"#748d67");lawn.addColorStop(.55,"#5f7b59");lawn.addColorStop(1,"#47624a");ctx.fillStyle=lawn;ctx.fillRect(0,0,310,600);
  for(let y=0;y<600;y+=26){ctx.fillStyle=y%52===0?"#ffffff08":"#16291408";ctx.fillRect(0,y,310,13);}
  for(let i=0;i<26;i++){const x=(i*83)%300,y=(i*137)%330;ctx.fillStyle=i%3?"#d7dfbb20":"#f2d07d25";ctx.beginPath();ctx.arc(x,y,1.8+(i%2),0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="#273c2f";for(let x=12;x<300;x+=34){ctx.beginPath();ctx.arc(x,30+(x%3)*4,20,0,Math.PI*2);ctx.fill();ctx.fillStyle="#39563d";ctx.beginPath();ctx.arc(x-4,26,13,0,Math.PI*2);ctx.fill();ctx.fillStyle="#273c2f";}

  const staging=ctx.createLinearGradient(0,350,0,600);staging.addColorStop(0,"#756d60");staging.addColorStop(1,"#4d4b45");ctx.fillStyle=staging;ctx.fillRect(0,350,310,250);
  ctx.strokeStyle="#a59b8644";ctx.lineWidth=1;for(let x=18;x<310;x+=48){ctx.beginPath();ctx.moveTo(x,350);ctx.lineTo(x-34,600);ctx.stroke();}
  ctx.fillStyle="#232b27";ctx.fillRect(0,329,310,24);ctx.fillStyle="#f0a33e";ctx.fillRect(14,335,4,12);ctx.font="800 12px ui-monospace";ctx.fillText("DELIVERY / BAY 02",26,346);

  ctx.save();ctx.shadowColor="#10171399";ctx.shadowBlur=24;ctx.shadowOffsetX=-8;ctx.fillStyle="#686052";roundedRectPath(307,35,653,570,8);ctx.fill();ctx.restore();
  const floor=ctx.createLinearGradient(315,40,955,600);floor.addColorStop(0,"#ded5bd");floor.addColorStop(.55,"#c8bfa8");floor.addColorStop(1,"#afa991");ctx.fillStyle=floor;roundedRectPath(315,40,640,560,5);ctx.fill();
  ctx.strokeStyle="#8e89761f";ctx.lineWidth=1;for(let y=48;y<600;y+=28){ctx.beginPath();ctx.moveTo(315,y);ctx.lineTo(955,y);ctx.stroke();for(let x=340+(y%56?20:0);x<955;x+=88){ctx.beginPath();ctx.moveTo(x,y-28);ctx.lineTo(x,y);ctx.stroke();}}
  ctx.fillStyle="#ebe3ce99";ctx.fillRect(322,48,10,544);ctx.fillStyle="#7c796b";ctx.fillRect(310,40,8,560);

  ctx.fillStyle="#34483b";ctx.fillRect(518,171,384,16);ctx.fillRect(518,326,384,16);for(let x=530;x<895;x+=30){ctx.fillStyle=x%60?"#54704e":"#6d8358";ctx.beginPath();ctx.arc(x,174,10,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+7,180,8,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x,329,10,0,Math.PI*2);ctx.fill();}

  ctx.save();ctx.setLineDash([10,8]);ctx.strokeStyle="#f0a33e99";ctx.lineWidth=2;roundedRectPath(aisle.x,aisle.y,aisle.w,aisle.h,6);ctx.stroke();ctx.restore();
  drawPlate(326,397,147,20,"KEEP ACCESS CLEAR","#7b5b2d","#fff2ce");
  drawPlate(526,191,92,20,"CEREMONY","#3f5045","#f3ecd7");drawPlate(526,347,92,20,"RECEPTION","#3f5045","#f3ecd7");

  ctx.save();ctx.shadowColor="#1118";ctx.shadowBlur=10;ctx.shadowOffsetY=5;ctx.fillStyle="#354139";roundedRectPath(405,478,64,92,5);ctx.fill();ctx.restore();
  ctx.fillStyle="#536259";roundedRectPath(411,486,52,75,3);ctx.fill();ctx.strokeStyle="#8c9b90";ctx.stroke();ctx.fillStyle=state.fuseBlown?"#e2634d":"#91bc68";ctx.beginPath();ctx.arc(451,496,5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f0a33e";ctx.font="800 12px ui-monospace";ctx.fillText("15A",421,515);ctx.fillStyle="#d9dfd5";ctx.font="700 9px ui-monospace";ctx.fillText("CIRCUIT A",414,533);ctx.fillStyle="#1d2620";roundedRectPath(419,540,35,14,2);ctx.fill();ctx.fillStyle="#e9ecdf";ctx.fillText("RESET",423,551);

  ctx.strokeStyle="#48574b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(340,76);ctx.quadraticCurveTo(635,25,925,76);ctx.stroke();for(let x=365;x<925;x+=42){const live=state.phase==="ceremony"&&!state.fuseBlown;ctx.fillStyle=live?"#ffe7a8":"#9d9a85";if(live){ctx.shadowColor="#ffd47a";ctx.shadowBlur=10;}ctx.beginPath();ctx.arc(x,66+Math.sin(x*.025)*8,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
  if(state.phase==="ceremony"){const glow=ctx.createRadialGradient(735,235,20,735,235,300);glow.addColorStop(0,"#ffdca724");glow.addColorStop(1,"#ffdca700");ctx.fillStyle=glow;ctx.fillRect(315,40,640,560);}
}

function drawZones() {
  ctx.save();ctx.textAlign="center";ctx.font="800 9px ui-monospace";
  for(const z of zones){if(!state.items.some(i=>i.id===z.id))continue;const done=requirementStateForZone(z),c=done?"#79b867":"#59bfc5";ctx.fillStyle=done?"#79b86718":"#59bfc512";roundedRectPath(z.x,z.y,z.w,z.h,4);ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);const s=8;ctx.lineWidth=3;for(const [x,y,dx,dy] of [[z.x,z.y,1,1],[z.x+z.w,z.y,-1,1],[z.x,z.y+z.h,1,-1],[z.x+z.w,z.y+z.h,-1,-1]]){ctx.beginPath();ctx.moveTo(x+dx*s,y);ctx.lineTo(x,y);ctx.lineTo(x,y+dy*s);ctx.stroke();}ctx.fillStyle=done?"#3c6638":"#2c6d71";ctx.fillText(done?"✓":"+",z.x+10,z.y+13);ctx.fillText(z.label,z.x+z.w/2,z.y+z.h/2+3);}
  ctx.restore();
}

function requirementStateForZone(z) { const i=state.items.find(i=>i.id===z.id); return !!i && distance(i.x,i.y,z.x+z.w/2,z.y+z.h/2)<Math.max(z.w,z.h)*.48; }

function drawPower() {
  const outlet={x:466,y:505};for(const item of state.items.filter(i=>i.powered)){ctx.beginPath();ctx.moveTo(outlet.x,outlet.y);ctx.bezierCurveTo(outlet.x+70,item.y+45,item.x-65,item.y+25,item.x,item.y);ctx.strokeStyle="#2a2c27aa";ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle=colors.cable;ctx.lineWidth=3.5;ctx.stroke();ctx.fillStyle="#292d29";roundedRectPath(item.x-6,item.y-4,12,8,2);ctx.fill();}
}

function drawItem(i) {
  const bob=i.held?Math.sin(performance.now()*.012)*2-5:0;ctx.save();ctx.translate(i.x,i.y+bob);ctx.fillStyle="#1c251c44";ctx.beginPath();ctx.ellipse(3,9,Math.max(10,i.w*.55),Math.max(5,i.h*.28),0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#30372f";ctx.lineWidth=1.5;
  if(i.kind==="chair"){const g=ctx.createLinearGradient(-10,-10,10,10);g.addColorStop(0,"#fffaf0");g.addColorStop(1,"#c7c1ad");ctx.fillStyle=g;roundedRectPath(-10,-7,20,15,3);ctx.fill();ctx.stroke();ctx.fillStyle="#eee8d8";roundedRectPath(-10,-15,20,7,3);ctx.fill();ctx.stroke();ctx.fillStyle="#5d5649";ctx.fillRect(-9,8,3,7);ctx.fillRect(6,8,3,7);}
  else if(i.kind==="table"){ctx.fillStyle="#6f503b";ctx.beginPath();ctx.ellipse(2,7,22,9,0,0,Math.PI*2);ctx.fill();const g=ctx.createRadialGradient(-8,-7,2,0,0,30);g.addColorStop(0,"#f7eedf");g.addColorStop(1,"#bda995");ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,-2,29,17,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#d0a765";ctx.beginPath();ctx.arc(0,-5,4,0,Math.PI*2);ctx.fill();drawFlower(-2,-11,"#c86f74");}
  else if(i.kind==="arch"){ctx.strokeStyle="#8d7651";ctx.lineWidth=9;ctx.beginPath();ctx.arc(0,18,30,Math.PI,0);ctx.lineTo(30,25);ctx.moveTo(-30,18);ctx.lineTo(-30,25);ctx.stroke();ctx.strokeStyle="#65754d";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,17,31,Math.PI,0);ctx.stroke();for(let a=3.35;a<6.1;a+=.38){drawFlower(Math.cos(a)*30,18+Math.sin(a)*30,a%1>0.5?"#efd7c4":"#c8848a");}}
  else if(i.kind==="cake"){ctx.fillStyle="#9e8069";ctx.beginPath();ctx.ellipse(0,10,18,6,0,0,Math.PI*2);ctx.fill();const cake=i.durability>0?"#f5e7dc":"#b99083";ctx.fillStyle=cake;roundedRectPath(-14,-3,28,13,4);ctx.fill();ctx.fillStyle="#f9f1e9";roundedRectPath(-10,-13,20,11,4);ctx.fill();ctx.fillStyle="#d28087";ctx.fillRect(-13,2,26,2);drawFlower(0,-16,"#c96c75");ctx.fillStyle=i.durability>0?"#79b867":"#e2634d";ctx.fillRect(-13,14,26*(i.durability/3),3);}
  else if(i.kind==="dolly"){ctx.strokeStyle="#b55e2e";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-10,-19);ctx.lineTo(-10,12);ctx.lineTo(10,12);ctx.lineTo(10,-19);ctx.stroke();ctx.fillStyle="#d27a3f";roundedRectPath(-11,-12,22,22,2);ctx.fill();ctx.fillStyle="#20251f";ctx.beginPath();ctx.arc(-10,16,6,0,Math.PI*2);ctx.arc(10,16,6,0,Math.PI*2);ctx.fill();}
  else if(i.kind==="speaker"){const g=ctx.createLinearGradient(-12,-15,12,15);g.addColorStop(0,"#454c49");g.addColorStop(1,"#1b201f");ctx.fillStyle=g;roundedRectPath(-12,-16,24,32,3);ctx.fill();ctx.stroke();ctx.fillStyle="#101413";ctx.beginPath();ctx.arc(0,5,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#5c6460";ctx.stroke();ctx.beginPath();ctx.arc(0,-8,3,0,Math.PI*2);ctx.fill();ctx.fillStyle=i.powered?"#79d88d":"#9c9d8d";ctx.beginPath();ctx.arc(7,-11,2,0,Math.PI*2);ctx.fill();}
  else if(i.kind==="lights"){ctx.fillStyle="#3d4741";roundedRectPath(-16,-10,32,20,3);ctx.fill();ctx.stroke();ctx.strokeStyle="#d99f38";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#d99f38";ctx.fillRect(-14,-7,3,5);ctx.fillRect(11,-7,3,5);}
  else if(i.kind==="sandbag"){ctx.fillStyle="#6f705f";ctx.beginPath();ctx.moveTo(-14,5);ctx.quadraticCurveTo(-12,-10,0,-9);ctx.quadraticCurveTo(13,-9,14,5);ctx.quadraticCurveTo(0,11,-14,5);ctx.fill();ctx.stroke();ctx.strokeStyle="#a3a18a";ctx.beginPath();ctx.moveTo(-9,0);ctx.quadraticCurveTo(0,4,9,0);ctx.stroke();}
  else {ctx.fillStyle=colors[i.kind]||"#888";roundedRectPath(-i.w/2,-i.h/2,i.w,i.h,3);ctx.fill();ctx.stroke();}
  if(i.held){ctx.strokeStyle="#f0a33e";ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.ellipse(0,0,Math.max(17,i.w*.65),Math.max(14,i.h*.55),0,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}

function drawContextHighlight() {
  const action = contextAction();
  if (!action || action.type === "none" || action.type === "held") return;
  const x = action.item ? action.item.x : action.x;
  const y = action.item ? action.item.y : action.y;
  ctx.save();
  const pulse=2+Math.sin(performance.now()*.008)*3;ctx.strokeStyle="#f0a33e";ctx.lineWidth=2.5;ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(x,y,29+pulse,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle="#fff2c588";ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,23+pulse*.5,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}

function drawPlayer(){const p=state.player,t=performance.now()*.012,walking=[...keys].some(k=>["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(k)),step=walking?Math.sin(t)*3:0;ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle="#19221955";ctx.beginPath();ctx.ellipse(2,10,15,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#262d29";ctx.beginPath();ctx.ellipse(-6,11+step,5,3,0,0,Math.PI*2);ctx.ellipse(6,11-step,5,3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#33483c";roundedRectPath(-11,-6,22,21,7);ctx.fill();ctx.fillStyle="#f0a33e";ctx.fillRect(-11,-2,22,9);ctx.fillStyle="#fff0b8";ctx.fillRect(-9,1,7,2);ctx.fillRect(2,1,7,2);ctx.fillStyle="#b87b5e";ctx.beginPath();ctx.arc(0,-12,8,0,Math.PI*2);ctx.fill();ctx.fillStyle="#26372d";ctx.beginPath();ctx.arc(0,-15,8,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(-8,-15,12,3);ctx.restore();drawPlate(p.x-22,p.y-34,44,14,"YOU","#202820dd","#fff2ce");}
function drawGuest(g){const palette=["#72546b","#4f6579","#78594a","#516b57","#8a6a3f"],idx=Math.abs(Math.floor(g.targetX+g.targetY))%palette.length;ctx.save();ctx.translate(g.x,g.y);ctx.fillStyle="#1a211b44";ctx.beginPath();ctx.ellipse(2,8,9,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=palette[idx];if(g.seated){roundedRectPath(-7,-2,14,13,5);ctx.fill();}else{ctx.beginPath();ctx.ellipse(0,3,7,10,0,0,Math.PI*2);ctx.fill();}ctx.fillStyle="#c99276";ctx.beginPath();ctx.arc(0,-6,5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#49362e";ctx.beginPath();ctx.arc(0,-8,5,Math.PI,Math.PI*2);ctx.fill();ctx.restore();}

function roundedRectPath(x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}
function drawPlate(x,y,w,h,text,bg,fg){ctx.fillStyle=bg;roundedRectPath(x,y,w,h,3);ctx.fill();ctx.fillStyle=fg;ctx.font="800 9px ui-monospace";ctx.textAlign="center";ctx.fillText(text,x+w/2,y+h-6);ctx.textAlign="left";}
function drawFlower(x,y,color){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;for(let a=0;a<Math.PI*2;a+=Math.PI/2){ctx.beginPath();ctx.arc(Math.cos(a)*3,Math.sin(a)*3,2.5,0,Math.PI*2);ctx.fill();}ctx.fillStyle="#d7b463";ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.fill();ctx.restore();}

function addParticle(x, y, text, color) { state.particles.push({ x, y, text, color, life: 1.35 }); }
function updateParticles(dt) { state.particles.forEach(p => { p.life -= dt; p.y -= 18 * dt; }); state.particles = state.particles.filter(p => p.life > 0); }
function drawParticles() {
  ctx.save(); ctx.font="900 13px ui-monospace"; ctx.textAlign="center";
  for (const p of state.particles) { ctx.globalAlpha = Math.min(1, p.life * 1.5); ctx.fillStyle="#111b"; ctx.fillText(p.text, p.x + 2, p.y + 2); ctx.fillStyle=p.color; ctx.fillText(p.text,p.x,p.y); }
  ctx.restore();
}

function drawWind() {
  const t = performance.now() * .08;
  ctx.save(); ctx.strokeStyle="#e9f1de55"; ctx.lineWidth=2;
  for (let i=0;i<9;i++) { const x=(t+i*137)%1100-80, y=70+i*57; ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+42,y+9);ctx.stroke(); }
  ctx.restore();
}

function ensureAudio() {
  if (!soundOn || audioContext) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (AudioCtor) audioContext = new AudioCtor();
}
function tone(frequency, duration, type = "square", volume = .03) {
  if (!soundOn) return;
  ensureAudio(); if (!audioContext) return;
  const osc = audioContext.createOscillator(), gain = audioContext.createGain();
  osc.type = type; osc.frequency.value = frequency; gain.gain.setValueAtTime(volume, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
  osc.connect(gain); gain.connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + duration);
}
function toggleSound() {
  soundOn = !soundOn; document.getElementById("muteButton").textContent = `SOUND: ${soundOn ? "ON" : "OFF"}`;
  if (soundOn) { ensureAudio(); tone(440, .06, "sine", .025); }
}
function togglePause(force) {
  if (state.phase !== "setup" && state.phase !== "ceremony") return;
  state.paused = typeof force === "boolean" ? force : !state.paused;
  ui.pause.classList.toggle("hidden", !state.paused); if (!state.paused) canvas.focus(); updateUI();
}

function pollGamepadActions() {
  const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
  if (!pad) { previousGamepadButtons = []; return; }
  const pressed = pad.buttons.map(button => button.pressed);
  const edge = index => pressed[index] && !previousGamepadButtons[index];
  if (edge(0)) state.phase === "brief" ? start() : interact();
  if (edge(2)) powerInteract();
  if (edge(3)) inspect();
  if (edge(1)) toolInteract();
  if (edge(9)) togglePause();
  if (edge(8)) toggleSound();
  previousGamepadButtons = pressed;
}

function frame(t) { const dt=Math.min(.05,(t-state.lastTime)/1000||0);state.lastTime=t;pollGamepadActions();update(dt);draw();updateUI();requestAnimationFrame(frame); }
function label(s){return s.charAt(0).toUpperCase()+s.slice(1);}

window.addEventListener("keydown", e => {
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();
  if (state.paused && !["KeyP","KeyR","KeyM"].includes(e.code)) return;
  keys.add(e.code);
  if(!e.repeat&&e.code==="Space")interact(); if(!e.repeat&&e.code==="KeyF")powerInteract(); if(!e.repeat&&e.code==="KeyG")toolInteract(); if(!e.repeat&&e.code==="KeyE")inspect();
  if(!e.repeat&&e.code==="KeyP")togglePause(); if(!e.repeat&&e.code==="KeyM")toggleSound(); if(!e.repeat&&e.code==="KeyR")start();
});
window.addEventListener("keyup", e => keys.delete(e.code));
document.getElementById("startButton").addEventListener("click", start);
document.getElementById("restartButton").addEventListener("click", start);
document.getElementById("resumeButton").addEventListener("click", () => togglePause(false));
document.getElementById("muteButton").addEventListener("click", toggleSound);
reset(); requestAnimationFrame(frame);
