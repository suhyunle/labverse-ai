import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, ChevronDown, ChevronUp, Zap, CheckCircle2, X } from 'lucide-react';
import { ExperimentSpec, ChatMessage } from '../types';
import { sound } from '../lib/audio';

interface ScientistCompanionProps {
  experimentSpec: ExperimentSpec;
  currentVariables: Record<string, number>;
  liveMetrics: Record<string, number | string>;
  onApplyVariableUpdates: (updates: Record<string, number>) => void;
}

export const ScientistCompanion: React.FC<ScientistCompanionProps> = ({
  experimentSpec,
  currentVariables,
  liveMetrics,
  onApplyVariableUpdates,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: `안녕하세요! AI 수석 연구원 **노바 박사(Dr. Nova)**입니다.
"${experimentSpec.title}" 실험실에서 무엇이든 탐구해 보세요.
**"압력을 최대로 올려줘"**처럼 말씀하시면 3D 시뮬레이션에 즉시 반영됩니다.`,
      timestamp: Date.now(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || isSending) return;

    sound.playClick();
    setInput('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const response = await fetch('/api/chat-scientist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          experimentSpec,
          currentVariables,
          liveMetrics,
        }),
      });

      const data = await response.json();

      if (data.variableUpdates && Object.keys(data.variableUpdates).length > 0) {
        sound.playEureka();
        onApplyVariableUpdates(data.variableUpdates);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.responseText || '실험 변수와의 상호작용을 관측했습니다.',
        timestamp: Date.now(),
        actionSummary: data.actionSummary,
        variableUpdates: data.variableUpdates,
        followUpSuggestion: data.followUpSuggestion,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Companion request error:', err);
      const fallbackMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content:
          '가상 연구실의 물리 시뮬레이션 데이터를 실시간 분석 중입니다. 슬라이더로 변수를 직접 조작하거나 다른 가설을 시험해 보세요.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Compact Header Pill when collapsed (Minimizes screen occlusion) */}
      {!isOpen ? (
        <button
          onClick={() => {
            sound.playClick();
            setIsOpen(true);
          }}
          className="fixed top-16 right-72 sm:right-80 z-30 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-cyan-500/40 backdrop-blur-xl shadow-xl shadow-black/60 text-white flex items-center gap-2 cursor-pointer transition hover:scale-105 select-none"
          title="AI 과학 동반자 Dr. Nova 카드 펼치기"
        >
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-slate-950 shadow-sm font-bold">
            <Bot className="w-3.5 h-3.5 text-slate-950" />
          </div>
          <span className="text-xs font-bold text-cyan-300 font-mono">Dr. Nova AI</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      ) : (
        /* Expanded Floating Card (Right-docked, restrained footprint, non-occluding) */
        <div className="fixed top-28 right-4 z-40 w-80 sm:w-92 h-[480px] bg-slate-950/92 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl shadow-2xl shadow-black/90 flex flex-col text-white animate-fade-in select-none">
          {/* Card Header */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-slate-950 shadow-md">
                <Bot className="w-4 h-4 text-slate-950" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>노바 박사 (Dr. Nova)</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono">
                    AI 과학자
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">자연어 물리 조작 & 탐구 안내</div>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setIsOpen(false);
              }}
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="카드 접기"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs select-text">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-xl p-2.5 leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-none shadow'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow'
                    }`}
                  >
                    <p className="whitespace-pre-line text-xs">{msg.content}</p>

                    {/* Action execution feedback */}
                    {msg.actionSummary && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-700/60 flex items-center gap-1.5 text-[10px] text-emerald-300 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{msg.actionSummary}</span>
                      </div>
                    )}

                    {msg.followUpSuggestion && (
                      <div
                        onClick={() => handleSendMessage(msg.followUpSuggestion)}
                        className="mt-1.5 text-[10px] text-cyan-300 bg-slate-950/70 p-1.5 rounded border border-cyan-500/20 hover:border-cyan-400/50 cursor-pointer transition flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>추천: &ldquo;{msg.followUpSuggestion}&rdquo;</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-2 text-cyan-400 text-xs p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>물리 상태를 분석 중입니다...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Queries Chips */}
          {experimentSpec.suggestedQueries && experimentSpec.suggestedQueries.length > 0 && (
            <div className="px-2.5 py-1.5 border-t border-slate-800/80 bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>추천:</span>
              </span>
              {experimentSpec.suggestedQueries.slice(0, 2).map((query, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(query)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 transition shrink-0 cursor-pointer truncate max-w-[140px]"
                  title={query}
                >
                  {query}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 border-t border-slate-800 bg-slate-950/90 flex items-center gap-1.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="명령 또는 질문 (예: 압력 최대로)"
              disabled={isSending}
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
