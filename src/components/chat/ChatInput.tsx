import { useState, useRef, useEffect, KeyboardEvent, useMemo } from 'react';
import { Send, Mic, AtSign, X } from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';
import { cn } from '../../utils/cn';
import { ToolsDropdown } from './ToolsDropdown';
import { useToolActions } from '../../hooks/useToolActions';
import { ToolActionId } from '../../types/tool-actions';

interface ChatInputProps {
  onSend: (content: string, mentionAgentId?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  agentIds?: string[];
}

export function ChatInput({ 
  onSend, 
  disabled = false, 
  placeholder = 'Message',
  agentIds = []
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [selectedMention, setSelectedMention] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { agents } = useAgentStore();

  // Tool actions hook - pass onSend as the message handler
  const { executeToolAction, isElectron } = useToolActions({
    onSendMessage: (msg) => onSend(msg),
  });

  // Get enabled tools from active agents
  const enabledToolIds = useMemo(() => {
    const toolSet = new Set<string>();
    console.log('[ChatInput] agentIds:', agentIds);
    console.log('[ChatInput] agents Map size:', agents.size);
    agentIds.forEach((agentId) => {
      const agent = agents.get(agentId);
      console.log('[ChatInput] agent for', agentId, ':', agent);
      console.log('[ChatInput] agent.toolIds:', agent?.toolIds);
      agent?.toolIds?.forEach((toolId) => toolSet.add(toolId));
    });
    console.log('[ChatInput] computed enabledToolIds:', Array.from(toolSet));
    return Array.from(toolSet);
  }, [agentIds, agents]);

  // Handle tool action from dropdown
  const handleToolAction = async (actionId: ToolActionId) => {
    const result = await executeToolAction(actionId);
    if (!result.success && result.error) {
      console.error(`Tool action failed: ${result.error}`);
    }
  };
  
  // Convert Map to array for filtering
  const agentsArray = Array.from(agents.values());

  // Filter agents for mentions (only those in the conversation)
  const mentionableAgents = agentsArray.filter(a => 
    agentIds.includes(a.id) && 
    a.name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  const handleSend = () => {
    if (!content.trim() || disabled) return;
    
    // Extract mention if present
    const mentionMatch = content.match(/^@(\w+)\s/);
    let mentionAgentId: string | undefined;
    let messageContent = content;
    
    if (mentionMatch) {
      const mentionedAgent = agentsArray.find(
        a => a.name.toLowerCase() === mentionMatch[1].toLowerCase()
      );
      if (mentionedAgent) {
        mentionAgentId = mentionedAgent.id;
        messageContent = content.replace(mentionMatch[0], '');
      }
    }
    
    // Use selected mention if present
    if (selectedMention) {
      mentionAgentId = selectedMention;
    }
    
    onSend(messageContent.trim(), mentionAgentId);
    setContent('');
    setSelectedMention(null);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Handle @ mention trigger
    if (e.key === '@' && agentIds.length > 1) {
      setShowMentions(true);
      setMentionFilter('');
    }
    
    // Close mentions on escape
    if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    
    // Check for @mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && agentIds.length > 1) {
      const afterAt = value.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setShowMentions(true);
        setMentionFilter(afterAt);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (agent: { id: string; name: string }) => {
    const lastAtIndex = content.lastIndexOf('@');
    const newContent = content.slice(0, lastAtIndex) + `@${agent.name} `;
    setContent(newContent);
    setShowMentions(false);
    setSelectedMention(agent.id);
    textareaRef.current?.focus();
  };

  const clearMention = () => {
    setSelectedMention(null);
    // Remove @mention from content
    const newContent = content.replace(/@\w+\s?/, '');
    setContent(newContent);
  };

  const selectedAgent = selectedMention 
    ? agentsArray.find(a => a.id === selectedMention) 
    : null;

  return (
    <div className="border-t border-ios-separator bg-ios-card p-3">
      <div className="max-w-2xl mx-auto">
        {/* Selected mention badge */}
        {selectedAgent && (
          <div className="flex items-center gap-2 mb-2 px-2">
            <span className="text-xs text-ios-text-secondary">Sending to:</span>
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm"
              style={{ backgroundColor: `${selectedAgent.color}20`, color: selectedAgent.color }}
            >
              <span>{selectedAgent.avatar}</span>
              {selectedAgent.name}
              <button onClick={clearMention} className="ml-1 hover:opacity-70">
                <X size={14} />
              </button>
            </span>
          </div>
        )}

        {/* Mentions dropdown */}
        {showMentions && mentionableAgents.length > 0 && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-full max-w-3xl bg-ios-card border border-ios-separator rounded-xl shadow-lg overflow-hidden z-10">
            {mentionableAgents.map(agent => (
              <button
                key={agent.id}
                onClick={() => insertMention(agent)}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-ios-secondary transition-colors text-left"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.avatar}
                </div>
                <div>
                  <div className="font-medium text-ios-text">{agent.name}</div>
                  <div className="text-xs text-ios-text-secondary">{agent.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex items-end gap-2">
          {/* Tools dropdown (iOS-style + button) */}
          <ToolsDropdown
            enabledToolIds={enabledToolIds}
            onToolAction={handleToolAction}
            isElectron={isElectron}
            disabled={disabled}
          />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                'w-full px-4 py-2 bg-ios-secondary rounded-2xl resize-none text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            
            {/* @ mention hint */}
            {agentIds.length > 1 && !content && (
              <button
                onClick={() => {
                  setContent('@');
                  setShowMentions(true);
                  textareaRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ios-text-secondary hover:text-ios-blue transition-colors"
              >
                <AtSign size={18} />
              </button>
            )}
          </div>

          {/* Send/Voice button */}
          {content.trim() ? (
            <button
              onClick={handleSend}
              disabled={disabled}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors flex-shrink-0',
                disabled ? 'bg-ios-blue/50 cursor-not-allowed' : 'bg-ios-blue hover:bg-blue-600'
              )}
            >
              <Send size={18} />
            </button>
          ) : (
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center text-ios-blue hover:bg-ios-secondary transition-colors flex-shrink-0"
              disabled={disabled}
            >
              <Mic size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
