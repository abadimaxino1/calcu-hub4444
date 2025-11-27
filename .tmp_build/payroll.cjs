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

// src/lib/payroll.ts
var payroll_exports = {};
__export(payroll_exports, {
  calcPayroll: () => calcPayroll
});
module.exports = __toCommonJS(payroll_exports);

// src/lib/dates.ts
function daysInMonth(d = /* @__PURE__ */ new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function dayOfMonth(d = /* @__PURE__ */ new Date()) {
  return d.getDate();
}

// src/lib/payroll.ts
function calcPayroll(args) {
  const { mode, resident, basic, housingMode, housingPercent, housingFixed, transport, otherAllow, insEmpPct, insErPct, insBase, otherDedPct, flatDed, monthDivisor, hoursPerDay, prorateToDate, assumedBasicForN2G, grossOverride } = args;
  const housingFromBasic = (b) => housingMode === "percent" ? b * (housingPercent / 100) : housingFixed;
  const GOSI_CAP = 45e3;
  let gross;
  let resolvedBasicForCalc = basic;
  if (grossOverride != null && grossOverride > 0) {
    gross = grossOverride;
    try {
      if (housingMode === "percent") {
        const denom = 1 + housingPercent / 100;
        const inferred = (grossOverride - transport - otherAllow) / denom;
        resolvedBasicForCalc = Math.max(0, inferred);
      } else {
        const inferred = grossOverride - housingFixed - transport - otherAllow;
        resolvedBasicForCalc = Math.max(0, inferred);
      }
    } catch (e) {
    }
  } else if (mode === "net2gross") {
    const targetNet = basic;
    let guessBasic = Math.max(assumedBasicForN2G, 1);
    let guess = 0;
    for (let i = 0; i < 30; i++) {
      const guessHousing = housingFromBasic(guessBasic);
      const guessGross = guessBasic + guessHousing + transport + otherAllow;
      const empBase2 = insBase === "gosi" ? Math.min(guessBasic + guessHousing, GOSI_CAP) : insBase === "basic" ? guessBasic : guessGross;
      const empIns = empBase2 * (insEmpPct / 100);
      const otherPctAmt2 = guessGross * (otherDedPct / 100);
      const net2 = guessGross - empIns - otherPctAmt2 - flatDed;
      const diff = targetNet - net2;
      guessBasic += diff * 0.6;
      guess = guessGross;
      if (Math.abs(diff) < 0.01)
        break;
    }
    gross = Math.max(0, guess);
    resolvedBasicForCalc = Math.max(0, guessBasic);
  } else {
    const h = housingFromBasic(basic);
    gross = basic + h + transport + otherAllow;
  }
  const housingForBase = housingFromBasic(resolvedBasicForCalc);
  const baseGosi = Math.min(resolvedBasicForCalc + housingForBase, GOSI_CAP);
  const empBase = insBase === "gosi" ? baseGosi : insBase === "basic" ? resolvedBasicForCalc : gross;
  const insuranceEmployee = empBase * (insEmpPct / 100);
  const insuranceEmployer = empBase * (insErPct / 100);
  const otherPctAmt = gross * (otherDedPct / 100);
  const net = Math.max(0, gross - insuranceEmployee - otherPctAmt - flatDed);
  const now = /* @__PURE__ */ new Date();
  const dim = daysInMonth(now);
  const day = dayOfMonth(now);
  const mtdFactor = prorateToDate ? day / dim : 1;
  const toDate = { insuranceEmployee: insuranceEmployee * mtdFactor, insuranceEmployer: insuranceEmployer * mtdFactor };
  const dailyGross = gross / Math.max(1, monthDivisor);
  const dailyNet = net / Math.max(1, monthDivisor);
  const hourlyGross = dailyGross / Math.max(1, hoursPerDay);
  const hourlyNet = dailyNet / Math.max(1, hoursPerDay);
  const alloc = { basic: 0, housing: 0, transport: 0, other: 0 };
  if (insBase === "gross" && gross > 0 && insuranceEmployee > 0) {
    const parts = { basic: resolvedBasicForCalc, housing: housingFromBasic(resolvedBasicForCalc), transport, other: otherAllow };
    const sum = parts.basic + parts.housing + parts.transport + parts.other;
    if (sum > 0) {
      alloc.basic = insuranceEmployee * (parts.basic / sum);
      alloc.housing = insuranceEmployee * (parts.housing / sum);
      alloc.transport = insuranceEmployee * (parts.transport / sum);
      alloc.other = insuranceEmployee * (parts.other / sum);
    }
  }
  return {
    monthly: { gross, net, insuranceEmployee, insuranceEmployer, otherPctAmt, flat: flatDed },
    yearly: { gross: gross * 12, net: net * 12 },
    daily: { gross: dailyGross, net: dailyNet },
    hourly: { gross: hourlyGross, net: hourlyNet },
    toDate,
    allocation: { employeeInsurance: alloc }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calcPayroll
});
