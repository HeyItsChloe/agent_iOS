import { cn } from '../../utils/cn';

interface TypingIndicatorProps {
  agentName?: string;
  agentColor?: string;
  className?: string;
}

export function TypingIndicator({ agentName, agentColor = '#007AFF', className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2 px-4 mb-3', className)}>
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm"
        style={{ backgroundColor: agentColor }}
      >
        {agentName?.[0] || '🤖'}
      </div>

      {/* Typing bubble */}
      <div className="flex flex-col items-start">
        {agentName && (
          <span className="text-xs text-ios-text-secondary mb-1 ml-3">
            {agentName}
          </span>
        )}
        <div className="px-4 py-3 bg-ios-bubble-received rounded-2xl rounded-bl-md">
          <div className="flex items-center gap-1">
            <TypingDot delay={0} />
            <TypingDot delay={150} />
            <TypingDot delay={300} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <span
      className="w-2 h-2 bg-ios-text-secondary rounded-full animate-bounce"
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: '600ms',
      }}
    />
  );
}

interface MultiAgentTypingProps {
  agents: Array<{ name: string; color: string }>;
}

export function MultiAgentTyping({ agents }: MultiAgentTypingProps) {
  if (agents.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 mb-3">
      {/* Stacked avatars */}
      <div className="flex -space-x-2">
        {agents.slice(0, 3).map((agent, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full border-2 border-ios-background flex items-center justify-center text-white text-xs"
            style={{ backgroundColor: agent.color, zIndex: 3 - i }}
          >
            {agent.name[0]}
          </div>
        ))}
      </div>

      {/* Typing indicator */}
      <div className="px-4 py-3 bg-ios-bubble-received rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ios-text-secondary">
            {agents.length === 1
              ? `${agents[0].name} is typing`
              : agents.length === 2
              ? `${agents[0].name} and ${agents[1].name} are typing`
              : `${agents.length} agents are typing`}
          </span>
          <div className="flex items-center gap-1">
            <TypingDot delay={0} />
            <TypingDot delay={150} />
            <TypingDot delay={300} />
          </div>
        </div>
      </div>
    </div>
  );
}
