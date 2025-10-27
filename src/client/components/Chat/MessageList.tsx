import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Message } from '../../../shared/types';
import { StreamingMessage } from './StreamingMessage';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
}

export const MessageList = ({ messages, isStreaming, streamingContent }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.length === 0 && !isStreaming ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm mt-2">Type a message below to begin</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`py-4 ${
                  message.role === 'user'
                    ? 'bg-gray-50 dark:bg-gray-900/50'
                    : ''
                }`}
              >
                <div className="max-w-4xl mx-auto">
                  <div className="font-medium text-xs mb-2 text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    {message.role === 'user' ? 'You' : 'Assistant'}
                    {message.model && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-500 font-normal normal-case">
                        {message.model}
                      </span>
                    )}
                  </div>
                  <div className="prose dark:prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      className="markdown"
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isStreaming && streamingContent && (
              <StreamingMessage content={streamingContent} isStreaming={isStreaming} />
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
