import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
}

export const StreamingMessage = ({ content, isStreaming }: StreamingMessageProps) => {
  return (
    <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
        <svg
          className="w-5 h-5 text-primary-600 dark:text-primary-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">
          Assistant
        </div>
        <div className="prose dark:prose-invert prose-sm max-w-none">
          {content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              className="markdown"
            >
              {content}
            </ReactMarkdown>
          ) : null}
          {isStreaming && (
            <span className="inline-flex items-center ml-1">
              <span className="typing-indicator flex gap-1">
                <span className="w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full"></span>
                <span className="w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full"></span>
                <span className="w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full"></span>
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
