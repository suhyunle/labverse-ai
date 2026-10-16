import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * CommonMark refuses to close `**bold**` when it ends in punctuation and is followed directly by a
 * letter, which is the norm in Korean ("**반박(contradicted)**합니다"). A thin space after the
 * closing marker restores the intended bold without visibly changing the text.
 */
const fixKoreanEmphasis = (text: string) =>
  text.replace(/\*\*([^*\n]+?)\*\*(?=[0-9A-Za-z가-힣])/g, (m, inner: string) => (/[\p{P}\p{S}]$/u.test(inner) ? `**${inner}**\u2009` : m));

/** Renders AI text: **bold**, lists and $...$ / $$...$$ LaTeX (KaTeX). */
export const MarkdownText: React.FC<{ children: string }> = ({ children }) => (
  <ReactMarkdown
    remarkPlugins={[remarkMath]}
    rehypePlugins={[rehypeKatex]}
    components={{
      p: ({ children: c }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{c}</p>,
      ul: ({ children: c }) => <ul className="list-disc ml-4 mb-1.5 space-y-0.5">{c}</ul>,
      ol: ({ children: c }) => <ol className="list-decimal ml-4 mb-1.5 space-y-0.5">{c}</ol>,
      strong: ({ children: c }) => <strong className="text-cyan-200 font-bold">{c}</strong>,
      code: ({ children: c }) => <code className="px-1 rounded bg-slate-800 font-mono text-[11px]">{c}</code>,
    }}
  >
    {fixKoreanEmphasis(children)}
  </ReactMarkdown>
);
