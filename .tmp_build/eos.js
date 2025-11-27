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

// calcu-hub/src/lib/eos.ts
var eos_exports = {};
__export(eos_exports, {
  calcEOS: () => calcEOS
});
module.exports = __toCommonJS(eos_exports);
function calcEOS(args) {
  const { start, end, basic, housingMode, housingPercent, housingFixed, baseType, monthDivisor, leaveDays, separation, extras, deductions } = args;
  const s = new Date(start);
  const e = new Date(end);
  const totalMs = Math.max(0, e.getTime() - s.getTime());
  const totalDays = Math.floor(totalMs / (1e3 * 60 * 60 * 24));
  const yearsFloat = totalDays / 365;
  const years = Math.floor(yearsFloat);
  const remDays = totalDays - years * 365;
  const months = Math.floor(remDays / 30);
  const days = remDays - months * 30;
  const housing = housingMode === "percent" ? basic * (housingPercent / 100) : housingFixed;
  const baseMonthly = baseType === "basic" ? basic : basic + housing;
  const dailyWage = baseMonthly / Math.max(1, monthDivisor);
  const yearsForHalf = Math.min(5, years);
  const yearsAfter = Math.max(0, years - 5);
  const rawMonths = yearsForHalf * 0.5 + yearsAfter * 1;
  const rawEOS = rawMonths * baseMonthly + months / 12 * baseMonthly;
  let factor = 1;
  if (separation === "resignation") {
    if (years < 2) factor = 0;
    else if (years >= 2 && years < 5) factor = 1 / 3;
    else if (years >= 5 && years < 10) factor = 2 / 3;
    else factor = 1;
  }
  const finalEOS = rawEOS * factor;
  const leaveEncash = leaveDays * dailyWage;
  const total = finalEOS + leaveEncash + extras - deductions;
  return {
    duration: { years, months, days, totalDays },
    baseMonthly,
    dailyWage,
    rawMonths,
    rawEOS,
    factor,
    finalEOS,
    leaveEncash,
    extras,
    deductions,
    total
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calcEOS
});
