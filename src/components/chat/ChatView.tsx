import { useEffect, useRef, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { TypingIndicator, MultiAgentTyping } from './TypingIndicator';
import { useConversationStore, useActiveConversation } from '../../stores/conversationStore';
import { useAgentStore } from '../../stores/agentStore';
import { useConversationWebSocket } from '../../hooks/useConversationWebSocket';
import type { Message } from '../../types/message';
import { formatDate } from '../../utils/formatters';

export function ChatView() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Use the selector hook for proper reactivity
  const activeConversation = useActiveConversation();
  const { 
    addMessage,
    updateMessage 
  } = useConversationStore();
  
  const { agents } = useAgentStore();
  
  // WebSocket connection for real-time updates
  const { 
    connected, 
    typingAgents, 
    sendMessage: wsSendMessage 
  } = useConversationWebSocket(activeConversation?.id || null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages.length, autoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isAtBottom);
  };

  const handleSendMessage = async (content: string, mentionAgentId?: string) => {
    if (!activeConversation) return;

    // Create user message optimistically (timestamp will be updated from server)
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversation.id,
      content,
      sender: 'user',
      status: 'sending',
      timestamp: new Date(),
      subAgentResults: [],
    };

    // Add to store optimistically
    addMessage(activeConversation.id, userMessage);

    // Send via WebSocket or API
    if (connected) {
      wsSendMessage(content, mentionAgentId);
    } else {
      // Fallback to HTTP API
      try {
        const response = await fetch(`/api/conversations/${activeConversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, mention_agent_id: mentionAgentId }),
        });
        
        if (response.ok) {
          updateMessage(activeConversation.id, userMessage.id, { 
            status: 'sent' 
          });
        } else {
          updateMessage(activeConversation.id, userMessage.id, { 
            status: 'error' 
          });
        }
      } catch {
        updateMessage(activeConversation.id, userMessage.id, { 
          status: 'error' 
        });
      }
    }
  };

  if (!activeConversation) {
    return (
      <div className="h-full flex items-center justify-center text-ios-text-secondary">
        Select a conversation to start chatting
      </div>
    );
  }

  // Sort messages by timestamp to ensure correct chronological order
  const messages = [...(activeConversation.messages || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const agentsArray = Array.from(agents.values());
  const typingAgentsList = typingAgents.map(id => {
    const agent = agentsArray.find(a => a.id === id);
    return agent ? { name: agent.name, color: agent.color } : null;
  }).filter(Boolean) as Array<{ name: string; color: string }>;

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);

  // Get participant names for header
  const participantNames = activeConversation.agentIds
    .map(id => agents.get(id)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <div className="h-full flex flex-col bg-ios-background">
      {/* Participants header */}
      {participantNames && (
        <div className="px-4 py-2 text-center">
          <span className="text-sm text-ios-text-secondary">{participantNames}</span>
        </div>
      )}

      {/* Connection indicator */}
      {!connected && (
        <div className="bg-yellow-500/10 text-yellow-600 text-xs text-center py-1">
          Connecting to server...
        </div>
      )}

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4"
      >
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex justify-center my-4">
              <span className="px-3 py-1 bg-ios-secondary rounded-full text-xs text-ios-text-secondary">
                {date}
              </span>
            </div>

            {/* Messages for this date */}
            {dateMessages.map((message, index) => {
              const prevMessage = dateMessages[index - 1];
              const showAvatar = !prevMessage || 
                prevMessage.sender !== message.sender ||
                prevMessage.agentId !== message.agentId;
              const showName = showAvatar && message.sender !== 'user';

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showAvatar={showAvatar}
                  showName={showName}
                />
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {typingAgentsList.length > 0 && (
          typingAgentsList.length === 1 ? (
            <TypingIndicator
              agentName={typingAgentsList[0].name}
              agentColor={typingAgentsList[0].color}
            />
          ) : (
            <MultiAgentTyping agents={typingAgentsList} />
          )
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <button
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setAutoScroll(true);
          }}
          className="absolute bottom-20 right-4 w-10 h-10 bg-ios-card border border-ios-separator rounded-full shadow-lg flex items-center justify-center text-ios-blue hover:bg-ios-secondary transition-colors"
        >
          ↓
        </button>
      )}

      {/* Input area */}
      <ChatInput
        onSend={handleSendMessage}
        agentIds={activeConversation.agentIds}
        placeholder={
          activeConversation.agentIds.length > 1
            ? 'Message (use @ to mention an agent)'
            : 'Message'
        }
      />
    </div>
  );
}

function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
  const groups: Record<string, Message[]> = {};
  
  for (const message of messages) {
    const date = formatDate(new Date(message.timestamp));
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
  }
  
  return groups;
}
