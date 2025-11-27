var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/workhours.ts
var workhours_exports = {};
__export(workhours_exports, {
  calcEndTimeLocal: () => calcEndTimeLocal,
  nowHHmm: () => nowHHmm
});
module.exports = __toCommonJS(workhours_exports);
function nowHHmm() {
  const d = /* @__PURE__ */ new Date();
  const pad = (s) => String(s).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function calcEndTimeLocal(startHHmm, targetHrs, breakMin, breakPaid) {
  if (!/^\d{2}:\d{2}$/.test(startHHmm || ""))
    return "--:--";
  const [h, m] = startHHmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m))
    return "--:--";
  const startMin = h * 60 + m;
  const addWork = Math.round((Number(targetHrs) || 0) * 60);
  const addBreak = Math.round(Number(breakMin) || 0);
  const addMin = breakPaid ? addWork + addBreak : addWork;
  const endMin = (startMin + addMin) % (24 * 60);
  const pad = (s) => String(s).padStart(2, "0");
  return `${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calcEndTimeLocal,
  nowHHmm
});
