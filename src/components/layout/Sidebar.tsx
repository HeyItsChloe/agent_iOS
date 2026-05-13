import { useState } from 'react';
import { Plus, Search, Settings, MessageSquare } from 'lucide-react';
import { useConversationStore } from '../../stores/conversationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { ConversationSummary } from '../../types/conversation';
import { formatRelativeTime } from '../../utils/formatters';

interface SidebarProps {
  onNewChat: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ onNewChat, onOpenSettings }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    conversations, 
    activeConversationId, 
    setActiveConversation 
  } = useConversationStore();
  const { sidebarCollapsed } = useSettingsStore();

  const filteredConversations = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (sidebarCollapsed) {
    return (
      <div className="w-16 bg-ios-sidebar border-r border-ios-separator flex flex-col items-center py-4">
        <button
          onClick={onNewChat}
          className="w-10 h-10 rounded-full bg-ios-blue flex items-center justify-center text-white mb-4 hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
        </button>
        <div className="flex-1 overflow-y-auto w-full">
          {conversations.slice(0, 10).map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`w-full p-2 flex justify-center ${
                activeConversationId === conv.id ? 'bg-ios-blue/10' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ios-blue to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                {conv.title?.[0] || '?'}
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 rounded-full bg-ios-secondary flex items-center justify-center text-ios-text-secondary hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-ios-sidebar border-r border-ios-separator flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-ios-separator">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-ios-text">Messages</h1>
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
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-ios-separator">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-ios-secondary transition-colors text-ios-text-secondary"
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const agentCount = conversation.agentIds.length;
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 flex gap-3 hover:bg-ios-secondary/50 transition-colors border-b border-ios-separator ${
        isActive ? 'bg-ios-blue/10' : ''
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {agentCount > 1 ? (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-medium">
            {agentCount}
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-ios-blue to-cyan-400 flex items-center justify-center text-white text-lg">
            🤖
          </div>
        )}
        {conversation.unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-ios-blue rounded-full flex items-center justify-center text-white text-xs font-medium">
            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <span className={`font-medium truncate ${isActive ? 'text-ios-blue' : 'text-ios-text'}`}>
            {conversation.title || 'New Conversation'}
          </span>
          {conversation.lastMessageTime && (
            <span className="text-xs text-ios-text-secondary flex-shrink-0 ml-2">
              {formatRelativeTime(new Date(conversation.lastMessageTime))}
            </span>
          )}
        </div>
        <p className="text-sm text-ios-text-secondary truncate">
          {conversation.lastMessage || 'No messages yet'}
        </p>
      </div>
    </button>
  );
}
