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
            {messages.map((message, idx) => {
              const meta = roleMeta(message);
              const prev = idx > 0 ? messages[idx - 1] : undefined;
              const sameRoleAsPrev = prev && prev.role === message.role;
              const thisDate = new Date(message.createdAt);
              const prevDate = prev ? new Date(prev.createdAt) : null;
              const dayChanged = !prevDate || thisDate.toDateString() !== prevDate.toDateString();
              const dividerLabel = (() => {
                if (!dayChanged) return null;
                const now = new Date();
                const d = thisDate;
                const isToday = d.toDateString() === now.toDateString();
                const y = new Date(now);
                y.setDate(now.getDate() - 1);
                const isYesterday = d.toDateString() === y.toDateString();
                if (isToday) return 'Today';
                if (isYesterday) return 'Yesterday';
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
              })();
              return (
                <div key={message.id} className={sameRoleAsPrev ? 'py-2' : 'py-4'}>
                  <div className="max-w-4xl mx-auto">
                    {dividerLabel && (
                      <div className="my-6 flex items-center justify-center">
                        <span className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800">
                          {dividerLabel}
                        </span>
                      </div>
                    )}
                    {message.role === 'assistant' ? (
                      <div className="flex-1 min-w-0 group">
                        <div className="prose dark:prose-invert prose-sm max-w-none break-words">
                          <Markdown content={message.content} />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {message.model && <span className="text-gray-500 dark:text-gray-500">{message.model}</span>}
                          <span className="text-gray-400">•</span>
                          <span>{timeLabel(message.createdAt)}</span>
                          <button
                            className="ml-auto p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-60"
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
                            {copiedMessageId === message.id ? (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            ) : (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/><path d="M5 15V5a2 2 0 012-2h10" strokeWidth="2"/></svg>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="ml-auto max-w-[80%] sm:max-w-[70%] md:max-w-[66%] group">
                          <div className={`relative block w-full rounded-2xl border shadow-sm px-4 py-3 ${meta.bubbleClasses}`}>
                            <button
                              className="absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-60"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(message.content);
                                  setCopiedMessageId(message.id);
                                  setTimeout(() => setCopiedMessageId((prev) => (prev === message.id ? null : prev)), 1200);
                                } catch {}
                              }}
                              disabled={copiedMessageId === message.id}
                              title="Copy message"
                              aria-label="Copy message"
                            >
                              {copiedMessageId === message.id ? (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              ) : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/><path d="M5 15V5a2 2 0 012-2h10" strokeWidth="2"/></svg>
                              )}
                            </button>
                            <div className="prose dark:prose-invert prose-sm max-w-none break-words">
                              <Markdown content={message.content} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <span className="text-gray-500">{timeLabel(message.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    )}
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
