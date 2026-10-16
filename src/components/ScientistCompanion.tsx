import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, ChevronLeft, ChevronRight, Zap, CheckCircle2, MessageSquare } from 'lucide-react';
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
      content: `안녕하세요! 저는 AI 수석 연구원 **노바 박사(Dr. Nova)**입니다. 
"${experimentSpec.title}" 실험실에 오신 것을 환영합니다! 
시뮬레이션 조작 중 궁금한 물리 현상이 있거나, **"압력을 최대로 올려줘"**처럼 자연어로 실험 조건을 바꾸고 싶으시면 언제든 말씀해 주세요.`,
      timestamp: Date.now(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          '현재 가상 연구실의 물리 시뮬레이션 데이터를 실시간 분석 중입니다. 슬라이더를 통해 변수를 직접 변경하시거나 다른 가설을 시험해 보세요.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button (When drawer is closed) */}
      {!isOpen && (
        <button
          onClick={() => {
            sound.playClick();
            setIsOpen(true);
          }}
          className="fixed top-16 left-4 z-30 px-3.5 py-2.5 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border border-cyan-500/40 backdrop-blur-xl shadow-xl shadow-cyan-950/50 text-white flex items-center gap-2.5 cursor-pointer transition hover:scale-105 select-none"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-slate-950 shadow-md">
            <Bot className="w-4 h-4 text-slate-950 font-bold" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-cyan-300 flex items-center gap-1">
              <span>Dr. Nova</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-slate-400">AI 과학 동반자 대화</div>
          </div>
        </button>
      )}

      {/* Slide-out Drawer */}
      <div
        className={`fixed top-14 left-0 bottom-0 z-40 w-80 sm:w-96 bg-slate-950/90 backdrop-blur-2xl border-r border-cyan-500/30 shadow-2xl transition-transform duration-300 flex flex-col text-white ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
              <Bot className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>노바 박사 (Dr. Nova)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono">
                  CHIEF AI SCIENTIST
                </span>
              </div>
              <div className="text-[10px] text-slate-400">자연어 실험 명령 및 과학 탐구 안내</div>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              setIsOpen(false);
            }}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="패널 닫기"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>

                  {/* Render executed variable action feedback badge */}
                  {msg.actionSummary && (
                    <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{msg.actionSummary}</span>
                    </div>
                  )}

                  {msg.followUpSuggestion && (
                    <div
                      onClick={() => handleSendMessage(msg.followUpSuggestion)}
                      className="mt-2 text-[10px] text-cyan-300/90 bg-slate-950/70 p-1.5 rounded border border-cyan-500/20 hover:border-cyan-400/50 cursor-pointer transition flex items-center gap-1"
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
              <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>노바 박사가 물리 상태를 분석 중입니다...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries Chips */}
        {experimentSpec.suggestedQueries && experimentSpec.suggestedQueries.length > 0 && (
          <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/50">
            <div className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>빠른 질문 및 실험 명령:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {experimentSpec.suggestedQueries.slice(0, 3).map((query, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(query)}
                  className="text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 transition text-left cursor-pointer"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="자연어로 질문하거나 명령하세요 (예: 압력 최대)"
            disabled={isSending}
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
};
