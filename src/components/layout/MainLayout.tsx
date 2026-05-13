import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ChatView } from '../chat/ChatView';
import { NewChatModal } from '../modals/NewChatModal';
import { AgentSelectorModal } from '../modals/AgentSelectorModal';
import { SkillSelectorModal } from '../modals/SkillSelectorModal';
import { SettingsModal } from '../modals/SettingsModal';
import { useConversationStore } from '../../stores/conversationStore';

export function MainLayout() {
  const [showNewChat, setShowNewChat] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [showSkillSelector, setShowSkillSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  
  const { activeConversationId, setActiveConversation } = useConversationStore();

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    setMobileShowChat(true);
  };

  const handleBack = () => {
    setMobileShowChat(false);
  };

  return (
    <div className="h-screen flex bg-ios-background overflow-hidden">
      {/* Sidebar - hidden on mobile when chat is shown */}
      <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        <Sidebar
          onNewChat={() => setShowNewChat(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Main content area */}
      <div className={`flex-1 flex flex-col ${!mobileShowChat && !activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        <Header
          onBack={mobileShowChat ? handleBack : undefined}
          onOpenAgentSelector={() => setShowAgentSelector(true)}
          onOpenSkillSelector={() => setShowSkillSelector(true)}
        />
        
        <main className="flex-1 overflow-hidden">
          {activeConversationId ? (
            <ChatView />
          ) : (
            <EmptyState onNewChat={() => setShowNewChat(true)} />
          )}
        </main>
      </div>

      {/* Modals */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreated={(id) => {
            setShowNewChat(false);
            handleSelectConversation(id);
          }}
        />
      )}
      
      {showAgentSelector && (
        <AgentSelectorModal
          onClose={() => setShowAgentSelector(false)}
        />
      )}
      
      {showSkillSelector && (
        <SkillSelectorModal
          onClose={() => setShowSkillSelector(false)}
        />
      )}
      
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function EmptyState({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-ios-text-secondary p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ios-blue to-purple-500 flex items-center justify-center text-4xl mb-6">
        💬
      </div>
      <h2 className="text-2xl font-semibold text-ios-text mb-2">Welcome to Agent Chat</h2>
      <p className="text-center max-w-md mb-6">
        Start a conversation with AI agents powered by OpenHands SDK.
        Chat with one agent or multiple agents at once.
      </p>
      <button
        onClick={onNewChat}
        className="px-6 py-3 bg-ios-blue text-white rounded-full font-medium hover:bg-blue-600 transition-colors"
      >
        Start New Chat
      </button>
    </div>
  );
}
