import type { ExperimentSpec } from '../types';
import type { VerificationReport } from '../verification';

export type PlanEvent =
  | { type: 'step'; step: 'generate'; attempt: number; maxAttempts: number }
  | { type: 'step'; step: 'verify'; attempt?: number; model?: string }
  | { type: 'retry'; attempt: number; errors: string[] }
  | {
      type: 'done';
      experiment: ExperimentSpec;
      verification: VerificationReport;
      source: 'ai' | 'preset';
      model?: string;
      notice?: string;
      attempts: number;
      ms: number;
    }
  | { type: 'error'; code: string; message: string };

export type PlanDone = Extract<PlanEvent, { type: 'done' }>;

/** Human-readable text for a progress event: only describes work the server actually did. */
export function describePlanEvent(e: PlanEvent): string | null {
  if (e.type === 'step' && e.step === 'generate') return `AI가 실험 스펙을 생성하는 중 (${e.attempt}/${e.maxAttempts}회)`;
  if (e.type === 'step' && e.step === 'verify') return '생성된 스펙을 검증하는 중';
  if (e.type === 'retry') return `검증 실패 → 오류를 AI에 전달해 재생성 중 (${e.errors[0] ?? ''})`;
  return null;
}

/** POSTs to /api/plan-experiment and consumes the NDJSON progress stream. */
export async function planExperiment(
  body: { query: string; paperContext?: unknown },
  onEvent: (e: PlanEvent) => void,
): Promise<PlanDone> {
  const res = await fetch('/api/plan-experiment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error('실험 생성 요청에 실패했습니다.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done: PlanDone | null = null;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as PlanEvent;
    onEvent(event);
    if (event.type === 'error') throw new Error(event.message);
    if (event.type === 'done') done = event;
  };

  for (;;) {
    const { value, done: finished } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      handleLine(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 1);
    }
    if (finished) break;
  }
  handleLine(buffer);
  if (!done) throw new Error('서버가 결과를 반환하지 않았습니다.');
  return done;
}
