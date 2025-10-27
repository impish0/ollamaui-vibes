import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownProps {
  content: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      className="markdown"
      components={{
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
                  className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
                  onClick={() => navigator.clipboard.writeText(codeText)}
                  aria-label="Copy code"
                >
                  Copy
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
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default Markdown;
