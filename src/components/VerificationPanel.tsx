import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { VerificationReport } from '../verification';

/** Renders the real result of each verification check; nothing here is hardcoded. */
export const VerificationPanel: React.FC<{ report: VerificationReport | null }> = ({ report }) => {
  if (!report) return null;
  const passedCount = report.checks.filter((c) => c.passed).length;
  return (
    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-200">과학적 검증</span>
        <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${report.passed ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}`}>
          {passedCount}/{report.checks.length} 통과
        </span>
      </div>
      <ul className="space-y-1">
        {report.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-1.5 text-[11px]">
            {c.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-px" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-px" />
            )}
            <div>
              <div className={c.passed ? 'text-slate-200' : 'text-red-300'}>{c.label}</div>
              <div className="text-slate-500 leading-snug">{c.message}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
