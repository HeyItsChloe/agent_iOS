import { ChevronLeft, Users, Sparkles, Info } from 'lucide-react';
import { useConversationStore } from '../../stores/conversationStore';
import { useAgentStore } from '../../stores/agentStore';


interface HeaderProps {
  onBack?: () => void;
  onOpenAgentSelector: () => void;
  onOpenSkillSelector: () => void;
  onOpenInfo?: () => void;
}

export function Header({ 
  onBack, 
  onOpenAgentSelector, 
  onOpenSkillSelector,
  onOpenInfo 
}: HeaderProps) {
  const { activeConversation } = useConversationStore();
  const { agents } = useAgentStore();

  const agentsArray = Array.from(agents.values());
  const conversationAgents = activeConversation 
    ? activeConversation.agentIds.map(id => agentsArray.find(a => a.id === id)).filter(Boolean)
    : [];

  // No active conversation - show minimal empty header
  // (This state should rarely occur as first conversation is auto-selected)
  if (!activeConversation) {
    return (
      <header className="h-16 bg-ios-card border-b border-ios-separator flex items-center px-4">
      </header>
    );
  }

  const isGroup = activeConversation.type === 'group';
  const isDelegator = activeConversation.type === 'delegator';

  // Generate title: use conversation title, or agent names, or fallback
  const displayTitle = activeConversation.title 
    || conversationAgents.map(a => a?.name).filter(Boolean).join(', ') 
    || 'New Conversation';

  return (
    <header className="h-16 bg-ios-card border-b border-ios-separator flex items-center px-4 gap-3">
      {/* Back button (mobile) */}
      {onBack && (
        <button
          onClick={onBack}
          className="md:hidden w-8 h-8 rounded-full hover:bg-ios-secondary flex items-center justify-center text-ios-blue"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Avatar(s) */}
      <div className="flex -space-x-2">
        {conversationAgents.slice(0, 3).map((agent, i) => (
          <div
            key={agent?.id || i}
            className="w-10 h-10 rounded-full border-2 border-ios-card flex items-center justify-center text-lg"
            style={{ 
              backgroundColor: agent?.color || '#007AFF',
              zIndex: 3 - i 
            }}
          >
            {agent?.avatar || '🤖'}
          </div>
        ))}
        {conversationAgents.length > 3 && (
          <div className="w-10 h-10 rounded-full border-2 border-ios-card bg-ios-secondary flex items-center justify-center text-sm font-medium text-ios-text-secondary">
            +{conversationAgents.length - 3}
          </div>
        )}
      </div>

      {/* Title & Info */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-ios-text truncate">
          {displayTitle}
        </h2>
        <div className="flex items-center gap-2 text-xs text-ios-text-secondary">
          {isGroup && (
            <span className="flex items-center gap-1">
              <Users size={12} />
              {conversationAgents.length} agents
            </span>
          )}
          {isDelegator && (
            <span className="flex items-center gap-1">
              <Sparkles size={12} />
              Delegator mode
            </span>
          )}
          {activeConversation.skillIds.length > 0 && (
            <span className="flex items-center gap-1">
              <Sparkles size={12} />
              {activeConversation.skillIds.length} skills
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenAgentSelector}
          className="w-9 h-9 rounded-full hover:bg-ios-secondary flex items-center justify-center text-ios-blue transition-colors"
          title="Add/Remove Agents"
        >
          <Users size={20} />
        </button>
        <button
          onClick={onOpenSkillSelector}
          className="w-9 h-9 rounded-full hover:bg-ios-secondary flex items-center justify-center text-ios-blue transition-colors"
          title="Add/Remove Skills"
        >
          <Sparkles size={20} />
        </button>
        {onOpenInfo && (
          <button
            onClick={onOpenInfo}
            className="w-9 h-9 rounded-full hover:bg-ios-secondary flex items-center justify-center text-ios-blue transition-colors"
            title="Conversation Info"
          >
            <Info size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
