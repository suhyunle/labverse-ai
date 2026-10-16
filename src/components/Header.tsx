import React from 'react';
import {
  Volume2,
  VolumeX,
  BookOpen,
  RotateCcw,
  Sparkles,
  Compass,
  FileText,
  Split,
  Target,
  ShieldCheck,
  GitBranch,
  GraduationCap,
} from 'lucide-react';
import { ExperimentSpec, LearningLevel } from '../types';
import { sound } from '../lib/audio';

interface HeaderProps {
  currentExperiment: ExperimentSpec | null;
  onNewExperiment: () => void;
  onResetVariables: () => void;
  onOpenNotebook: () => void;
  onOpenPaperToLab: () => void;
  onOpenParallelUniverse: () => void;
  onOpenHypothesisArena: () => void;
  onOpenEvidenceLens: () => void;
  onOpenResearchTree: () => void;
  snapshotCount: number;
  learningLevel: LearningLevel;
  onChangeLearningLevel: (lvl: LearningLevel) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentExperiment,
  onNewExperiment,
  onResetVariables,
  onOpenNotebook,
  onOpenPaperToLab,
  onOpenParallelUniverse,
  onOpenHypothesisArena,
  onOpenEvidenceLens,
  onOpenResearchTree,
  snapshotCount,
  learningLevel,
  onChangeLearningLevel,
  isMuted,
  onToggleMute,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-slate-950/80 backdrop-blur-xl border-b border-cyan-500/20 px-3 md:px-5 flex items-center justify-between text-white transition-all select-none">
      {/* Brand & Active Experiment Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNewExperiment}
          className="flex items-center gap-2.5 group cursor-pointer text-left"
          title="새 실험 질문하기 (홈)"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-600 p-[1px] flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-400/40 transition">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="text-xs font-black tracking-widest text-cyan-400 font-mono flex items-center gap-1.5">
              <span>GENESIS LAB 3.0</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-normal">
                AI UNIVERSE
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium truncate max-w-[160px] sm:max-w-[260px]">
              {currentExperiment ? currentExperiment.title : 'AI 과학 연구 플랫폼'}
            </div>
          </div>
        </button>

        {/* Paper-to-Lab Quick Action */}
        <button
          onClick={() => {
            sound.playClick();
            onOpenPaperToLab();
          }}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition cursor-pointer"
          title="연구 논문(DOI/URL)을 인터랙티브 실험실로 변환"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span>Paper-to-Lab</span>
        </button>
      </div>

      {/* Center/Right Action Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {currentExperiment && (
          <>
            {/* Parallel Universe Split Mode */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenParallelUniverse();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/50 text-xs text-cyan-300 flex items-center gap-1.5 transition cursor-pointer"
              title="평행 우주 2분할 실시간 대조 실험"
            >
              <Split className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">평행 우주 (Split)</span>
            </button>

            {/* Hypothesis Arena */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenHypothesisArena();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs text-amber-300 flex items-center gap-1.5 transition cursor-pointer"
              title="가설 예측 및 과학적 검증"
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">가설 아레나</span>
            </button>

            {/* Evidence Lens */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenEvidenceLens();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs text-emerald-300 flex items-center gap-1.5 transition cursor-pointer"
              title="에비던스 렌즈 (출처/상수/법칙 신뢰성)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">에비던스 렌즈</span>
            </button>

            {/* Research Tree */}
            <button
              onClick={() => {
                sound.playClick();
                onOpenResearchTree();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs text-purple-300 flex items-center gap-1.5 transition cursor-pointer"
              title="실험 브랜칭 분기 및 연구 타임라인"
            >
              <GitBranch className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden xl:inline">연구 트리</span>
            </button>

            {/* Reset */}
            <button
              onClick={() => {
                sound.playClick();
                onResetVariables();
              }}
              className="p-1.5 sm:px-2 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-white transition cursor-pointer"
              title="변수 기본값 리셋"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {/* Adaptive Learning Level Dropdown */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs">
          <GraduationCap className="w-3.5 h-3.5 text-cyan-400 hidden sm:inline" />
          <select
            value={learningLevel}
            onChange={(e) => {
              sound.playClick();
              onChangeLearningLevel(e.target.value as LearningLevel);
            }}
            className="bg-transparent text-slate-300 text-xs outline-none cursor-pointer"
          >
            <option value="beginner" className="bg-slate-900 text-white">초급 (직관)</option>
            <option value="intermediate" className="bg-slate-900 text-white">중급 (공식/지표)</option>
            <option value="advanced" className="bg-slate-900 text-white">고급 (논문/한계)</option>
          </select>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={onToggleMute}
          className="p-1.5 sm:p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
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
            <span>새 탐구</span>
          </button>
        )}
      </div>
    </header>
  );
};
