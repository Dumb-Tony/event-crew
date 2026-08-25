"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const { clamp, distance, pointInRect, circleHitsRect, totalLoad, requirementScore, gradeJob } = EventCrewRules;
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
  ctx.clearRect(0,0,world.w,world.h); drawGround(); drawZones(); drawPower();
  state.items.forEach(drawItem); state.guests.forEach(drawGuest); drawContextHighlight(); if (state.phase !== "result") drawPlayer(); drawParticles();
  if (state.weather.windy) drawWind();
  if (state.fuseBlown) { ctx.fillStyle = "#12141bbb"; ctx.fillRect(315,40,645,560); }
}

function drawGround() {
  ctx.fillStyle = "#71865d"; ctx.fillRect(0,0,world.w,world.h);
  ctx.fillStyle = "#8d8068"; ctx.fillRect(0,350,310,250); ctx.fillStyle = "#5e5649"; ctx.fillRect(18,375,250,205);
  ctx.fillStyle = "#dad2ba"; ctx.fillRect(310,40,650,560); ctx.fillStyle = "#b8b49f"; ctx.fillRect(315,44,640,552);
  ctx.strokeStyle = "#c9c4ad"; ctx.lineWidth = 2; for(let x=330;x<950;x+=42){ctx.beginPath();ctx.moveTo(x,45);ctx.lineTo(x,595);ctx.stroke();}
  ctx.fillStyle = "#32372f"; ctx.fillRect(0,330,310,22); ctx.fillStyle="#f0a33e"; ctx.font="bold 13px ui-monospace"; ctx.fillText("DELIVERY STAGING",22,345);
  ctx.fillStyle="#393e37"; ctx.fillRect(405,478,64,92); ctx.fillStyle="#f0a33e"; ctx.fillText("15A",424,516); ctx.fillStyle="#ddd"; ctx.fillText("RESET",414,545);
  ctx.fillStyle="#65705d"; ctx.fillRect(520,175,380,10); ctx.fillStyle="#596354"; ctx.fillRect(520,330,380,10);
  ctx.save(); ctx.setLineDash([10,8]); ctx.strokeStyle="#f0a33e88"; ctx.lineWidth=2; ctx.strokeRect(aisle.x,aisle.y,aisle.w,aisle.h); ctx.restore();
  ctx.fillStyle="#606858"; ctx.font="11px ui-monospace"; ctx.fillText("CEREMONY",535,205); ctx.fillText("RECEPTION",535,365);
  ctx.fillStyle="#836d45"; ctx.fillText("KEEP ACCESS CLEAR",330,414);
}

function drawZones() {
  ctx.save(); ctx.setLineDash([6,5]); ctx.lineWidth=2; ctx.textAlign="center"; ctx.font="bold 10px ui-monospace";
  for (const z of zones) { const done = requirementStateForZone(z); ctx.strokeStyle = done ? "#6d984e" : "#918c77"; ctx.fillStyle = done ? "#88ad6255" : "#fff2"; ctx.fillRect(z.x,z.y,z.w,z.h); ctx.strokeRect(z.x,z.y,z.w,z.h); ctx.fillStyle="#555c50"; ctx.fillText(z.label,z.x+z.w/2,z.y+z.h/2+4); }
  ctx.restore();
}

function requirementStateForZone(z) { const i=state.items.find(i=>i.id===z.id); return !!i && distance(i.x,i.y,z.x+z.w/2,z.y+z.h/2)<Math.max(z.w,z.h)*.48; }

function drawPower() {
  const outlet={x:465,y:500}; for(const item of state.items.filter(i=>i.powered)){ctx.strokeStyle=colors.cable;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(outlet.x,outlet.y);ctx.lineTo(item.x,item.y);ctx.stroke();}
  ctx.fillStyle=state.fuseBlown?"#e2634d":"#91bc68";ctx.beginPath();ctx.arc(451,495,5,0,Math.PI*2);ctx.fill();
}

function drawItem(i) {
  ctx.save(); ctx.translate(i.x,i.y); if(i.held){ctx.shadowColor="#000";ctx.shadowBlur=12;}
  ctx.fillStyle=colors[i.kind]||"#888"; ctx.strokeStyle="#30342e";ctx.lineWidth=2;
  if(i.kind==="chair"){ctx.fillRect(-9,-9,18,15);ctx.strokeRect(-9,-9,18,15);ctx.fillRect(-9,6,3,7);ctx.fillRect(6,6,3,7);}
  else if(i.kind==="table"){ctx.beginPath();ctx.ellipse(0,0,27,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
  else if(i.kind==="arch"){ctx.lineWidth=8;ctx.strokeStyle=colors.arch;ctx.beginPath();ctx.arc(0,19,28,Math.PI,0);ctx.lineTo(28,22);ctx.moveTo(-28,19);ctx.lineTo(-28,22);ctx.stroke();}
  else if(i.kind==="cake"){ctx.fillRect(-14,-7,28,15);ctx.strokeRect(-14,-7,28,15);ctx.fillStyle="#fff3";ctx.fillRect(-10,-13,20,7);ctx.fillStyle=i.durability>0?"#91bc68":"#e2634d";ctx.fillRect(-12,11,24*(i.durability/3),3);}
  else if(i.kind==="dolly"){ctx.fillRect(-11,-19,22,30);ctx.strokeRect(-11,-19,22,30);ctx.fillStyle="#252923";ctx.beginPath();ctx.arc(-10,15,5,0,Math.PI*2);ctx.arc(10,15,5,0,Math.PI*2);ctx.fill();}
  else {ctx.fillRect(-i.w/2,-i.h/2,i.w,i.h);ctx.strokeRect(-i.w/2,-i.h/2,i.w,i.h); if(i.amps){ctx.fillStyle=i.powered?"#91bc68":"#d2cda9";ctx.fillRect(-5,-4,10,7);}}
  ctx.restore();
}

function drawContextHighlight() {
  const action = contextAction();
  if (!action || action.type === "none" || action.type === "held") return;
  const x = action.item ? action.item.x : action.x;
  const y = action.item ? action.item.y : action.y;
  ctx.save();
  ctx.strokeStyle = "#f0a33e";
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(x, y, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() { const p=state.player;ctx.fillStyle="#f0a33e";ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.fillStyle="#25332b";ctx.fillRect(p.x-10,p.y-5,20,11);ctx.fillStyle="#fff";ctx.font="bold 10px ui-monospace";ctx.textAlign="center";ctx.fillText("YOU",p.x,p.y-20); }
function drawGuest(g) {ctx.fillStyle=g.seated?"#7e4f65":"#52657e";ctx.beginPath();ctx.arc(g.x,g.y,8,0,Math.PI*2);ctx.fill();}

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

function frame(t) { const dt=Math.min(.05,(t-state.lastTime)/1000||0);state.lastTime=t;update(dt);draw();updateUI();requestAnimationFrame(frame); }
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
