import { useState } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { useConversationStore } from '../../stores/conversationStore';
import { Search, Plus, Minus, User, MessageSquare } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Agent } from '../../types/agent';

interface ContactsModalProps {
  onClose: () => void;
  initialTab?: 'all' | 'new';
}

type SmartGroup = 'all' | 'builtin' | 'custom' | 'recent';

export function ContactsModal({ onClose, initialTab = 'all' }: ContactsModalProps) {
  const [activeGroup, setActiveGroup] = useState<SmartGroup>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showNewAgentForm, setShowNewAgentForm] = useState(initialTab === 'new');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  
  const { agents, addAgent, updateAgent } = useAgentStore();
  const { createConversation, setActiveConversation } = useConversationStore();
  const agentsArray = Array.from(agents.values());
  
  const filteredAgents = agentsArray.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeGroup === 'builtin') return matchesSearch && agent.isBuiltin;
    if (activeGroup === 'custom') return matchesSearch && !agent.isBuiltin;
    return matchesSearch;
  });

  const selectedAgent = selectedAgentId ? agents.get(selectedAgentId) : filteredAgents[0];

  const handleStartConversation = (agent: Agent) => {
    const convId = createConversation({
      title: agent.name,
      agentIds: [agent.id],
      type: 'single',
    });
    setActiveConversation(convId);
    onClose();
  };

  if (showNewAgentForm) {
    return (
      <NewAgentWindow 
        onClose={onClose}
        onCancel={() => setShowNewAgentForm(false)}
        onSave={(agent) => {
          addAgent(agent);
          setShowNewAgentForm(false);
          setSelectedAgentId(agent.id);
        }}
      />
    );
  }

  if (editingAgent) {
    return (
      <EditAgentWindow
        agent={editingAgent}
        onClose={onClose}
        onCancel={() => setEditingAgent(null)}
        onSave={(updated) => {
          updateAgent(updated.id, updated);
          setEditingAgent(null);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-ios-card rounded-xl shadow-2xl overflow-hidden border border-ios-separator" style={{ width: '900px', maxWidth: '95vw' }}>
        
        {/* macOS Window Titlebar */}
        <div className="h-12 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-b border-ios-separator flex items-center px-4 gap-2">
          <div className="flex gap-2">
            <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 text-center text-sm font-medium text-ios-text">Contacts</div>
        </div>
        
        {/* Three Column Layout */}
        <div className="flex" style={{ height: '480px' }}>
          
          {/* Left Sidebar - Groups */}
          <div className="w-48 bg-ios-sidebar border-r border-ios-separator flex flex-col">
            {/* Search */}
            <div className="p-2">
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-ios-text-secondary" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 bg-ios-secondary border border-ios-separator rounded text-xs text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-1 focus:ring-ios-blue"
                />
              </div>
            </div>
            
            {/* Groups List */}
            <div className="flex-1 overflow-y-auto text-xs px-1">
              <div className="px-2 py-1 text-ios-text-secondary font-semibold uppercase tracking-wide text-[10px]">Smart Groups</div>
              <GroupItem 
                label="All Agents" 
                active={activeGroup === 'all'} 
                onClick={() => setActiveGroup('all')}
                count={agentsArray.length}
              />
              <GroupItem 
                label="Built-in" 
                active={activeGroup === 'builtin'} 
                onClick={() => setActiveGroup('builtin')}
                count={agentsArray.filter(a => a.isBuiltin).length}
              />
              <GroupItem 
                label="Custom" 
                active={activeGroup === 'custom'} 
                onClick={() => setActiveGroup('custom')}
                count={agentsArray.filter(a => !a.isBuiltin).length}
              />
              <GroupItem 
                label="Recently Used" 
                active={activeGroup === 'recent'} 
                onClick={() => setActiveGroup('recent')}
              />
              
              <div className="px-2 py-1 mt-3 text-ios-text-secondary font-semibold uppercase tracking-wide text-[10px]">Groups</div>
              <GroupItem label="🔧 Development" onClick={() => {}} />
              <GroupItem label="📊 Analytics" onClick={() => {}} />
              <GroupItem label="🎨 Creative" onClick={() => {}} />
            </div>
            
            {/* Add Group Button */}
            <div className="p-2 border-t border-ios-separator">
              <button className="w-full text-xs text-ios-text-secondary hover:text-ios-text flex items-center justify-center gap-1 py-1">
                <Plus size={12} /> New Group
              </button>
            </div>
          </div>
          
          {/* Middle - Contact List */}
          <div className="w-56 border-r border-ios-separator flex flex-col bg-ios-card">
            <div className="flex-1 overflow-y-auto">
              {filteredAgents.length === 0 ? (
                <div className="p-4 text-center text-ios-text-secondary text-xs">
                  <User size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No agents found</p>
                </div>
              ) : (
                filteredAgents.map(agent => (
                  <ContactListItem
                    key={agent.id}
                    agent={agent}
                    selected={selectedAgent?.id === agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                  />
                ))
              )}
            </div>
            
            {/* Contact count */}
            <div className="p-2 border-t border-ios-separator text-center text-xs text-ios-text-secondary">
              {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {/* Right - Contact Details */}
          <div className="flex-1 bg-ios-card p-6 flex flex-col items-center overflow-y-auto">
            {selectedAgent ? (
              <AgentDetailView 
                agent={selectedAgent} 
                onMessage={() => handleStartConversation(selectedAgent)}
                onEdit={() => setEditingAgent(selectedAgent)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-ios-text-secondary">
                <p>Select an agent to view details</p>
              </div>
            )}
          </div>
          
        </div>
        
        {/* Bottom Toolbar */}
        <div className="h-10 bg-ios-sidebar border-t border-ios-separator flex items-center px-3 gap-2">
          <button 
            onClick={() => setShowNewAgentForm(true)}
            className="w-7 h-7 rounded hover:bg-ios-secondary flex items-center justify-center text-ios-text-secondary hover:text-ios-text text-lg"
            title="Add Agent"
          >
            <Plus size={16} />
          </button>
          <button 
            className="w-7 h-7 rounded hover:bg-ios-secondary flex items-center justify-center text-ios-text-secondary hover:text-ios-text text-lg"
            title="Remove Agent"
          >
            <Minus size={16} />
          </button>
          <div className="flex-1" />
        </div>
        
      </div>
    </div>
  );
}

// Group item in left sidebar
interface GroupItemProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  count?: number;
}

function GroupItem({ label, active, onClick, count }: GroupItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-3 py-1.5 rounded-md mx-1 text-left flex items-center justify-between text-xs',
        active 
          ? 'bg-ios-blue text-white' 
          : 'text-ios-text hover:bg-ios-secondary'
      )}
      style={{ width: 'calc(100% - 8px)' }}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span className={cn('text-[10px]', active ? 'opacity-80' : 'text-ios-text-secondary')}>
          {count}
        </span>
      )}
    </button>
  );
}

// Contact list item in middle column
interface ContactListItemProps {
  agent: Agent;
  selected: boolean;
  onClick: () => void;
}

function ContactListItem({ agent, selected, onClick }: ContactListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-3 py-2 flex items-center gap-3 border-b border-ios-separator text-left',
        selected ? 'bg-ios-blue text-white' : 'hover:bg-ios-secondary'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0',
          selected ? 'bg-white/20' : ''
        )}
        style={{ backgroundColor: selected ? undefined : (agent.color || '#007AFF') }}
      >
        <span className={selected ? '' : 'text-white'}>
          {agent.avatar || agent.name[0]}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('text-sm font-medium truncate', selected ? '' : 'text-ios-text')}>
          {agent.name}
        </div>
        <div className={cn('text-xs truncate', selected ? 'opacity-80' : 'text-ios-text-secondary')}>
          {agent.isBuiltin ? 'Built-in' : 'Custom'}
        </div>
      </div>
    </button>
  );
}

// Agent detail view in right column
interface AgentDetailViewProps {
  agent: Agent;
  onMessage: () => void;
  onEdit: () => void;
}

function AgentDetailView({ agent, onMessage, onEdit }: AgentDetailViewProps) {
  return (
    <>
      {/* Large Avatar */}
      <div 
        className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-4 shadow-lg text-white"
        style={{ backgroundColor: agent.color || '#007AFF' }}
      >
        {agent.avatar || agent.name[0]}
      </div>
      
      {/* Name */}
      <h2 className="text-xl font-semibold text-ios-text mb-1">{agent.name}</h2>
      <p className="text-sm text-ios-text-secondary mb-4">
        {agent.isBuiltin ? 'Built-in Agent' : 'Custom Agent'}
      </p>
      
      {/* Action Buttons */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={onMessage}
          className="px-4 py-2 bg-ios-blue text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-600 transition-colors"
        >
          <MessageSquare size={16} /> Message
        </button>
        <button 
          onClick={onEdit}
          className="px-4 py-2 bg-ios-secondary text-ios-text rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Edit
        </button>
      </div>
      
      {/* Details */}
      <div className="w-full max-w-sm space-y-3 text-sm">
        <div className="flex border-b border-ios-separator pb-2">
          <span className="text-ios-text-secondary w-24">Type</span>
          <span className="text-ios-text">{agent.isBuiltin ? 'Built-in' : 'Custom'}</span>
        </div>
        {agent.skillIds && agent.skillIds.length > 0 && (
          <div className="flex border-b border-ios-separator pb-2">
            <span className="text-ios-text-secondary w-24">Skills</span>
            <span className="text-ios-text">{agent.skillIds.length} skill{agent.skillIds.length !== 1 ? 's' : ''}</span>
          </div>
        )}
        {agent.toolIds && agent.toolIds.length > 0 && (
          <div className="flex border-b border-ios-separator pb-2">
            <span className="text-ios-text-secondary w-24">Tools</span>
            <span className="text-ios-text">{agent.toolIds.join(', ')}</span>
          </div>
        )}
        {agent.description && (
          <div className="pt-2">
            <span className="text-ios-text-secondary block mb-1">Description</span>
            <span className="text-ios-text text-xs">{agent.description}</span>
          </div>
        )}
        {agent.systemPrompt && (
          <div className="pt-2">
            <span className="text-ios-text-secondary block mb-1">System Prompt</span>
            <span className="text-ios-text text-xs whitespace-pre-wrap">{agent.systemPrompt}</span>
          </div>
        )}
      </div>
    </>
  );
}

// New Agent Window - macOS style
interface NewAgentWindowProps {
  onClose: () => void;
  onCancel: () => void;
  onSave: (agent: Agent) => void;
}

const AVAILABLE_TOOLS = [
  { id: 'terminal', label: 'Terminal', icon: '🖥️', description: 'Execute shell commands' },
  { id: 'file_editor', label: 'File Editor', icon: '📝', description: 'Create and edit files' },
  { id: 'task_tracker', label: 'Task Tracker', icon: '📋', description: 'Manage tasks' },
  { id: 'browser', label: 'Browser', icon: '🌐', description: 'Web browsing' },
];

function NewAgentWindow({ onClose, onCancel, onSave }: NewAgentWindowProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [color, setColor] = useState('#007AFF');
  const [avatar, setAvatar] = useState('🤖');
  const [selectedTools, setSelectedTools] = useState<string[]>(['terminal', 'file_editor', 'task_tracker']);

  const colors = [
    '#007AFF', '#34C759', '#FF9500', '#FF3B30', 
    '#AF52DE', '#5856D6', '#FF2D55', '#5AC8FA'
  ];

  const avatars = ['🤖', '🧠', '💡', '🔧', '📊', '🎨', '📝', '🔍'];

  const handleToggleTool = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newAgent: Agent = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || '',
      color,
      avatar,
      type: 'custom',
      systemPrompt: systemPrompt.trim() || '',
      isBuiltin: false,
      skillIds: [],
      toolIds: selectedTools,
    };

    onSave(newAgent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-ios-card rounded-xl shadow-2xl overflow-hidden border border-ios-separator" style={{ width: '500px', maxWidth: '95vw' }}>
        
        {/* macOS Window Titlebar */}
        <div className="h-12 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-b border-ios-separator flex items-center px-4 gap-2">
          <div className="flex gap-2">
            <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 text-center text-sm font-medium text-ios-text">New Agent</div>
        </div>
        
        {/* Contact Card Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-6">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-3 shadow-lg cursor-pointer hover:opacity-80 transition-opacity border-4 border-white text-white"
              style={{ backgroundColor: color }}
            >
              {avatar}
            </div>
            <div className="flex gap-1">
              {avatars.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all',
                    avatar === a ? 'bg-ios-blue/20 ring-2 ring-ios-blue' : 'hover:bg-ios-secondary'
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          
          {/* Form Fields (macOS style) */}
          <div className="space-y-4">
            {/* Name Field */}
            <div className="flex items-center gap-3">
              <label className="w-24 text-right text-sm text-ios-text-secondary">Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent Name" 
                className="flex-1 px-3 py-2 border border-ios-separator rounded-md text-sm bg-ios-card text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                required
              />
            </div>
            
            {/* Color Field */}
            <div className="flex items-center gap-3">
              <label className="w-24 text-right text-sm text-ios-text-secondary">Color</label>
              <div className="flex gap-2">
                {colors.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-7 h-7 rounded-full transition-all',
                      color === c ? 'ring-2 ring-offset-2 ring-ios-blue' : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            
            {/* Description Field */}
            <div className="flex items-start gap-3">
              <label className="w-24 text-right text-sm text-ios-text-secondary pt-2">Description</label>
              <textarea 
                rows={2} 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the agent..." 
                className="flex-1 px-3 py-2 border border-ios-separator rounded-md text-sm bg-ios-card text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue resize-none"
              />
            </div>
            
            {/* System Prompt Field */}
            <div className="flex items-start gap-3">
              <label className="w-24 text-right text-sm text-ios-text-secondary pt-2">Instructions</label>
              <textarea 
                rows={4} 
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="System prompt / instructions for the agent..." 
                className="flex-1 px-3 py-2 border border-ios-separator rounded-md text-sm bg-ios-card text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue resize-none"
              />
            </div>

            {/* Tools Field */}
            <div className="flex items-start gap-3">
              <label className="w-24 text-right text-sm text-ios-text-secondary pt-2">Tools</label>
              <div className="flex-1 grid grid-cols-2 gap-2">
                {AVAILABLE_TOOLS.map(tool => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleToggleTool(tool.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all',
                      selectedTools.includes(tool.id)
                        ? 'bg-ios-blue/10 border-2 border-ios-blue'
                        : 'bg-ios-secondary border-2 border-transparent hover:bg-ios-secondary/80'
                    )}
                  >
                    <span>{tool.icon}</span>
                    <span className={selectedTools.includes(tool.id) ? 'text-ios-blue font-medium' : 'text-ios-text'}>
                      {tool.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        
          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-ios-separator">
            <button 
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-ios-text-secondary hover:text-ios-text rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!name.trim()}
              className={cn(
                'px-4 py-2 text-sm rounded-md font-medium transition-colors',
                name.trim()
                  ? 'bg-ios-blue text-white hover:bg-blue-600'
                  : 'bg-ios-secondary text-ios-text-secondary cursor-not-allowed'
              )}
            >
              Create
            </button>
          </div>
        </form>
        
      </div>
    </div>
  );
}

// Edit Agent Window - macOS style
interface EditAgentWindowProps {
  agent: Agent;
  onClose: () => void;
  onCancel: () => void;
  onSave: (agent: Agent) => void;
}

function EditAgentWindow({ agent, onClose, onCancel, onSave }: EditAgentWindowProps) {
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description || '');
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt || '');
  const [color, setColor] = useState(agent.color || '#007AFF');
  const [avatar, setAvatar] = useState(agent.avatar || '🤖');
  const [selectedTools, setSelectedTools] = useState<string[]>(agent.toolIds || []);

  const colors = [
    '#007AFF', '#34C759', '#FF9500', '#FF3B30', 
    '#AF52DE', '#5856D6', '#FF2D55', '#5AC8FA'
  ];

  const avatars = ['🤖', '🧠', '💡', '🔧', '📊', '🎨', '📝', '🔍'];

  const handleToggleTool = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updatedAgent: Agent = {
      ...agent,
      name: name.trim(),
      description: description.trim() || '',
      color,
      avatar,
      systemPrompt: systemPrompt.trim() || '',
      toolIds: selectedTools,
    };

    onSave(updatedAgent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-ios-card rounded-xl shadow-2xl overflow-hidden border border-ios-separator" style={{ width: '500px', maxWidth: '95vw' }}>
        
        {/* macOS Window Titlebar */}
        <div className="h-12 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-b border-ios-separator flex items-center px-4 gap-2">
          <div className="flex gap-2">
            <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 text-center text-sm font-medium text-ios-text">Edit Agent</div>
        </div>
        
        {/* Contact Card Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-6">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-3 shadow-lg cursor-pointer hover:opacity-80 transition-opacity border-4 border-white text-white"
              style={{ backgroundColor: color }}
            >
              {avatar}
            </div>
            <div className="flex gap-1">
              {avatars.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all',
                    avatar === a ? 'bg-ios-blue/20 ring-2 ring-ios-blue' : 'hover:bg-ios-secondary'
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          
          {/* Form Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="w-24 text-right text-sm text-ios-text-secondary">Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent Name" 
                className="flex-1 px-3 py-2 border border-ios-separator rounded-md text-sm bg-ios-card text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
                required
              />
            </div>
            
            <div className="flex items-center gap-3">
              <label className="w-24 text-right text-sm text-ios-text-secondary">Color</label>
              <div className="flex gap-2">
                {colors.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-7 h-7 rounded-full transition-all',
                      color === c ? 'ring-2 ring-offset-2 ring-ios-blue' : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <label className="w-24 text-right text-sm text-ios-text-secondary pt-2">Description</label>
              <textarea 
                rows={2} 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the agent..." 
                className="flex-1 px-3 py-2 border border-ios-separator rounded-md text-sm bg-ios-card text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue resize-none"
              />
            </div>
            
            <div className="flex items-start gap-3">
              <label className="w-24 text-right text-sm text-ios-text-secondary pt-2">Instructions</label>
              <textarea 
                rows={4} 
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="System prompt / instructions for the agent..." 
                className="flex-1 px-3 py-2 border border-ios-separator rounded-md text-sm bg-ios-card text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue resize-none"
              />
            </div>

            {/* Tools Field */}
            <div className="flex items-start gap-3">
              <label className="w-24 text-right text-sm text-ios-text-secondary pt-2">Tools</label>
              <div className="flex-1 grid grid-cols-2 gap-2">
                {AVAILABLE_TOOLS.map(tool => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleToggleTool(tool.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all',
                      selectedTools.includes(tool.id)
                        ? 'bg-ios-blue/10 border-2 border-ios-blue'
                        : 'bg-ios-secondary border-2 border-transparent hover:bg-ios-secondary/80'
                    )}
                  >
                    <span>{tool.icon}</span>
                    <span className={selectedTools.includes(tool.id) ? 'text-ios-blue font-medium' : 'text-ios-text'}>
                      {tool.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        
          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-ios-separator">
            <button 
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-ios-text-secondary hover:text-ios-text rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!name.trim()}
              className={cn(
                'px-4 py-2 text-sm rounded-md font-medium transition-colors',
                name.trim()
                  ? 'bg-ios-blue text-white hover:bg-blue-600'
                  : 'bg-ios-secondary text-ios-text-secondary cursor-not-allowed'
              )}
            >
              Save
            </button>
          </div>
        </form>
        
      </div>
    </div>
  );
}
