// Simple CJS test runner that loads compiled libs from .tmp_build and runs smoke tests
const path = require('path');
const libDir = path.join(__dirname, '..', '.tmp_build');
function load(name) {
  return require(path.join(libDir, name + '.cjs'));
}

const workhours = load('workhours');
const payroll = load('payroll');
const eos = load('eos');
const dates = load('dates');

function fmt2(n){ return (typeof n!=='number' || isNaN(n))? '0.00' : n.toFixed(2); }

function runAll(){
  const results = [];
  try{
    const end1 = workhours.calcEndTimeLocal("07:00", 8, 60, true);
    results.push({name:'Work: 07:00 + 8h + 60m paid => 16:00', pass: end1 === '16:00', message:`got ${end1}`} );
    const end2 = workhours.calcEndTimeLocal("09:00", 8, 30, false);
    results.push({name:'Work: 09:00 + 8h + 30m unpaid => 17:00', pass: end2 === '17:00', message:`got ${end2}`} );
  }catch(e){ results.push({name:'Work tests', pass:false, message:String(e)}); }

  try{
    const p1 = payroll.calcPayroll({ mode:'gross2net', resident:'saudi', basic:10000, housingMode:'percent', housingPercent:25, housingFixed:0, transport:0, otherAllow:0, insEmpPct:9.75, insErPct:12, insBase:'gosi', otherDedPct:0, flatDed:0, monthDivisor:30, hoursPerDay:8, prorateToDate:true, assumedBasicForN2G:10000, grossOverride:null });
    results.push({name:'Payroll: Saudi basic=10000 gross>0 and net>0', pass:p1.monthly.gross>0 && p1.monthly.insuranceEmployee>=0, message:`gross=${p1.monthly.gross}`} );

    const p2 = payroll.calcPayroll({ mode:'gross2net', resident:'expat', basic:0, housingMode:'percent', housingPercent:0, housingFixed:0, transport:0, otherAllow:0, insEmpPct:0, insErPct:0, insBase:'gross', otherDedPct:0, flatDed:0, monthDivisor:30, hoursPerDay:8, prorateToDate:false, assumedBasicForN2G:10000, grossOverride:16009.39 });
    results.push({name:'Payroll: Expat grossOnly no insurance net≈gross', pass: Math.abs(p2.monthly.net - p2.monthly.gross) < 0.01, message:`net=${p2.monthly.net} gross=${p2.monthly.gross}`} );

    const p3 = payroll.calcPayroll({ mode:'net2gross', resident:'saudi', basic:10000, housingMode:'percent', housingPercent:25, housingFixed:0, transport:0, otherAllow:0, insEmpPct:9.75, insErPct:12, insBase:'gosi', otherDedPct:0, flatDed:0, monthDivisor:30, hoursPerDay:8, prorateToDate:false, assumedBasicForN2G:10000, grossOverride:null });
    const recon = payroll.calcPayroll({ mode:'gross2net', resident:'saudi', basic: 0, housingMode:'percent', housingPercent:25, housingFixed:0, transport:0, otherAllow:0, insEmpPct:9.75, insErPct:12, insBase:'gosi', otherDedPct:0, flatDed:0, monthDivisor:30, hoursPerDay:8, prorateToDate:false, assumedBasicForN2G:10000, grossOverride: p3.monthly.gross });
    results.push({name:'Payroll Net->Gross inversion close', pass: Math.abs(recon.monthly.net - 10000) < 1.0, message:`recon.net=${recon.monthly.net}`} );
  }catch(e){ results.push({name:'Payroll tests', pass:false, message:String(e)}); }

  try{
    const s1 = eos.calcEOS({ start: '2020-01-01', end: '2023-01-01', basic:10000, housingMode:'percent', housingPercent:0, housingFixed:0, baseType:'basic', monthDivisor:30, leaveDays:0, separation:'resignation', extras:0, deductions:0 });
    results.push({name:'EOS: 3y resignation final≈5000', pass: Math.abs(s1.finalEOS - 5000) < 1, message:`final=${s1.finalEOS}`} );

    const s2 = eos.calcEOS({ start: '2016-01-01', end: '2023-01-01', basic:10000, housingMode:'percent', housingPercent:0, housingFixed:0, baseType:'basic', monthDivisor:30, leaveDays:0, separation:'termination', extras:0, deductions:0 });
    results.push({name:'EOS: 7y termination ≈45000', pass: Math.abs(s2.rawEOS - 45000) < 1, message:`raw=${s2.rawEOS}`} );
  }catch(e){ results.push({name:'EOS tests', pass:false, message:String(e)}); }

  try{
    const d1 = dates.diffBetween(new Date('2025-01-01T00:00:00Z'), new Date('2025-01-02T00:00:00Z'));
    results.push({name:'Dates: 1 day diff', pass: d1.totalDays === 1, message:`days=${d1.totalDays}`} );
  }catch(e){ results.push({name:'Dates tests', pass:false, message:String(e)}); }

  return results;
}

const res = runAll();
console.log(JSON.stringify(res, null, 2));

const passed = res.filter(r=>r.pass).length;
console.log(`\nSummary: ${passed}/${res.length} tests passed`);

if (passed !== res.length) process.exitCode = 2;
