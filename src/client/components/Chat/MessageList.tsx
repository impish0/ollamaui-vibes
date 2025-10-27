import { useEffect, useRef, useState } from 'react';
import Markdown from './Markdown';
import type { Message } from '../../../shared/types';
import { StreamingMessage } from './StreamingMessage';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
}

export const MessageList = ({ messages, isStreaming, streamingContent }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
      setShowScrollButton(!nearBottom);
    };
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const roleMeta = (m: Message) => ({
    label: m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Assistant' : 'System',
    avatarChar: m.role === 'user' ? 'U' : m.role === 'assistant' ? 'A' : 'S',
    avatarClass:
      m.role === 'user'
        ? 'bg-primary-600'
        : m.role === 'assistant'
        ? 'bg-gray-700 dark:bg-gray-600'
        : 'bg-purple-600',
    bubbleClasses:
      m.role === 'user'
        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
        : m.role === 'assistant'
        ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
        : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  });

  const timeLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 relative">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.length === 0 && !isStreaming ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm mt-2">Type a message below to begin</p>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const meta = roleMeta(message);
              return (
                <div key={message.id} className="py-4">
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${meta.avatarClass} text-white flex items-center justify-center font-semibold`}
                        title={meta.label}
                      >
                        {meta.avatarChar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1 px-1">
                          <span className="font-medium uppercase tracking-wide">{meta.label}</span>
                          {message.model && (
                            <span className="text-gray-500 dark:text-gray-500">{message.model}</span>
                          )}
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">{timeLabel(message.createdAt)}</span>
                          <button
                            className="ml-auto px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-60"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(message.content);
                                setCopiedMessageId(message.id);
                                setTimeout(() => setCopiedMessageId((prev) => (prev === message.id ? null : prev)), 1200);
                              } catch {}
                            }}
                            disabled={copiedMessageId === message.id}
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <div
                          className={`inline-block max-w-full rounded-2xl border shadow-sm px-4 py-3 ${meta.bubbleClasses}`}
                        >
                          <div className="prose dark:prose-invert prose-sm max-w-none break-words">
                            <Markdown content={message.content} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {isStreaming && streamingContent && (
              <StreamingMessage content={streamingContent} isStreaming={isStreaming} />
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-28 right-6 md:right-10 px-3 py-2 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          aria-label="Scroll to bottom"
        >
          ↓
        </button>
      )}
    </div>
  );
};
