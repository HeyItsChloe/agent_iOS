import { useState } from 'react';
import { Plus, Search, MessageSquare } from 'lucide-react';
import { useConversationStore } from '../../stores/conversationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAgentStore } from '../../stores/agentStore';
import type { Conversation } from '../../types/conversation';
import { formatRelativeTime } from '../../utils/formatters';

interface SidebarProps {
  onNewChat: () => void;
}

// Helper to get last message from conversation
function getLastMessageContent(conv: Conversation): string | null {
  if (!conv.messages || conv.messages.length === 0) return null;
  return conv.messages[conv.messages.length - 1].content;
}

export function Sidebar({ onNewChat }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    conversations, 
    activeConversationId, 
    setActiveConversation 
  } = useConversationStore();
  const { compactMode } = useSettingsStore();
  const { agents } = useAgentStore();

  const conversationsArray = Array.from(conversations.values());
  const filteredConversations = conversationsArray.filter(conv => {
    const lastMsg = getLastMessageContent(conv);
    return conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMsg?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (compactMode) {
    return (
      <div className="w-16 bg-ios-sidebar border-r border-ios-separator flex flex-col items-center py-4">
        <button
          onClick={onNewChat}
          className="w-10 h-10 rounded-full bg-ios-blue flex items-center justify-center text-white mb-4 hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
        </button>
        <div className="flex-1 overflow-y-auto w-full">
          {conversationsArray.slice(0, 10).map(conv => (
            <CompactConversationItem
              key={conv.id}
              conversation={conv}
              isActive={activeConversationId === conv.id}
              onClick={() => setActiveConversation(conv.id)}
              agents={agents}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-ios-sidebar border-r border-ios-separator flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-ios-separator">
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={onNewChat}
            className="w-8 h-8 rounded-full bg-ios-blue flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-text-secondary" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-ios-secondary rounded-lg text-sm text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-ios-text-secondary">
            <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
            <p>No conversations yet</p>
            <button
              onClick={onNewChat}
              className="mt-2 text-ios-blue hover:underline"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          filteredConversations.map(conv => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={activeConversationId === conv.id}
              onClick={() => setActiveConversation(conv.id)}
              agents={agents}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  agents: Map<string, import('../../types/agent').Agent>;
}

function ConversationItem({ conversation, isActive, onClick, agents }: ConversationItemProps) {
  const lastMessage = conversation.messages?.[conversation.messages.length - 1];
  const conversationAgents = conversation.agentIds
    .map(id => agents.get(id))
    .filter(Boolean);
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 flex gap-3 hover:bg-ios-secondary/50 transition-colors border-b border-ios-separator ${
        isActive ? 'bg-ios-blue/10' : ''
      }`}
    >
      {/* Avatar(s) - iOS Messages style */}
      <div className="flex-shrink-0 flex items-center">
        {conversationAgents.length === 0 ? (
          <div className="w-12 h-12 rounded-full bg-gradient-to-b from-gray-300 to-gray-400 flex items-center justify-center text-white text-lg">
            🤖
          </div>
        ) : conversationAgents.length === 1 ? (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg"
            style={{ backgroundColor: conversationAgents[0]?.color || '#007AFF' }}
          >
            {conversationAgents[0]?.avatar || conversationAgents[0]?.name?.[0] || '🤖'}
          </div>
        ) : (
          <div className="flex -space-x-3">
            {conversationAgents.map((agent, i) => (
              <div
                key={agent?.id || i}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm border-2 border-ios-sidebar"
                style={{ backgroundColor: agent?.color || '#007AFF', zIndex: conversationAgents.length - i }}
              >
                {agent?.avatar || agent?.name?.[0] || '🤖'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <span className={`font-medium truncate ${isActive ? 'text-ios-blue' : 'text-ios-text'}`}>
            {conversation.title || conversationAgents.map(a => a?.name).filter(Boolean).join(', ') || 'New Conversation'}
          </span>
          {lastMessage && (
            <span className="text-xs text-ios-text-secondary flex-shrink-0 ml-2">
              {formatRelativeTime(new Date(lastMessage.timestamp))}
            </span>
          )}
        </div>
        <p className="text-sm text-ios-text-secondary truncate">
          {lastMessage?.content || 'No messages yet'}
        </p>
      </div>
    </button>
  );
}

interface CompactConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  agents: Map<string, import('../../types/agent').Agent>;
}

function CompactConversationItem({ conversation, isActive, onClick, agents }: CompactConversationItemProps) {
  const conversationAgents = conversation.agentIds
    .map(id => agents.get(id))
    .filter(Boolean);

  return (
    <button
      onClick={onClick}
      className={`w-full p-2 flex justify-center ${isActive ? 'bg-ios-blue/10' : ''}`}
    >
      {conversationAgents.length === 0 ? (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ios-blue to-purple-500 flex items-center justify-center text-white text-sm">
          {conversation.title?.[0] || '?'}
        </div>
      ) : conversationAgents.length === 1 ? (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm"
          style={{ backgroundColor: conversationAgents[0]?.color || '#007AFF' }}
        >
          {conversationAgents[0]?.avatar || conversationAgents[0]?.name?.[0] || '🤖'}
        </div>
      ) : (
        <div className="flex -space-x-2">
          {conversationAgents.slice(0, 3).map((agent, i) => (
            <div
              key={agent?.id || i}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs border-2 border-ios-sidebar"
              style={{ backgroundColor: agent?.color || '#007AFF', zIndex: conversationAgents.length - i }}
            >
              {agent?.avatar || agent?.name?.[0] || '🤖'}
            </div>
          ))}
          {conversationAgents.length > 3 && (
            <div className="w-8 h-8 rounded-full bg-ios-secondary flex items-center justify-center text-ios-text-secondary text-[10px] border-2 border-ios-sidebar">
              +{conversationAgents.length - 3}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
