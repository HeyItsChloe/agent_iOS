import { useState } from 'react';
import { Modal, ModalFooter } from './Modal';
import { useAgentStore } from '../../stores/agentStore';
import { useSkillStore } from '../../stores/skillStore';
import { useConversationStore } from '../../stores/conversationStore';
import { ConversationType } from '../../types/conversation';
import { Check, Users, Sparkles, Bot } from 'lucide-react';
import { cn } from '../../utils/cn';

interface NewChatModalProps {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

export function NewChatModal({ onClose, onCreated }: NewChatModalProps) {
  const [step, setStep] = useState<'type' | 'agents' | 'skills'>('type');
  const [chatType, setChatType] = useState<ConversationType>(ConversationType.SINGLE);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  
  const { agents } = useAgentStore();
  const { skills } = useSkillStore();
  const { createConversation } = useConversationStore();

  const handleSelectAgent = (agentId: string) => {
    if (chatType === ConversationType.SINGLE) {
      setSelectedAgents([agentId]);
    } else {
      setSelectedAgents(prev =>
        prev.includes(agentId)
          ? prev.filter(id => id !== agentId)
          : [...prev, agentId]
      );
    }
  };

  const handleSelectSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleCreate = () => {
    if (selectedAgents.length === 0) return;

    const conversation = createConversation({
      type: chatType,
      agentIds: selectedAgents,
      skillIds: selectedSkills,
      title: title || undefined,
    });

    onCreated(conversation.id);
  };

  const canProceed = () => {
    if (step === 'type') return true;
    if (step === 'agents') return selectedAgents.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step === 'type') setStep('agents');
    else if (step === 'agents') setStep('skills');
    else handleCreate();
  };

  const handleBack = () => {
    if (step === 'skills') setStep('agents');
    else if (step === 'agents') setStep('type');
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="New Conversation" size="lg">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 py-3 border-b border-ios-separator">
        <StepDot active={step === 'type'} completed={step !== 'type'} />
        <div className="w-8 h-0.5 bg-ios-separator" />
        <StepDot active={step === 'agents'} completed={step === 'skills'} />
        <div className="w-8 h-0.5 bg-ios-separator" />
        <StepDot active={step === 'skills'} completed={false} />
      </div>

      {/* Step content */}
      <div className="p-4">
        {step === 'type' && (
          <div className="space-y-3">
            <p className="text-sm text-ios-text-secondary mb-4">
              Choose the type of conversation you want to start:
            </p>
            
            <ChatTypeOption
              icon={<Bot size={24} />}
              title="Single Agent"
              description="Chat with one AI agent"
              selected={chatType === ConversationType.SINGLE}
              onClick={() => setChatType(ConversationType.SINGLE)}
            />
            
            <ChatTypeOption
              icon={<Sparkles size={24} />}
              title="Delegator Mode"
              description="One agent delegates tasks to sub-agents"
              selected={chatType === ConversationType.DELEGATOR}
              onClick={() => setChatType(ConversationType.DELEGATOR)}
            />
            
            <ChatTypeOption
              icon={<Users size={24} />}
              title="Group Chat"
              description="Multiple agents collaborate together"
              selected={chatType === ConversationType.GROUP}
              onClick={() => setChatType(ConversationType.GROUP)}
            />
          </div>
        )}

        {step === 'agents' && (
          <div className="space-y-3">
            <p className="text-sm text-ios-text-secondary mb-4">
              {chatType === ConversationType.SINGLE
                ? 'Select an agent to chat with:'
                : chatType === ConversationType.DELEGATOR
                ? 'Select a primary agent (will delegate to others):'
                : 'Select agents for the group chat:'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={selectedAgents.includes(agent.id)}
                  onClick={() => handleSelectAgent(agent.id)}
                />
              ))}
            </div>

            {selectedAgents.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm text-ios-text-secondary mb-2">
                  Conversation title (optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title..."
                  className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
                />
              </div>
            )}
          </div>
        )}

        {step === 'skills' && (
          <div className="space-y-3">
            <p className="text-sm text-ios-text-secondary mb-4">
              Add skills to enhance the conversation (optional):
            </p>

            <div className="grid grid-cols-2 gap-3">
              {skills.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  selected={selectedSkills.includes(skill.id)}
                  onClick={() => handleSelectSkill(skill.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        {step !== 'type' && (
          <button
            onClick={handleBack}
            className="px-4 py-2 text-ios-blue hover:bg-ios-secondary rounded-lg transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={onClose}
          className="px-4 py-2 text-ios-text-secondary hover:bg-ios-secondary rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className={cn(
            'px-6 py-2 rounded-lg font-medium transition-colors',
            canProceed()
              ? 'bg-ios-blue text-white hover:bg-blue-600'
              : 'bg-ios-secondary text-ios-text-secondary cursor-not-allowed'
          )}
        >
          {step === 'skills' ? 'Start Chat' : 'Next'}
        </button>
      </ModalFooter>
    </Modal>
  );
}

function StepDot({ active, completed }: { active: boolean; completed: boolean }) {
  return (
    <div
      className={cn(
        'w-3 h-3 rounded-full transition-colors',
        active ? 'bg-ios-blue' : completed ? 'bg-ios-blue/50' : 'bg-ios-separator'
      )}
    />
  );
}

interface ChatTypeOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function ChatTypeOption({ icon, title, description, selected, onClick }: ChatTypeOptionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-xl border-2 text-left transition-all',
        selected
          ? 'border-ios-blue bg-ios-blue/10'
          : 'border-ios-separator hover:border-ios-blue/50'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center',
          selected ? 'bg-ios-blue text-white' : 'bg-ios-secondary text-ios-text-secondary'
        )}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="font-medium text-ios-text">{title}</div>
          <div className="text-sm text-ios-text-secondary">{description}</div>
        </div>
        {selected && (
          <Check size={20} className="text-ios-blue" />
        )}
      </div>
    </button>
  );
}

interface AgentCardProps {
  agent: { id: string; name: string; description: string; avatar: string; color: string };
  selected: boolean;
  onClick: () => void;
}

function AgentCard({ agent, selected, onClick }: AgentCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3 rounded-xl border-2 text-left transition-all',
        selected
          ? 'border-ios-blue bg-ios-blue/10'
          : 'border-ios-separator hover:border-ios-blue/50'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
          style={{ backgroundColor: agent.color }}
        >
          {agent.avatar}
        </div>
        {selected && <Check size={16} className="text-ios-blue ml-auto" />}
      </div>
      <div className="font-medium text-ios-text text-sm">{agent.name}</div>
      <div className="text-xs text-ios-text-secondary line-clamp-2">{agent.description}</div>
    </button>
  );
}

interface SkillCardProps {
  skill: { id: string; name: string; description: string; icon: string };
  selected: boolean;
  onClick: () => void;
}

function SkillCard({ skill, selected, onClick }: SkillCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3 rounded-xl border-2 text-left transition-all',
        selected
          ? 'border-ios-blue bg-ios-blue/10'
          : 'border-ios-separator hover:border-ios-blue/50'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{skill.icon}</span>
        {selected && <Check size={16} className="text-ios-blue ml-auto" />}
      </div>
      <div className="font-medium text-ios-text text-sm">{skill.name}</div>
      <div className="text-xs text-ios-text-secondary line-clamp-2">{skill.description}</div>
    </button>
  );
}
