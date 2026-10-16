import React from 'react';
import { Volume2, VolumeX, BookOpen, RotateCcw, Sparkles, Compass } from 'lucide-react';
import { ExperimentSpec } from '../types';
import { sound } from '../lib/audio';

interface HeaderProps {
  currentExperiment: ExperimentSpec | null;
  onNewExperiment: () => void;
  onResetVariables: () => void;
  onOpenNotebook: () => void;
  snapshotCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentExperiment,
  onNewExperiment,
  onResetVariables,
  onOpenNotebook,
  snapshotCount,
  isMuted,
  onToggleMute,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-slate-950/70 backdrop-blur-xl border-b border-cyan-500/20 px-4 md:px-6 flex items-center justify-between text-white transition-all select-none">
      {/* Brand & Active Experiment Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNewExperiment}
          className="flex items-center gap-2.5 group cursor-pointer text-left"
          title="새 실험 질문하기 (홈)"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 p-[1px] flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-400/40 transition">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="text-xs font-black tracking-widest text-cyan-400 font-mono flex items-center gap-1.5">
              <span>SCIENCE UNIVERSE</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-normal">
                AI LAB
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium truncate max-w-[200px] md:max-w-[320px]">
              {currentExperiment ? currentExperiment.title : 'AI 대화형 과학 실험실'}
            </div>
          </div>
        </button>

        {currentExperiment && (
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800">
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-cyan-500/30 text-cyan-300 font-mono">
              {currentExperiment.domain.toUpperCase()}
            </span>
            {currentExperiment.isConceptualOnly && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 font-sans">
                개념 가시화 모델
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {currentExperiment && (
          <>
            <button
              onClick={() => {
                sound.playClick();
                onResetVariables();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
              title="변수 기본값으로 리셋"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">초기화</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onOpenNotebook();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-cyan-950/50 border border-slate-700 hover:border-cyan-500/50 text-xs text-cyan-300 flex items-center gap-1.5 transition cursor-pointer relative"
              title="실험 결과 비교 및 연구 노트"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">실험 노트</span>
              {snapshotCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {snapshotCount}
                </span>
              )}
            </button>
          </>
        )}

        {/* Audio Toggle */}
        <button
          onClick={() => {
            onToggleMute();
          }}
          className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          title={isMuted ? '음향 켜기' : '음향 음소거'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>

        {/* New Experiment CTA */}
        {currentExperiment && (
          <button
            onClick={() => {
              sound.playClick();
              onNewExperiment();
            }}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-semibold text-slate-950 flex items-center gap-1.5 shadow-md shadow-cyan-500/25 transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>새 실험 질문</span>
          </button>
        )}
      </div>
    </header>
  );
};
