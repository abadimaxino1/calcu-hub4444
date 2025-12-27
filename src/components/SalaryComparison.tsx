import React, { useState, useMemo } from 'react';
import { calcPayroll } from '../lib/payroll';
import { useTranslation } from 'react-i18next';

export default function SalaryComparison() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isAr = lang === 'ar';

  const [offerA, setOfferA] = useState({ basic: 5000, housing: 1250, transport: 500, other: 0 });
  const [offerB, setOfferB] = useState({ basic: 6000, housing: 1500, transport: 600, other: 0 });

  const calculate = (basic: number, housing: number, transport: number, other: number) => {
    const res = calcPayroll({
      mode: 'gross2net',
      resident: 'saudi',
      gosiProfile: 'saudi-standard',
      basic,
      housingMode: 'fixed',
      housingPercent: 0,
      housingFixed: housing,
      transport,
      otherAllow: other,
      insEmpPct: 0,
      insErPct: 0,
      insBase: 'gosi',
      otherDedPct: 0,
      flatDed: 0,
      monthDivisor: 30,
      hoursPerDay: 8,
      prorateToDate: false,
      assumedBasicForN2G: 0,
      grossOverride: null
    });
    return {
      net: res.monthly.net,
      gosi: res.monthly.insuranceEmployee
    };
  };

  const resultA = useMemo(() => calculate(offerA.basic, offerA.housing, offerA.transport, offerA.other), [offerA]);
  const resultB = useMemo(() => calculate(offerB.basic, offerB.housing, offerB.transport, offerB.other), [offerB]);

  const diff = resultB.net - resultA.net;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Offer A */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-4 text-blue-700">{isAr ? 'العرض الأول (A)' : 'Offer A'}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">{isAr ? 'الراتب الأساسي' : 'Basic Salary'}</label>
              <input type="number" value={offerA.basic} onChange={e => setOfferA({...offerA, basic: +e.target.value})} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">{isAr ? 'بدل السكن' : 'Housing'}</label>
              <input type="number" value={offerA.housing} onChange={e => setOfferA({...offerA, housing: +e.target.value})} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">{isAr ? 'بدل النقل' : 'Transport'}</label>
              <input type="number" value={offerA.transport} onChange={e => setOfferA({...offerA, transport: +e.target.value})} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">{isAr ? 'بدلات أخرى' : 'Other'}</label>
              <input type="number" value={offerA.other} onChange={e => setOfferA({...offerA, other: +e.target.value})} className="w-full p-2 border rounded" />
            </div>
            <div className="pt-4 border-t mt-4">
              <div className="flex justify-between font-bold text-lg">
                <span>{isAr ? 'الصافي:' : 'Net:'}</span>
                <span>{resultA.net.toLocaleString()} SAR</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {isAr ? 'خصم التأمينات:' : 'GOSI:'} {resultA.gosi.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Offer B */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-4 text-green-700">{isAr ? 'العرض الثاني (B)' : 'Offer B'}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">{isAr ? 'الراتب الأساسي' : 'Basic Salary'}</label>
              <input type="number" value={offerB.basic} onChange={e => setOfferB({...offerB, basic: +e.target.value})} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">{isAr ? 'بدل السكن' : 'Housing'}</label>
              <input type="number" value={offerB.housing} onChange={e => setOfferB({...offerB, housing: +e.target.value})} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">{isAr ? 'بدل النقل' : 'Transport'}</label>
              <input type="number" value={offerB.transport} onChange={e => setOfferB({...offerB, transport: +e.target.value})} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">{isAr ? 'بدلات أخرى' : 'Other'}</label>
              <input type="number" value={offerB.other} onChange={e => setOfferB({...offerB, other: +e.target.value})} className="w-full p-2 border rounded" />
            </div>
            <div className="pt-4 border-t mt-4">
              <div className="flex justify-between font-bold text-lg">
                <span>{isAr ? 'الصافي:' : 'Net:'}</span>
                <span>{resultB.net.toLocaleString()} SAR</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {isAr ? 'خصم التأمينات:' : 'GOSI:'} {resultB.gosi.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Result */}
      <div className={`p-6 rounded-lg text-center ${diff > 0 ? 'bg-green-50 border border-green-200' : diff < 0 ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-slate-200'}`}>
        <h3 className="text-xl font-bold mb-2">
          {diff === 0 ? (isAr ? 'العرضان متساويان' : 'Offers are equal') : 
           diff > 0 ? (isAr ? 'العرض الثاني (B) أفضل بـ' : 'Offer B is better by') : 
           (isAr ? 'العرض الأول (A) أفضل بـ' : 'Offer A is better by')}
        </h3>
        {diff !== 0 && (
          <div className="text-3xl font-bold dir-ltr">
            {Math.abs(diff).toLocaleString()} SAR
            <span className="text-sm font-normal text-slate-600 mx-2">
              {isAr ? 'شهرياً' : '/ month'}
            </span>
          </div>
        )}
        <div className="mt-2 text-sm text-slate-600">
          {isAr ? 'سنوياً:' : 'Yearly:'} {(Math.abs(diff) * 12).toLocaleString()} SAR
        </div>
      </div>
    </div>
  );
}
