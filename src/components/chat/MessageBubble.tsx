import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, AlertCircle } from 'lucide-react';
import type { Message, SubAgentResult } from '../../types/message';
import { formatTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  showName?: boolean;
}

export function MessageBubble({ message, showAvatar = true, showName = true }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isError = message.status === 'error';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 bg-ios-secondary rounded-full text-sm text-ios-text-secondary">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex gap-2 mb-3 px-4',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      {showAvatar && !isUser && (
        <div
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm"
          style={{ backgroundColor: message.agentColor || '#007AFF' }}
        >
          {message.agentName?.[0] || '🤖'}
        </div>
      )}
      {showAvatar && isUser && <div className="w-8" />}

      {/* Bubble */}
      <div className={cn(
        'max-w-[75%] flex flex-col',
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* Agent name */}
        {showName && !isUser && message.agentName && (
          <span className="text-xs text-ios-text-secondary mb-1 ml-3">
            {message.agentName}
          </span>
        )}

        {/* Message content */}
        <div
          className={cn(
            'px-4 py-2 rounded-2xl break-words',
            isUser
              ? 'bg-ios-blue text-white rounded-br-md'
              : 'bg-ios-bubble-received text-ios-text rounded-bl-md',
            isError && 'bg-red-500/10 border border-red-500/20'
          )}
        >
          {isError && (
            <div className="flex items-center gap-1 text-red-500 text-xs mb-1">
              <AlertCircle size={12} />
              <span>Error</span>
            </div>
          )}
          
          <MessageContent content={message.content} />
          
          {/* Tool name indicator */}
          {message.toolName && (
            <div className="mt-2">
              <ToolCallBadge name={message.toolName} />
            </div>
          )}
        </div>

        {/* Sub-agent results */}
        {message.subAgentResults && message.subAgentResults.length > 0 && (
          <div className="mt-2 space-y-2 w-full">
            {message.subAgentResults.map((result, i) => (
              <SubAgentResultCard key={i} result={result} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className={cn(
          'flex items-center gap-1 mt-1 text-xs text-ios-text-secondary',
          isUser ? 'mr-3' : 'ml-3'
        )}>
          <span>{formatTime(new Date(message.timestamp))}</span>
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if content contains code blocks
  const hasCode = content.includes('```');

  if (hasCode) {
    return (
      <div className="relative group">
        <div className="whitespace-pre-wrap font-mono text-sm">
          {content.split('```').map((part, i) => {
            if (i % 2 === 1) {
              // Code block
              const lines = part.split('\n');
              const language = lines[0] || '';
              const code = lines.slice(1).join('\n');
              return (
                <pre
                  key={i}
                  className="my-2 p-3 bg-black/10 dark:bg-white/10 rounded-lg overflow-x-auto text-xs"
                >
                  {language && (
                    <div className="text-ios-text-secondary mb-2">{language}</div>
                  )}
                  <code>{code || part}</code>
                </pre>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1 rounded bg-ios-secondary opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    );
  }

  return <p className="whitespace-pre-wrap">{content}</p>;
}

function ToolCallBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
      {name}
    </span>
  );
}

function SubAgentResultCard({ result }: { result: SubAgentResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-ios-secondary rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-ios-secondary/80"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
          style={{ backgroundColor: '#8B5CF6' }}
        >
          {result.icon || result.agentName[0]}
        </div>
        <span className="font-medium text-sm text-ios-text">{result.agentName}</span>
        <span className="text-xs text-ios-text-secondary ml-auto">Sub-agent</span>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-ios-separator">
          <p className="text-sm text-ios-text whitespace-pre-wrap">{result.content}</p>
        </div>
      )}
    </div>
  );
}
