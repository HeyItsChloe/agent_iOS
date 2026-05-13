import { ChevronLeft, MoreHorizontal, Users, Sparkles } from 'lucide-react';
import { useConversationStore } from '../../stores/conversationStore';
import { useAgentStore } from '../../stores/agentStore';
import { ConversationType } from '../../types/conversation';

interface HeaderProps {
  onBack?: () => void;
  onOpenAgentSelector: () => void;
  onOpenSkillSelector: () => void;
  onOpenMenu?: () => void;
}

export function Header({ 
  onBack, 
  onOpenAgentSelector, 
  onOpenSkillSelector,
  onOpenMenu 
}: HeaderProps) {
  const { activeConversation } = useConversationStore();
  const { agents } = useAgentStore();

  if (!activeConversation) {
    return (
      <header className="h-16 bg-ios-card border-b border-ios-separator flex items-center px-4">
        <h2 className="text-lg font-semibold text-ios-text">Select a conversation</h2>
      </header>
    );
  }

  const conversationAgents = activeConversation.agentIds
    .map(id => agents.find(a => a.id === id))
    .filter(Boolean);

  const isGroup = activeConversation.type === ConversationType.GROUP;
  const isDelegator = activeConversation.type === ConversationType.DELEGATOR;

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
          {activeConversation.title || 'New Conversation'}
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
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            className="w-9 h-9 rounded-full hover:bg-ios-secondary flex items-center justify-center text-ios-text-secondary transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
