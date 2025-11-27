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

// src/lib/eos.ts
var eos_exports = {};
__export(eos_exports, {
  calcEOS: () => calcEOS
});
module.exports = __toCommonJS(eos_exports);

// src/lib/eos/eos.engine.ts
function calcEOSEngine(args) {
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
  const rawMonths = yearsForHalf * 0.5 + yearsAfter * 1 + months / 12;
  const rawEOS = rawMonths * baseMonthly;
  let factor = 1;
  let entitlementMonths = rawMonths;
  switch (separation) {
    case "probationEnd":
      factor = years >= 1 ? 0 : 0;
      entitlementMonths = 0;
      break;
    case "employeeResignation":
      if (years < 2) {
        factor = 0;
      } else if (years >= 2 && years < 5) {
        factor = 1 / 3;
      } else if (years >= 5 && years < 10) {
        factor = 2 / 3;
      } else {
        factor = 1;
      }
      entitlementMonths = rawMonths * factor;
      break;
    case "mutualAgreement":
      factor = 0.5;
      entitlementMonths = rawMonths * factor;
      break;
    case "contractEnd":
    case "employerTermination":
    case "redundancy":
    case "transferOfBusiness":
    case "constructiveDismissal":
    case "death":
    case "retirement":
      factor = 1;
      entitlementMonths = rawMonths;
      break;
    default:
      factor = 1;
      entitlementMonths = rawMonths;
  }
  const entitlementAmount = entitlementMonths * baseMonthly;
  const finalEOS = entitlementAmount;
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
    total,
    terminationType: separation,
    entitlementMonths,
    entitlementAmount
  };
}
var eos_engine_default = calcEOSEngine;

// src/lib/eos.ts
function calcEOS(args) {
  let sep = args.separation;
  if (sep === "termination")
    sep = "employerTermination";
  if (sep === "resignation")
    sep = "employeeResignation";
  const input = {
    start: args.start,
    end: args.end,
    basic: args.basic,
    housingMode: args.housingMode,
    housingPercent: args.housingPercent,
    housingFixed: args.housingFixed,
    baseType: args.baseType,
    monthDivisor: args.monthDivisor,
    leaveDays: args.leaveDays,
    separation: sep,
    extras: args.extras,
    deductions: args.deductions
  };
  const r = eos_engine_default(input);
  return {
    duration: r.duration,
    baseMonthly: r.baseMonthly,
    dailyWage: r.dailyWage,
    rawMonths: r.rawMonths,
    rawEOS: r.rawEOS,
    factor: r.factor,
    finalEOS: r.finalEOS,
    leaveEncash: r.leaveEncash,
    extras: r.extras,
    deductions: r.deductions,
    total: r.total,
    // extras for new engine
    terminationType: r.terminationType,
    entitlementMonths: r.entitlementMonths,
    entitlementAmount: r.entitlementAmount
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calcEOS
});
