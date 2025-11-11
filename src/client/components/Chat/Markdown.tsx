import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownProps {
  content: string;
  defaultOpenThinking?: boolean;
}

export const Markdown: React.FC<MarkdownProps> = ({ content, defaultOpenThinking = false }) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Collapsible thinking block component
  const ThinkBlock: React.FC<{ text: string; variant: 'tag' | 'fence' }> = ({ text }) => {
    const [open, setOpen] = useState<boolean>(defaultOpenThinking);
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
    // Tag variants (case-insensitive): think, thinking, reasoning
    const TAGS = ['think', 'thinking', 'reasoning'];
    const findNextTagOpen = (from: number) => {
      let best = -1;
      let tag = '';
      for (const t of TAGS) {
        const idx = src.toLowerCase().indexOf(`<${t}>`, from);
        if (idx !== -1 && (best === -1 || idx < best)) {
          best = idx;
          tag = t;
        }
      }
      return { idx: best, tag } as const;
    };
    const findCloseFor = (tag: string, from: number) => src.toLowerCase().indexOf(`</${tag}>`, from);

    // Fence variants: thinking, reasoning, thoughts, cot
    const FENCES = ['thinking', 'reasoning', 'thoughts', 'cot'];
    const findNextFence = (from: number) => {
      let best = -1;
      let fence = '';
      for (const f of FENCES) {
        const idx = src.indexOf('```' + f, from);
        if (idx !== -1 && (best === -1 || idx < best)) {
          best = idx;
          fence = f;
        }
      }
      return { idx: best, fence } as const;
    };
    while (i < src.length) {
      const { idx: tagStart, tag: openTag } = findNextTagOpen(i);
      const { idx: fenceStart } = findNextFence(i);
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
        const close = openTag ? findCloseFor(openTag, start + (`<${openTag}>`).length) : -1;
        if (close === -1) {
          // No close tag; treat rest as normal
          out.push({ type: 'normal', text: src.slice(start) });
          break;
        }
        const inner = src.slice(start + (`<${openTag}>`).length, close);
        out.push({ type: 'thinking', text: inner.trim(), variant: 'tag' });
        i = close + (`</${openTag}>`).length;
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
        <div className="relative group my-3">
          {/* Language label and copy button header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-200 dark:bg-gray-800 border border-b-0 border-gray-300 dark:border-gray-700 rounded-t-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              {match ? match[1] : 'code'}
            </span>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(codeText);
                  const hash = codeText.slice(0, 20);
                  setCopiedHash(hash);
                  setTimeout(() => setCopiedHash((prev) => (prev === hash ? null : prev)), 1200);
                } catch {}
              }}
              aria-label="Copy code"
              title="Copy to clipboard"
            >
              {copiedHash === codeText.slice(0, 20) ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/>
                  <path d="M5 15V5a2 2 0 012-2h10" strokeWidth="2"/>
                </svg>
              )}
            </button>
          </div>
          {/* Code block */}
          <pre className={`${className} !mt-0 !rounded-t-none border-t-0`}>
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
          <div key={`md-${idx}`} className="markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={markdownComponents}
            >
              {b.text}
            </ReactMarkdown>
          </div>
        )
      )}
    </div>
  );
};

export default Markdown;
