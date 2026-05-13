import { useState } from 'react';
import { Modal, ModalFooter } from './Modal';
import { useAgentStore } from '../../stores/agentStore';
import { useConversationStore } from '../../stores/conversationStore';
import { Check, Plus, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AgentSelectorModalProps {
  onClose: () => void;
}

export function AgentSelectorModal({ onClose }: AgentSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const { agents } = useAgentStore();
  const { activeConversation, updateConversationAgents } = useConversationStore();

  const [selectedAgents, setSelectedAgents] = useState<string[]>(
    activeConversation?.agentIds || []
  );

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const builtinAgents = filteredAgents.filter(a => a.isBuiltin);
  const customAgents = filteredAgents.filter(a => !a.isBuiltin);

  const handleToggleAgent = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSave = () => {
    if (activeConversation && selectedAgents.length > 0) {
      updateConversationAgents(activeConversation.id, selectedAgents);
      onClose();
    }
  };

  if (showCreateForm) {
    return (
      <CreateAgentForm
        onClose={() => setShowCreateForm(false)}
        onCreated={(agentId) => {
          setSelectedAgents(prev => [...prev, agentId]);
          setShowCreateForm(false);
        }}
      />
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Select Agents" size="lg">
      <div className="p-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-text-secondary" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
          />
        </div>

        {/* Selected count */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-ios-text-secondary">
            {selectedAgents.length} agent{selectedAgents.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1 text-sm text-ios-blue hover:underline"
          >
            <Plus size={16} />
            Create Agent
          </button>
        </div>

        {/* Agent lists */}
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {/* Built-in agents */}
          {builtinAgents.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-ios-text-secondary uppercase tracking-wider mb-2">
                Built-in Agents
              </h3>
              <div className="space-y-2">
                {builtinAgents.map(agent => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    selected={selectedAgents.includes(agent.id)}
                    onToggle={() => handleToggleAgent(agent.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom agents */}
          {customAgents.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-ios-text-secondary uppercase tracking-wider mb-2">
                Custom Agents
              </h3>
              <div className="space-y-2">
                {customAgents.map(agent => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    selected={selectedAgents.includes(agent.id)}
                    onToggle={() => handleToggleAgent(agent.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredAgents.length === 0 && (
            <div className="text-center py-8 text-ios-text-secondary">
              No agents found
            </div>
          )}
        </div>
      </div>

      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 text-ios-text-secondary hover:bg-ios-secondary rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={selectedAgents.length === 0}
          className={cn(
            'px-6 py-2 rounded-lg font-medium transition-colors',
            selectedAgents.length > 0
              ? 'bg-ios-blue text-white hover:bg-blue-600'
              : 'bg-ios-secondary text-ios-text-secondary cursor-not-allowed'
          )}
        >
          Save
        </button>
      </ModalFooter>
    </Modal>
  );
}

interface AgentRowProps {
  agent: {
    id: string;
    name: string;
    description: string;
    avatar: string;
    color: string;
    isBuiltin: boolean;
  };
  selected: boolean;
  onToggle: () => void;
}

function AgentRow({ agent, selected, onToggle }: AgentRowProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full p-3 rounded-xl flex items-center gap-3 transition-all',
        selected
          ? 'bg-ios-blue/10 border-2 border-ios-blue'
          : 'bg-ios-secondary hover:bg-ios-secondary/80 border-2 border-transparent'
      )}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0"
        style={{ backgroundColor: agent.color }}
      >
        {agent.avatar}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="font-medium text-ios-text">{agent.name}</div>
        <div className="text-sm text-ios-text-secondary truncate">{agent.description}</div>
      </div>
      <div
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
          selected
            ? 'bg-ios-blue border-ios-blue text-white'
            : 'border-ios-separator'
        )}
      >
        {selected && <Check size={14} />}
      </div>
    </button>
  );
}

interface CreateAgentFormProps {
  onClose: () => void;
  onCreated: (agentId: string) => void;
}

function CreateAgentForm({ onClose, onCreated }: CreateAgentFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('🤖');
  const [color, setColor] = useState('#007AFF');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createAgent } = useAgentStore();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      const agent = await createAgent({
        name: name.trim(),
        description: description.trim(),
        avatar,
        color,
        systemPrompt,
        toolIds: ['terminal', 'file_editor', 'task_tracker'],
        skillIds: [],
      });
      onCreated(agent.id);
    } catch (error) {
      console.error('Failed to create agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarOptions = ['🤖', '🧠', '💡', '🎯', '🔧', '📊', '🎨', '🚀'];
  const colorOptions = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55', '#00C7BE'];

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Agent" size="md">
      <div className="p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-ios-text mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Custom Agent"
            className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-ios-text mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this agent do?"
            className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
          />
        </div>

        {/* Avatar & Color */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ios-text mb-2">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {avatarOptions.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setAvatar(emoji)}
                  className={cn(
                    'w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all',
                    avatar === emoji
                      ? 'bg-ios-blue/20 ring-2 ring-ios-blue'
                      : 'bg-ios-secondary hover:bg-ios-secondary/80'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ios-text mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-10 h-10 rounded-lg transition-all',
                    color === c ? 'ring-2 ring-offset-2 ring-ios-blue' : ''
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium text-ios-text mb-1">
            System Prompt (optional)
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Additional instructions for the agent..."
            rows={3}
            className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue resize-none"
          />
        </div>

        {/* Preview */}
        <div className="p-3 bg-ios-secondary rounded-xl">
          <div className="text-xs text-ios-text-secondary mb-2">Preview</div>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl"
              style={{ backgroundColor: color }}
            >
              {avatar}
            </div>
            <div>
              <div className="font-medium text-ios-text">{name || 'Agent Name'}</div>
              <div className="text-sm text-ios-text-secondary">
                {description || 'Agent description'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ModalFooter>
        <button
          onClick={onClose}
          className="px-4 py-2 text-ios-text-secondary hover:bg-ios-secondary rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || isSubmitting}
          className={cn(
            'px-6 py-2 rounded-lg font-medium transition-colors',
            name.trim() && !isSubmitting
              ? 'bg-ios-blue text-white hover:bg-blue-600'
              : 'bg-ios-secondary text-ios-text-secondary cursor-not-allowed'
          )}
        >
          {isSubmitting ? 'Creating...' : 'Create'}
        </button>
      </ModalFooter>
    </Modal>
  );
}
