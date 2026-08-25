"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ui = {
  start: document.getElementById("startScreen"), result: document.getElementById("resultScreen"),
  timer: document.getElementById("timer"), phase: document.getElementById("phaseLabel"),
  reqs: document.getElementById("requirementsList"), score: document.getElementById("scoreText"),
  radio: document.getElementById("radioText"), hint: document.getElementById("hintText"),
  loadMeter: document.getElementById("loadMeter"), loadText: document.getElementById("loadText"),
  resultTitle: document.getElementById("resultTitle"), resultCopy: document.getElementById("resultCopy"),
  resultStats: document.getElementById("resultStats")
};

const keys = new Set();
const world = { w: 960, h: 600, deadline: 180, ceremonyLength: 22 };
const colors = { chair: "#e8e0c6", table: "#a2734f", arch: "#ecd7ac", speaker: "#33383a", cable: "#edb647" };
const aisle = { x: 310, y: 190, w: 230, h: 235 };
const fixedObstacles = [
  { x: 405, y: 478, w: 64, h: 92 },
  { x: 520, y: 175, w: 380, h: 10 },
  { x: 520, y: 330, w: 380, h: 10 }
];
let state;

function makeState() {
  const items = [];
  for (let i = 0; i < 6; i++) items.push({ id: `chair${i}`, kind: "chair", x: 80 + (i % 3) * 28, y: 390 + Math.floor(i / 3) * 36, w: 18, h: 18, held: false });
  items.push({ id: "table0", kind: "table", x: 85, y: 480, w: 52, h: 30, held: false });
  items.push({ id: "table1", kind: "table", x: 148, y: 480, w: 52, h: 30, held: false });
  items.push({ id: "arch", kind: "arch", x: 95, y: 545, w: 62, h: 20, held: false });
  items.push({ id: "speaker", kind: "speaker", x: 188, y: 545, w: 24, h: 30, held: false, amps: 8, powered: false });
  items.push({ id: "lights", kind: "lights", x: 226, y: 545, w: 30, h: 18, held: false, amps: 9, powered: false });
  return {
    phase: "brief", time: world.deadline, ceremonyTime: 0, player: { x: 270, y: 450, r: 14, speed: 170, held: null },
    items, verified: false, fuseBlown: false, guests: [], particles: [], warnings: { thirty: false, ten: false },
    guestDetours: 0, tripHazards: 0,
    radio: "Foreman: Walk the site, then start unloading.", lastTime: 0
  };
}

const zones = [
  { id: "arch", kind: "arch", x: 710, y: 105, w: 110, h: 46, label: "ARCH" },
  { id: "table0", kind: "table", x: 700, y: 390, w: 90, h: 58, label: "TABLE" },
  { id: "table1", kind: "table", x: 812, y: 390, w: 90, h: 58, label: "TABLE" },
  ...Array.from({ length: 6 }, (_, i) => ({ id: `chair${i}`, kind: "chair", x: 560 + (i % 3) * 70, y: 245 + Math.floor(i / 3) * 58, w: 38, h: 38, label: String(i + 1) }))
];

function reset() { state = makeState(); updateUI(); }
function start() { reset(); state.phase = "setup"; ui.start.classList.add("hidden"); ui.result.classList.add("hidden"); canvas.focus(); }

function requirementState() {
  const placed = zones.map(z => {
    const item = state.items.find(i => i.id === z.id);
    return distance(item.x, item.y, z.x + z.w / 2, z.y + z.h / 2) < Math.max(z.w, z.h) * .48;
  });
  const chairs = placed.slice(3).filter(Boolean).length;
  const tables = placed.slice(1, 3).filter(Boolean).length;
  const arch = placed[0];
  const speaker = state.items.find(i => i.id === "speaker");
  const load = state.items.filter(i => i.powered).reduce((sum, i) => sum + (i.amps || 0), 0);
  return { chairs, tables, arch, audio: speaker.powered && !state.fuseBlown, safePower: load <= 15 && !state.fuseBlown, load, complete: chairs + tables + Number(arch) + Number(speaker.powered && !state.fuseBlown) };
}

function update(dt) {
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
    if (state.time <= 0) beginCeremony();
  } else if (state.phase === "ceremony") {
    state.ceremonyTime += dt;
    moveGuests(dt);
    if (state.ceremonyTime >= world.ceremonyLength) finish();
  }
}

function movePlayer(dt) {
  let dx = Number(keys.has("ArrowRight") || keys.has("KeyD")) - Number(keys.has("ArrowLeft") || keys.has("KeyA"));
  let dy = Number(keys.has("ArrowDown") || keys.has("KeyS")) - Number(keys.has("ArrowUp") || keys.has("KeyW"));
  if (dx || dy) { const n = Math.hypot(dx, dy); dx /= n; dy /= n; }
  const nextX = clamp(state.player.x + dx * state.player.speed * dt, 24, world.w - 24);
  const nextY = clamp(state.player.y + dy * state.player.speed * dt, 45, world.h - 24);
  if (!playerBlocked(nextX, state.player.y)) state.player.x = nextX;
  if (!playerBlocked(state.player.x, nextY)) state.player.y = nextY;
  if (state.player.held) { state.player.held.x = state.player.x; state.player.held.y = state.player.y - 22; }
}

function playerBlocked(x, y) {
  const r = state.player.r;
  if (fixedObstacles.some(rect => circleHitsRect(x, y, r, rect))) return true;
  return state.items.some(item => !item.held && itemIsSolid(item) && circleHitsRect(x, y, r, itemRect(item)));
}

function itemIsSolid(item) { return item.kind !== "chair"; }
function itemRect(item) { return { x: item.x - item.w / 2, y: item.y - item.h / 2, w: item.w, h: item.h }; }
function circleHitsRect(x, y, r, rect) {
  const closestX = clamp(x, rect.x, rect.x + rect.w);
  const closestY = clamp(y, rect.y, rect.y + rect.h);
  return distance(x, y, closestX, closestY) < r;
}
function pointInRect(x, y, rect) { return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h; }

function interact() {
  if (state.phase !== "setup") return;
  const p = state.player;
  if (p.held) {
    p.held.held = false; p.held.y += 20; state.radio = `${label(p.held.kind)} placed. Hope that's where the client meant.`; p.held = null; updateUI(); return;
  }
  const breakerDistance = distance(p.x, p.y, 438, 525);
  if (breakerDistance < 48 && state.fuseBlown) {
    state.items.forEach(i => i.powered = false); state.fuseBlown = false; state.radio = "Breaker reset. Try not to plug everything into the same circuit this time."; updateUI(); return;
  }
  const powerItem = state.items.filter(i => i.amps).sort((a,b) => distance(p.x,p.y,a.x,a.y)-distance(p.x,p.y,b.x,b.y))[0];
  if (powerItem && distance(p.x, p.y, powerItem.x, powerItem.y) < 48) {
    powerItem.powered = !powerItem.powered;
    const req = requirementState();
    if (req.load > 15) { state.fuseBlown = true; state.items.forEach(i => i.powered = false); state.radio = "POP! Circuit A overloaded. Reset the breaker by the venue wall."; }
    else state.radio = `${label(powerItem.kind)} ${powerItem.powered ? "connected" : "disconnected"}. Circuit draw: ${req.load} amps.`;
    updateUI(); return;
  }
  const nearest = state.items.filter(i => !i.powered).sort((a,b) => distance(p.x,p.y,a.x,a.y)-distance(p.x,p.y,b.x,b.y))[0];
  if (nearest && distance(p.x, p.y, nearest.x, nearest.y) < 48) {
    p.held = nearest; nearest.held = true; state.radio = `${label(nearest.kind)} in hand. Clear a path.`; updateUI(); return;
  }
  state.radio = "Nothing within reach."; updateUI();
}

function inspect() {
  if (state.phase !== "setup") return;
  const r = requirementState(); state.verified = true;
  const missing = [];
  if (!r.arch) missing.push("arch"); if (r.tables < 2) missing.push(`${2-r.tables} table${2-r.tables === 1 ? "" : "s"}`);
  if (r.chairs < 6) missing.push(`${6-r.chairs} chair${6-r.chairs === 1 ? "" : "s"}`); if (!r.audio) missing.push("sound");
  state.radio = missing.length ? `Checklist: still missing ${missing.join(", ")}.` : "Checklist verified. We could almost look professional."; updateUI();
}

function contextAction() {
  if (state.phase !== "setup") return null;
  const p = state.player;
  if (p.held) return { type: "held", item: p.held, text: `SPACE drop ${label(p.held.kind)}` };
  if (state.fuseBlown && distance(p.x, p.y, 438, 525) < 48) return { type: "breaker", x: 438, y: 525, text: "SPACE reset breaker" };
  const powerItem = state.items.filter(i => i.amps).sort((a,b) => distance(p.x,p.y,a.x,a.y)-distance(p.x,p.y,b.x,b.y))[0];
  if (powerItem && distance(p.x, p.y, powerItem.x, powerItem.y) < 48) {
    return { type: "item", item: powerItem, text: `SPACE ${powerItem.powered ? "disconnect" : "connect"} ${label(powerItem.kind)}` };
  }
  const nearest = state.items.filter(i => !i.powered).sort((a,b) => distance(p.x,p.y,a.x,a.y)-distance(p.x,p.y,b.x,b.y))[0];
  if (nearest && distance(p.x, p.y, nearest.x, nearest.y) < 48) return { type: "item", item: nearest, text: `SPACE pick up ${label(nearest.kind)}` };
  return { type: "none", text: "Move near equipment • E inspect checklist • R restart" };
}

function beginCeremony() {
  state.phase = "ceremony"; state.player.held && (state.player.held.held = false); state.player.held = null;
  const r = requirementState();
  state.tripHazards = state.items.filter(i => itemIsSolid(i) && pointInRect(i.x, i.y, aisle)).length;
  for (let i = 0; i < 24; i++) state.guests.push({ x: -20 - i * 18, y: 220 + (i % 6) * 35, targetX: 535 + (i % 3) * 70, targetY: 245 + (Math.floor(i / 3) % 2) * 58, speed: 45 + (i % 4) * 4, seated: false, avoided: [] });
  if (state.tripHazards) state.radio = `Guests entering. ${state.tripHazards} large ${state.tripHazards === 1 ? "item is" : "items are"} still in the access aisle.`;
  else state.radio = r.complete >= 8 ? "Guests entering. Smile like this was always the plan." : "Guests entering. The event is now working around the setup.";
  updateUI();
}

function moveGuests(dt) {
  for (const g of state.guests) {
    if (g.seated) continue;
    const dx = g.targetX - g.x, dy = g.targetY - g.y, d = Math.hypot(dx,dy);
    if (d < 5) { g.seated = true; continue; }
    const blocker = state.items.find(i => !i.held && itemIsSolid(i) && circleHitsRect(g.x, g.y, 24, itemRect(i)));
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
  let title, copy;
  if (r.complete === 10 && state.verified) { title = "A suspiciously competent wedding."; copy = "Every requirement was checked, the vows were audible, and nobody sat on a delivery crate. The client has already asked about next summer."; }
  else if (r.complete >= 7) { title = "The photos will be strategically cropped."; copy = `The ceremony carried on with ${r.chairs} chairs, ${r.tables} tables, ${r.arch ? "an arch" : "no arch"}, and ${r.audio ? "working audio" : "interpretive lip-reading"}.`; }
  else { title = "Legally, it was still a wedding."; copy = "Guests adapted, the couple improvised, and the venue manager learned several new ways to say “unacceptable.” The town will remember this one."; }
  ui.resultTitle.textContent = title; ui.resultCopy.textContent = copy;
  ui.resultStats.innerHTML = `<span>REQUIREMENTS<strong>${r.complete}/10</strong></span><span>POWER<strong>${r.audio ? "ONLINE" : "DARK"}</strong></span><span>VERIFIED<strong>${state.verified ? "YES" : "NO"}</strong></span><span>GUEST DETOURS<strong>${state.guestDetours}</strong></span>`;
  ui.result.classList.remove("hidden"); updateUI();
}

function updateUI() {
  const r = requirementState(); const shownTime = state.phase === "ceremony" ? Math.max(0, world.ceremonyLength - state.ceremonyTime) : state.time;
  ui.timer.textContent = `${String(Math.floor(shownTime / 60)).padStart(2,"0")}:${String(Math.floor(shownTime % 60)).padStart(2,"0")}`;
  ui.phase.textContent = state.phase === "ceremony" ? "LIVE" : state.phase === "result" ? "DONE" : "SETUP";
  const reqs = [["Ceremony arch", r.arch], [`Chairs ${r.chairs} / 6`, r.chairs === 6], [`Tables ${r.tables} / 2`, r.tables === 2], ["Sound system powered", r.audio], ["Final checklist verified", state.verified]];
  ui.reqs.innerHTML = reqs.map(([text,done]) => `<li class="${done ? "done" : ""}">${text}</li>`).join("");
  ui.score.textContent = `${r.complete} / 10 READY`;
  ui.radio.textContent = state.radio; ui.loadText.textContent = `${r.load} / 15A`; ui.loadMeter.style.width = `${Math.min(100, r.load / 15 * 100)}%`;
  ui.loadMeter.style.background = state.fuseBlown ? "#e2634d" : r.load > 12 ? "#f0a33e" : "#91bc68";
  const action = contextAction();
  ui.hint.textContent = state.phase === "setup" ? action.text : state.phase === "ceremony" ? "The event proceeds with what you built." : "Shift complete.";
}

function draw() {
  ctx.clearRect(0,0,world.w,world.h); drawGround(); drawZones(); drawPower();
  state.items.forEach(drawItem); state.guests.forEach(drawGuest); drawContextHighlight(); if (state.phase !== "ceremony" && state.phase !== "result") drawPlayer();
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

function requirementStateForZone(z) { const i=state.items.find(i=>i.id===z.id); return distance(i.x,i.y,z.x+z.w/2,z.y+z.h/2)<Math.max(z.w,z.h)*.48; }

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

function frame(t) { const dt=Math.min(.05,(t-state.lastTime)/1000||0);state.lastTime=t;update(dt);draw();updateUI();requestAnimationFrame(frame); }
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function distance(x1,y1,x2,y2){return Math.hypot(x2-x1,y2-y1);}
function label(s){return s.charAt(0).toUpperCase()+s.slice(1);}

window.addEventListener("keydown", e => { if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault(); keys.add(e.code); if(!e.repeat&&e.code==="Space")interact(); if(!e.repeat&&e.code==="KeyE")inspect(); if(!e.repeat&&e.code==="KeyR")start(); });
window.addEventListener("keyup", e => keys.delete(e.code));
document.getElementById("startButton").addEventListener("click", start);
document.getElementById("restartButton").addEventListener("click", start);
reset(); requestAnimationFrame(frame);
