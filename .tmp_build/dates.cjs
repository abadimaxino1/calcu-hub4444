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

// src/lib/dates.ts
var dates_exports = {};
__export(dates_exports, {
  dayOfMonth: () => dayOfMonth,
  daysInMonth: () => daysInMonth,
  diffBetween: () => diffBetween
});
module.exports = __toCommonJS(dates_exports);
function daysInMonth(d = /* @__PURE__ */ new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function dayOfMonth(d = /* @__PURE__ */ new Date()) {
  return d.getDate();
}
function diffBetween(a, b) {
  const ms = Math.max(0, b.getTime() - a.getTime());
  const totalSeconds = Math.floor(ms / 1e3);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const totalWeeks = Math.floor(totalDays / 7);
  const years = Math.floor(totalDays / 365);
  const months = Math.floor(totalDays / 30);
  const businessDays = Math.round(totalDays * (5 / 7));
  return { ms, totalSeconds, totalMinutes, totalHours, totalDays, totalWeeks, years, months, businessDays };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  dayOfMonth,
  daysInMonth,
  diffBetween
});
