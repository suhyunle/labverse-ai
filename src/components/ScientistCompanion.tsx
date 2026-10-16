import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ExperimentSpec } from '../types';
import { sound } from '../lib/audio';
import { MarkdownText } from './MarkdownText';
import { validateVariableUpdates } from '../verification';
import type { GravityRunResult } from '../simulations/GravitySimulation';

interface FollowUp {
  title: string;
  rationale: string | null;
  variableChanges: Record<string, number>;
}

interface NovaMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  verdict?: 'supported' | 'contradicted' | 'inconclusive' | 'none';
  proposals?: FollowUp[];
  model?: string;
}

interface ScientistCompanionProps {
  experimentSpec: ExperimentSpec;
  currentVariables: Record<string, number>;
  runResult: GravityRunResult | null;
  hypothesis: string;
  onHypothesisChange: (text: string) => void;
  onApplyVariableUpdates: (updates: Record<string, number>) => void;
}

const VERDICT_TEXT: Record<string, { label: string; cls: string }> = {
  supported: { label: '가설과 일치', cls: 'bg-emerald-950 text-emerald-300 border-emerald-500/40' },
  contradicted: { label: '가설과 불일치', cls: 'bg-red-950 text-red-300 border-red-500/40' },
  inconclusive: { label: '판단 보류', cls: 'bg-amber-950 text-amber-300 border-amber-500/40' },
};

const labelOf = (spec: ExperimentSpec, id: string) => spec.variables.find((v) => v.id === id)?.label ?? id;
const unitOf = (spec: ExperimentSpec, id: string) => spec.variables.find((v) => v.id === id)?.unit ?? '';

/** Docked co-scientist panel. Calls the AI only when a run finishes or the student sends a message. */
export const ScientistCompanion: React.FC<ScientistCompanionProps> = ({
  experimentSpec,
  currentVariables,
  runResult,
  hypothesis,
  onHypothesisChange,
  onApplyVariableUpdates,
}) => {
  const [messages, setMessages] = useState<NovaMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [applyErrors, setApplyErrors] = useState<Record<string, string>>({});
  const lastResultsRef = useRef<GravityRunResult | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const specVariables = experimentSpec.variables.map((v) => ({ id: v.id, label: v.label, min: v.min, max: v.max, default: v.default, unit: v.unit }));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, busy]);

  // Fires once per finished run (runId changes); never on slider movement.
  const analysedRunRef = useRef<number | null>(null);
  useEffect(() => {
    if (!runResult || analysedRunRef.current === runResult.runId) return;
    analysedRunRef.current = runResult.runId;
    lastResultsRef.current = runResult;
    let cancelled = false;
    (async () => {
      setBusy('낙하 결과를 분석하는 중...');
      try {
        const res = await fetch('/api/analyze-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variables: runResult.variables,
            specVariables,
            results: { bodies: runResult.bodies, vacuumLandingTime: runResult.vacuumLandingTime },
            hypothesis,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'AI 분석 요청에 실패했습니다.');
        setMessages((prev) => [
          ...prev,
          { id: `a-${runResult.runId}`, role: 'assistant', content: data.analysis, verdict: data.hypothesisVerdict, proposals: data.followUps, model: data.model },
        ]);
        sound.playEureka();
      } catch (err: any) {
        if (!cancelled) setMessages((prev) => [...prev, { id: `e-${runResult.runId}`, role: 'error', content: err?.message || 'AI 분석에 실패했습니다.' }]);
      } finally {
        if (!cancelled) setBusy(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runResult]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    sound.playClick();
    setInput('');
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    setBusy('답변을 작성하는 중...');
    try {
      const res = await fetch('/api/chat-scientist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          experimentTitle: experimentSpec.title,
          currentVariables,
          specVariables,
          lastResults: lastResultsRef.current ? { bodies: lastResultsRef.current.bodies } : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI 응답 요청에 실패했습니다.');
      const proposals: FollowUp[] = data.proposedChanges
        ? [{ title: data.changeSummary || '제안된 조건 변경', rationale: null, variableChanges: data.proposedChanges }]
        : [];
      setMessages((prev) => [...prev, { id: `n-${Date.now()}`, role: 'assistant', content: data.responseText, proposals, model: data.model }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'error', content: err?.message || 'AI 응답에 실패했습니다.' }]);
    } finally {
      setBusy(null);
    }
  };

  // Apply only after the student clicks, and only if the browser-side verification also passes.
  const apply = (key: string, changes: Record<string, number>) => {
    const check = validateVariableUpdates(experimentSpec, changes);
    if (!check.ok) {
      setApplyErrors((p) => ({ ...p, [key]: check.errors.join(' / ') }));
      return;
    }
    sound.playEureka();
    onApplyVariableUpdates(check.accepted);
    setApplied((p) => ({ ...p, [key]: true }));
    setApplyErrors((p) => ({ ...p, [key]: '' }));
  };

  return (
    <div className="p-2.5 rounded-xl bg-slate-900/70 border border-cyan-500/30 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-slate-950" />
        </div>
        <div>
          <div className="text-xs font-bold text-white">노바 박사 · AI 공동 연구자</div>
          <div className="text-[10px] text-slate-400">낙하가 끝나면 결과를 분석하고 다음 실험을 제안합니다</div>
        </div>
      </div>

      <label className="block">
        <span className="text-[11px] text-slate-400">내 가설 (선택, 실행 전에 적어 두세요)</span>
        <input
          type="text"
          value={hypothesis}
          onChange={(e) => onHypothesisChange(e.target.value)}
          placeholder="예: 공기 중에서는 무거운 공이 먼저 떨어질 것이다"
          className="mt-0.5 w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-1 text-[11px] text-white outline-none placeholder-slate-600"
        />
      </label>

      <div className="max-h-72 overflow-y-auto space-y-2 select-text pr-0.5">
        {messages.length === 0 && !busy && (
          <div className="text-[11px] text-slate-500">아직 분석할 결과가 없습니다. 왼쪽에서 낙하를 시작해 끝까지 실행해 보세요.</div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg p-2 text-[11px] leading-relaxed ${
              m.role === 'user' ? 'bg-cyan-900/40 text-cyan-50 ml-6' : m.role === 'error' ? 'bg-red-950/40 border border-red-500/30 text-red-200' : 'bg-slate-950/80 border border-slate-800 text-slate-200'
            }`}
          >
            {m.role === 'error' && <AlertTriangle className="w-3 h-3 inline mr-1 text-red-400" />}
            {m.verdict && VERDICT_TEXT[m.verdict] && (
              <span className={`inline-block mb-1 px-1.5 py-0.5 rounded border text-[10px] font-mono ${VERDICT_TEXT[m.verdict].cls}`}>{VERDICT_TEXT[m.verdict].label}</span>
            )}
            {m.role === 'assistant' ? <MarkdownText>{m.content}</MarkdownText> : <span>{m.content}</span>}
            {m.proposals?.map((p, i) => {
              const key = `${m.id}:${i}`;
              return (
                <div key={key} className="mt-1.5 p-1.5 rounded-lg bg-slate-900 border border-cyan-500/20 space-y-1">
                  <div className="font-bold text-cyan-300">후속 실험: {p.title}</div>
                  {p.rationale && <div className="text-slate-400">{p.rationale}</div>}
                  <div className="font-mono text-[10px] text-slate-300">
                    {Object.entries(p.variableChanges).map(([id, v]) => (
                      <div key={id}>
                        {labelOf(experimentSpec, id)}: {currentVariables[id] ?? '—'} → <span className="text-cyan-200">{v} {unitOf(experimentSpec, id)}</span>
                      </div>
                    ))}
                  </div>
                  {applied[key] ? (
                    <div className="flex items-center gap-1 text-emerald-300">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>적용했습니다. 낙하 시작을 눌러 다시 실행하세요.</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => apply(key, p.variableChanges)}
                      className="px-2 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer"
                    >
                      적용
                    </button>
                  )}
                  {applyErrors[key] && <div className="text-red-300">검증 실패: {applyErrors[key]}</div>}
                </div>
              );
            })}
            {m.model && <div className="mt-1 text-[9px] text-slate-600 font-mono">{m.model}</div>}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-cyan-400 text-[11px] p-1.5">
            <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>{busy}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-1.5"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="노바 박사에게 질문 (예: 달에서는 어떻게 될까?)"
          disabled={!!busy}
          className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none placeholder-slate-600"
        />
        <button
          type="submit"
          disabled={!input.trim() || !!busy}
          className="p-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-40 text-slate-950 cursor-pointer"
          title="보내기"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
