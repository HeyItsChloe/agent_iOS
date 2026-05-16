import { useState, Suspense, lazy, useCallback, memo, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ChatView } from '../chat/ChatView';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { SkipLink, LiveRegion } from '../common/VisuallyHidden';
import { useConversationStore } from '../../stores/conversationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { conversationsApi } from '../../api/client';

const DEFAULT_AGENT_ID = 'general-assistant';

// Lazy load modals for code splitting
const NewChatModal = lazy(() => import('../modals/NewChatModal').then(m => ({ default: m.NewChatModal })));
const AgentSelectorModal = lazy(() => import('../modals/AgentSelectorModal').then(m => ({ default: m.AgentSelectorModal })));
const SkillSelectorModal = lazy(() => import('../modals/SkillSelectorModal').then(m => ({ default: m.SkillSelectorModal })));
const SettingsModal = lazy(() => import('../modals/SettingsModal').then(m => ({ default: m.SettingsModal })));
const ContactsModal = lazy(() => import('../modals/ContactsModal').then(m => ({ default: m.ContactsModal })));
const ConversationInfoModal = lazy(() => import('../modals/ConversationInfoModal').then(m => ({ default: m.ConversationInfoModal })));

// Modal loading fallback
const ModalFallback = memo(function ModalFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-ios-card rounded-2xl p-8 flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-ios-text-secondary">Loading...</p>
      </div>
    </div>
  );
});

export function MainLayout() {
  const [showNewChat, setShowNewChat] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [showSkillSelector, setShowSkillSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [contactsInitialTab, setContactsInitialTab] = useState<'all' | 'new'>('all');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [isQuickStarting, setIsQuickStarting] = useState(false);
  
  const { activeConversationId, setActiveConversation, conversations, addConversation } = useConversationStore();
  const { quickStartEnabled } = useSettingsStore();

  // Auto-select first conversation if none is selected
  useEffect(() => {
    if (!activeConversationId && conversations.size > 0) {
      const firstConversation = conversations.values().next().value;
      if (firstConversation) {
        setActiveConversation(firstConversation.id);
      }
    }
  }, [activeConversationId, conversations, setActiveConversation]);

  // Listen for Electron menu events
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanups: (() => void)[] = [];

    // New conversation from menu
    if (window.electronAPI.onMenuNewConversation) {
      cleanups.push(window.electronAPI.onMenuNewConversation(() => {
        setShowNewChat(true);
      }));
    }

    // Settings/Preferences from menu
    if (window.electronAPI.onMenuOpenSettings) {
      cleanups.push(window.electronAPI.onMenuOpenSettings(() => {
        setShowSettings(true);
      }));
    }

    // Show Contacts from menu
    if (window.electronAPI.onMenuShowContacts) {
      cleanups.push(window.electronAPI.onMenuShowContacts(() => {
        setContactsInitialTab('all');
        setShowContacts(true);
      }));
    }

    // New Agent from menu
    if (window.electronAPI.onMenuNewAgent) {
      cleanups.push(window.electronAPI.onMenuNewAgent(() => {
        setContactsInitialTab('new');
        setShowContacts(true);
      }));
    }

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversation(id);
    setMobileShowChat(true);
    setAnnouncement('Conversation selected');
  }, [setActiveConversation]);

  const handleBack = useCallback(() => {
    setMobileShowChat(false);
  }, []);

  const handleQuickStart = useCallback(async () => {
    if (isQuickStarting) return;
    
    setIsQuickStarting(true);
    try {
      // Create conversation with default agent via API
      const response = await conversationsApi.create({
        type: 'single',
        agent_ids: [DEFAULT_AGENT_ID],
        skill_ids: [],
      });
      
      // Map API response to frontend format
      const newConversation = {
        id: response.id,
        type: response.type as 'single' | 'delegator' | 'group',
        agentIds: response.agent_ids,
        skillIds: response.skill_ids,
        title: response.title || null,
        messages: [],
        createdAt: new Date(response.created_at),
        updatedAt: new Date(response.updated_at),
        typingAgents: response.typing_agents || {},
        isArchived: response.is_archived || false,
        isMuted: response.is_muted || false,
        isStopped: response.is_stopped || false,
      };
      
      addConversation(newConversation);
      setActiveConversation(newConversation.id);
      setMobileShowChat(true);
      setAnnouncement('New conversation created with General Assistant');
    } catch (error) {
      console.error('Quick start failed:', error);
      // Fall back to showing the modal
      setShowNewChat(true);
    } finally {
      setIsQuickStarting(false);
    }
  }, [isQuickStarting, addConversation, setActiveConversation]);

  const handleNewChat = useCallback(() => {
    if (quickStartEnabled) {
      handleQuickStart();
    } else {
      setShowNewChat(true);
    }
  }, [quickStartEnabled, handleQuickStart]);
  
  const handleCloseNewChat = useCallback(() => setShowNewChat(false), []);
  const handleCloseSettings = useCallback(() => setShowSettings(false), []);
  const handleOpenAgentSelector = useCallback(() => setShowAgentSelector(true), []);
  const handleCloseAgentSelector = useCallback(() => setShowAgentSelector(false), []);
  const handleOpenSkillSelector = useCallback(() => setShowSkillSelector(true), []);
  const handleCloseSkillSelector = useCallback(() => setShowSkillSelector(false), []);
  const handleCloseContacts = useCallback(() => setShowContacts(false), []);
  
  // Info button handler - opens conversation info modal
  const handleOpenInfo = useCallback(() => {
    setShowConversationInfo(true);
  }, []);
  
  const handleCloseConversationInfo = useCallback(() => {
    setShowConversationInfo(false);
  }, []);

  const handleChatCreated = useCallback((id: string) => {
    setShowNewChat(false);
    handleSelectConversation(id);
    setAnnouncement('New conversation created');
  }, [handleSelectConversation]);

  return (
    <ErrorBoundary>
      <div className="h-screen flex bg-ios-background overflow-hidden">
        {/* Skip link for keyboard navigation */}
        <SkipLink href="#main-content">Skip to main content</SkipLink>
        
        {/* Live region for screen reader announcements */}
        <LiveRegion>{announcement}</LiveRegion>

        {/* Sidebar - hidden on mobile when chat is shown */}
        <nav 
          className={`${mobileShowChat ? 'hidden md:flex' : 'flex'}`}
          aria-label="Conversations"
        >
          <ErrorBoundary>
            <Sidebar
              onNewChat={handleNewChat}
            />
          </ErrorBoundary>
        </nav>

        {/* Main content area */}
        <div 
          className={`flex-1 flex flex-col ${!mobileShowChat && !activeConversationId ? 'hidden md:flex' : 'flex'}`}
          role="main"
          id="main-content"
        >
          <Header
            onBack={mobileShowChat ? handleBack : undefined}
            onOpenAgentSelector={handleOpenAgentSelector}
            onOpenSkillSelector={handleOpenSkillSelector}
            onOpenInfo={handleOpenInfo}
          />
          
          <main className="flex-1 overflow-hidden">
            <ErrorBoundary>
              {activeConversationId ? (
                <ChatView key={activeConversationId} />
              ) : (
                <EmptyState onNewChat={handleNewChat} />
              )}
            </ErrorBoundary>
          </main>
        </div>

        {/* Lazy-loaded Modals with Suspense */}
        <Suspense fallback={<ModalFallback />}>
          {showNewChat && (
            <NewChatModal
              onClose={handleCloseNewChat}
              onCreated={handleChatCreated}
            />
          )}
          
          {showAgentSelector && (
            <AgentSelectorModal
              onClose={handleCloseAgentSelector}
            />
          )}
          
          {showSkillSelector && (
            <SkillSelectorModal
              onClose={handleCloseSkillSelector}
            />
          )}
          
          {showSettings && (
            <SettingsModal
              onClose={handleCloseSettings}
            />
          )}
          
          {showContacts && (
            <ContactsModal
              onClose={handleCloseContacts}
              initialTab={contactsInitialTab}
            />
          )}
          
          {showConversationInfo && (
            <ConversationInfoModal
              isOpen={showConversationInfo}
              onClose={handleCloseConversationInfo}
            />
          )}
        </Suspense>
      </div>
    </ErrorBoundary>
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
