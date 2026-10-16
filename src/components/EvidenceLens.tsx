import React, { useState } from 'react';
import { ShieldCheck, BookOpen, ExternalLink, HelpCircle, X, CheckCircle, Info } from 'lucide-react';
import { EvidenceItem } from '../types';
import { sound } from '../lib/audio';

interface EvidenceLensProps {
  evidenceItems?: EvidenceItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceLens: React.FC<EvidenceLensProps> = ({
  evidenceItems = [],
  isOpen,
  onClose,
}) => {
  const [selectedItem, setSelectedItem] = useState<EvidenceItem | null>(null);

  if (!isOpen) return null;

  // Default items if none provided in spec
  const items: EvidenceItem[] =
    evidenceItems.length > 0
      ? evidenceItems
      : [
          {
            id: 'ev-gravity-constant',
            targetKey: 'gravity',
            label: '표준 중력 가속도 (Standard Gravity g)',
            formulaOrValue: 'g = 9.80665 m/s²',
            type: 'verified_constant',
            sourceName: 'CODATA / NIST Fundamental Physical Constants',
            sourceUrl: 'https://physics.nist.gov/cuu/Constants/',
            description: '국제 도량형 총회(CGPM)에서 비준한 지구 표면 해수면 기준 공인 표준 중력 가속도 상수.',
          },
          {
            id: 'ev-snell-law',
            targetKey: 'snell',
            label: '스넬의 굴절 법칙 (Snell\'s Law of Refraction)',
            formulaOrValue: 'n₁ · sin(θ₁) = n₂ · sin(θ₂)',
            type: 'established_law',
            sourceName: 'Feynman Lectures on Physics, Vol 1, Ch. 26',
            sourceUrl: 'https://www.feynmanlectures.caltech.edu/I_26.html',
            description: '페르마의 최소 시간 원리(Fermat\'s Principle of Least Time)에 의해 유도되는 파동 굴절의 기초 보존 방정식.',
          },
          {
            id: 'ev-speed-of-light',
            targetKey: 'c',
            label: '진공 중 빛의 속도 (Speed of Light in Vacuum c)',
            formulaOrValue: 'c = 299,792,458 m/s',
            type: 'verified_constant',
            sourceName: 'SI Base Units / BIPM Definitive Metric',
            sourceUrl: 'https://www.bipm.org/en/measurement-units/base-units',
            description: '빛이 진공에서 전파되는 절대 속도. 매질 내 위상 속도는 v = c / n 으로 감속됩니다.',
          },
          {
            id: 'ev-archimedes',
            targetKey: 'buoyancy',
            label: '아르키메데스의 원리 (Archimedes\' Principle)',
            formulaOrValue: 'F_B = ρ_fluid · V_submerged · g',
            type: 'established_law',
            sourceName: 'On Floating Bodies (Archimedes of Syracuse, c. 250 BC)',
            description: '유체에 잠긴 물체가 받는 부력의 크기는 물체가 밀어낸 유체의 무게와 같다는 유체정역학의 기본 정리.',
          },
          {
            id: 'ev-drag-approx',
            targetKey: 'drag',
            label: '난류 공기 저항 2차식 (Newtonian Quadratic Drag)',
            formulaOrValue: 'F_drag = 0.5 · ρ · C_d · A · v²',
            type: 'educational_approximation',
            sourceName: 'Fluid Mechanics (Landau & Lifshitz)',
            description: '레이놀즈 수가 높은 영역에서의 거시적 항력 근사식. 레이놀즈 수 변동 및 경계층 박리는 단순화되어 있습니다.',
            limitations: '초음속 충격파 및 고점도 영역에서는 스토크스 법칙과의 복합 모델이 필요합니다.',
          },
        ];

  const getTypeBadge = (type: EvidenceItem['type']) => {
    switch (type) {
      case 'verified_constant':
        return <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-mono text-[10px]">물리 상수 [출처 표기]</span>;
      case 'established_law':
        return <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-mono text-[10px]">검증된 물리 법칙 [LAW]</span>;
      case 'user_parameter':
        return <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/50 text-amber-300 font-mono text-[10px]">사용자 조작 변인 [USER]</span>;
      case 'educational_approximation':
        return <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-500/50 text-purple-300 font-mono text-[10px]">교육용 근사 모델 [APPROX]</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">가정</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col text-white overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>에비던스 렌즈 (Evidence Lens — 과학적 신뢰성 검증)</span>
              </h2>
              <p className="text-xs text-slate-400">
                시뮬레이션에 적용된 물리 상수, 보존 법칙, 학술 문헌 출처 및 모델 한계점을 투명하게 공개합니다.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((it) => (
              <div
                key={it.id}
                onClick={() => {
                  sound.playClick();
                  setSelectedItem(it);
                }}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                  selectedItem?.id === it.id
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-white text-xs truncate">{it.label}</span>
                    {getTypeBadge(it.type)}
                  </div>

                  <div className="font-mono text-cyan-300 font-bold bg-slate-900/90 p-1.5 rounded border border-slate-800 text-[11px] mb-2">
                    {it.formulaOrValue}
                  </div>

                  <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                    {it.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="truncate max-w-[180px]">출처: {it.sourceName}</span>
                  {it.sourceUrl && (
                    <a
                      href={it.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>원문 보기</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Drawer below if item selected */}
          {selectedItem && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-2 mt-4 text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-cyan-300">{selectedItem.label}</span>
                {getTypeBadge(selectedItem.type)}
              </div>
              <div className="font-mono text-amber-300 bg-slate-900 p-2 rounded border border-slate-800">
                {selectedItem.formulaOrValue}
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                {selectedItem.description}
              </p>
              {selectedItem.limitations && (
                <div className="p-2.5 rounded bg-purple-950/40 border border-purple-500/40 text-purple-200 text-[11px]">
                  <strong>⚠️ 모델 근사 한계: </strong> {selectedItem.limitations}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
