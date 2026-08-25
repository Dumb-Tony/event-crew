(function (root, factory) {
  const rules = factory();
  if (typeof module === "object" && module.exports) module.exports = rules;
  else root.EventCrewRules = rules;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function distance(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
  function pointInRect(x, y, rect) { return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h; }
  function circleHitsRect(x, y, radius, rect) {
    const closestX = clamp(x, rect.x, rect.x + rect.w);
    const closestY = clamp(y, rect.y, rect.y + rect.h);
    return distance(x, y, closestX, closestY) < radius;
  }
  function totalLoad(items) { return items.filter(item => item.powered).reduce((sum, item) => sum + (item.amps || 0), 0); }
  function applyDeadzone(value, deadzone = .18) {
    if (Math.abs(value) <= deadzone) return 0;
    return Math.sign(value) * (Math.abs(value) - deadzone) / (1 - deadzone);
  }
  function requirementScore(requirements) {
    return requirements.chairs + requirements.tables + Number(requirements.arch) + Number(requirements.audio) + Number(requirements.cake) + (requirements.sandbags || 0);
  }
  function gradeJob({ readiness, maxReadiness = 11, verified, cueScore, detours, overloads }) {
    const total = readiness / maxReadiness * 80 + cueScore * 7 + Number(verified) * 5 - Math.min(12, detours) - overloads * 4;
    if (total >= 100) return { rank: "S", label: "Venue legend" };
    if (total >= 83) return { rank: "A", label: "Client would rebook" };
    if (total >= 66) return { rank: "B", label: "Professional enough" };
    if (total >= 45) return { rank: "C", label: "Event technically occurred" };
    return { rank: "D", label: "Town folklore" };
  }

  return { clamp, distance, pointInRect, circleHitsRect, totalLoad, applyDeadzone, requirementScore, gradeJob };
});
