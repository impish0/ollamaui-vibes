import Markdown from './Markdown';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
}

export const StreamingMessage = ({ content, isStreaming }: StreamingMessageProps) => {
  return (
    <div className="py-4">
      <div className="max-w-4xl mx-auto">
        <div className="font-medium text-xs mb-2 text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Assistant
        </div>
        <div className="prose dark:prose-invert prose-sm max-w-none">
          {content ? <Markdown content={content} /> : null}
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
