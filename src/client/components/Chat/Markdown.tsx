import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownProps {
  content: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Collapsible thinking block component
  const ThinkBlock: React.FC<{ text: string; variant: 'tag' | 'fence' }> = ({ text }) => {
    const [open, setOpen] = useState(false);
    return (
      <div className="my-3 border border-yellow-300/40 dark:border-yellow-700/40 bg-yellow-50/40 dark:bg-yellow-900/10 rounded-lg">
        <div className="px-3 py-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-yellow-700 dark:text-yellow-300" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 18h6M10 22h4M2 11a7 7 0 0114 0c0 2-1 3-2 4H8c-1-1-2-2-2-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-xs text-yellow-800 dark:text-yellow-200 select-none">Thinking</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="ml-auto text-xs px-2 py-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-800/40 text-yellow-900 dark:text-yellow-200"
            aria-expanded={open}
          >
            {open ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            className="ml-1 p-1.5 rounded hover:bg-yellow-100 dark:hover:bg-yellow-800/40 text-yellow-900 dark:text-yellow-200"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
              } catch {}
            }}
            title="Copy thinking"
            aria-label="Copy thinking"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/><path d="M5 15V5a2 2 0 012-2h10" strokeWidth="2"/></svg>
          </button>
        </div>
        {open && (
          <div className="px-3 pb-3">
            <pre className="whitespace-pre-wrap text-sm bg-transparent p-0 m-0 text-yellow-900 dark:text-yellow-200">
              {text}
            </pre>
          </div>
        )}
      </div>
    );
  };

  type Block = { type: 'normal'; text: string } | { type: 'thinking'; text: string; variant: 'tag' | 'fence' };

  const blocks: Block[] = useMemo(() => {
    const src = content ?? '';
    const out: Block[] = [];
    let i = 0;
    const THINK_OPEN = '<think>';
    const THINK_CLOSE = '</think>';
    while (i < src.length) {
      const tagStart = src.indexOf(THINK_OPEN, i);
      const fenceStart = src.indexOf('```thinking', i);
      const candidates = [tagStart, fenceStart].filter((x) => x !== -1) as number[];
      if (candidates.length === 0) {
        out.push({ type: 'normal', text: src.slice(i) });
        break;
      }
      const start = Math.min(...candidates);
      if (start > i) {
        out.push({ type: 'normal', text: src.slice(i, start) });
      }
      if (start === tagStart) {
        const close = src.indexOf(THINK_CLOSE, start + THINK_OPEN.length);
        if (close === -1) {
          // No close tag; treat rest as normal
          out.push({ type: 'normal', text: src.slice(start) });
          break;
        }
        const inner = src.slice(start + THINK_OPEN.length, close);
        out.push({ type: 'thinking', text: inner.trim(), variant: 'tag' });
        i = close + THINK_CLOSE.length;
      } else {
        // thinking fence
        const headerEnd = src.indexOf('\n', fenceStart);
        if (headerEnd === -1) {
          out.push({ type: 'normal', text: src.slice(fenceStart) });
          break;
        }
        // Find closing fence ``` after header
        let fenceClose = src.indexOf('\n```', headerEnd + 1);
        if (fenceClose === -1) fenceClose = src.indexOf('```', headerEnd + 1);
        if (fenceClose === -1) {
          out.push({ type: 'normal', text: src.slice(fenceStart) });
          break;
        }
        const inner = src.slice(headerEnd + 1, fenceClose).replace(/\n$/, '');
        out.push({ type: 'thinking', text: inner, variant: 'fence' });
        i = fenceClose + 3; // skip closing ```
      }
    }
    return out;
  }, [content]);

  const markdownComponents: any = {
    code({ node, inline: _inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeText = String(children).replace(/\n$/, '');

      // Inline code when not in a code block
      const isInline = _inline || !className?.includes('language-');
      if (isInline) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }

      return (
        <div className="relative group">
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              className="p-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(codeText);
                  const hash = codeText.slice(0, 20);
                  setCopiedHash(hash);
                  setTimeout(() => setCopiedHash((prev) => (prev === hash ? null : prev)), 1200);
                } catch {}
              }}
              aria-label="Copy code"
            >
              {copiedHash === codeText.slice(0, 20) ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/><path d="M5 15V5a2 2 0 012-2h10" strokeWidth="2"/></svg>
              )}
            </button>
          </div>
          {match && (
            <div className="absolute left-0 top-0 text-[10px] uppercase tracking-wide px-2 py-1 text-gray-500 dark:text-gray-400">
              {match[1]}
            </div>
          )}
          <pre className={className}>
            <code {...props}>{codeText}</code>
          </pre>
        </div>
      );
    },
  };

  return (
    <div>
      {blocks.map((b, idx) =>
        b.type === 'thinking' ? (
          <ThinkBlock key={`think-${idx}`} text={b.text} variant={b.variant} />
        ) : (
          <ReactMarkdown
            key={`md-${idx}`}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            className="markdown"
            components={markdownComponents}
          >
            {b.text}
          </ReactMarkdown>
        )
      )}
    </div>
  );
};

export default Markdown;
