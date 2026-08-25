"use strict";

const assert = require("node:assert/strict");
const rules = require("../rules.js");

assert.equal(rules.totalLoad([{ powered: true, amps: 8 }, { powered: false, amps: 9 }]), 8);
assert.equal(rules.totalLoad([{ powered: true, amps: 8 }, { powered: true, amps: 9 }]), 17);
assert.equal(rules.requirementScore({ chairs: 6, tables: 2, arch: true, audio: true, cake: true, sandbags: 0 }), 11);
assert.equal(rules.requirementScore({ chairs: 6, tables: 2, arch: true, audio: true, cake: true, sandbags: 2 }), 13);
assert.equal(rules.requirementScore({ chairs: 2, tables: 1, arch: false, audio: false, cake: false }), 3);
assert.equal(rules.circleHitsRect(5, 5, 2, { x: 6, y: 4, w: 3, h: 3 }), true);
assert.equal(rules.circleHitsRect(0, 0, 2, { x: 6, y: 4, w: 3, h: 3 }), false);
assert.equal(rules.pointInRect(5, 5, { x: 0, y: 0, w: 10, h: 10 }), true);
assert.equal(rules.gradeJob({ readiness: 11, verified: true, cueScore: 3, detours: 0, overloads: 0 }).rank, "S");
assert.equal(rules.gradeJob({ readiness: 0, verified: false, cueScore: 0, detours: 0, overloads: 0 }).rank, "D");

console.log("Event Crew rules: all tests passed");
