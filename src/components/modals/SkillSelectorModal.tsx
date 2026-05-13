import { useState } from 'react';
import { Modal, ModalFooter } from './Modal';
import { useSkillStore } from '../../stores/skillStore';
import { useConversationStore } from '../../stores/conversationStore';
import { Check, Plus, Search, Tag } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SkillSelectorModalProps {
  onClose: () => void;
}

export function SkillSelectorModal({ onClose }: SkillSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const { skills, categories } = useSkillStore();
  const { activeConversation, updateConversationSkills } = useConversationStore();

  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    activeConversation?.skillIds || []
  );

  const filteredSkills = skills.filter(skill => {
    const matchesSearch = 
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.triggers.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || skill.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const builtinSkills = filteredSkills.filter(s => s.isBuiltin);
  const customSkills = filteredSkills.filter(s => !s.isBuiltin);

  const handleToggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleSave = () => {
    if (activeConversation) {
      updateConversationSkills(activeConversation.id, selectedSkills);
      onClose();
    }
  };

  if (showCreateForm) {
    return (
      <CreateSkillForm
        onClose={() => setShowCreateForm(false)}
        onCreated={(skillId) => {
          setSelectedSkills(prev => [...prev, skillId]);
          setShowCreateForm(false);
        }}
      />
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Select Skills" size="lg">
      <div className="p-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-text-secondary" />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-3 py-1 rounded-full text-sm transition-colors',
              !selectedCategory
                ? 'bg-ios-blue text-white'
                : 'bg-ios-secondary text-ios-text-secondary hover:bg-ios-secondary/80'
            )}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-3 py-1 rounded-full text-sm transition-colors',
                selectedCategory === cat.id
                  ? 'bg-ios-blue text-white'
                  : 'bg-ios-secondary text-ios-text-secondary hover:bg-ios-secondary/80'
              )}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Selected count & create button */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-ios-text-secondary">
            {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1 text-sm text-ios-blue hover:underline"
          >
            <Plus size={16} />
            Create Skill
          </button>
        </div>

        {/* Skill lists */}
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {/* Built-in skills */}
          {builtinSkills.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-ios-text-secondary uppercase tracking-wider mb-2">
                Built-in Skills
              </h3>
              <div className="space-y-2">
                {builtinSkills.map(skill => (
                  <SkillRow
                    key={skill.id}
                    skill={skill}
                    selected={selectedSkills.includes(skill.id)}
                    onToggle={() => handleToggleSkill(skill.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom skills */}
          {customSkills.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-ios-text-secondary uppercase tracking-wider mb-2">
                Custom Skills
              </h3>
              <div className="space-y-2">
                {customSkills.map(skill => (
                  <SkillRow
                    key={skill.id}
                    skill={skill}
                    selected={selectedSkills.includes(skill.id)}
                    onToggle={() => handleToggleSkill(skill.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredSkills.length === 0 && (
            <div className="text-center py-8 text-ios-text-secondary">
              No skills found
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
          className="px-6 py-2 bg-ios-blue text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          Save
        </button>
      </ModalFooter>
    </Modal>
  );
}

interface SkillRowProps {
  skill: {
    id: string;
    name: string;
    description: string;
    icon: string;
    triggers: string[];
    isBuiltin: boolean;
  };
  selected: boolean;
  onToggle: () => void;
}

function SkillRow({ skill, selected, onToggle }: SkillRowProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full p-3 rounded-xl flex items-start gap-3 transition-all',
        selected
          ? 'bg-ios-blue/10 border-2 border-ios-blue'
          : 'bg-ios-secondary hover:bg-ios-secondary/80 border-2 border-transparent'
      )}
    >
      <span className="text-2xl flex-shrink-0">{skill.icon}</span>
      <div className="flex-1 text-left min-w-0">
        <div className="font-medium text-ios-text">{skill.name}</div>
        <div className="text-sm text-ios-text-secondary line-clamp-2">{skill.description}</div>
        {skill.triggers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {skill.triggers.slice(0, 3).map((trigger, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-ios-blue/10 text-ios-blue rounded-full text-xs"
              >
                <Tag size={10} />
                {trigger}
              </span>
            ))}
            {skill.triggers.length > 3 && (
              <span className="text-xs text-ios-text-secondary">
                +{skill.triggers.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
      <div
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-1',
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

interface CreateSkillFormProps {
  onClose: () => void;
  onCreated: (skillId: string) => void;
}

function CreateSkillForm({ onClose, onCreated }: CreateSkillFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('⚡');
  const [category, setCategory] = useState('custom');
  const [triggers, setTriggers] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createSkill, categories } = useSkillStore();

  const handleSubmit = async () => {
    if (!name.trim() || !content.trim()) return;
    
    setIsSubmitting(true);
    try {
      const skill = await createSkill({
        name: name.trim(),
        description: description.trim(),
        icon,
        category,
        triggers: triggers.split(',').map(t => t.trim()).filter(Boolean),
        content: content.trim(),
      });
      onCreated(skill.id);
    } catch (error) {
      console.error('Failed to create skill:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const iconOptions = ['⚡', '🎯', '📝', '🔍', '🛡️', '📊', '🔧', '💡'];

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Skill" size="lg">
      <div className="p-4 space-y-4">
        {/* Name & Icon */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-ios-text mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Skill"
              className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ios-text mb-1">Icon</label>
            <div className="flex flex-wrap gap-1">
              {iconOptions.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all',
                    icon === emoji
                      ? 'bg-ios-blue/20 ring-2 ring-ios-blue'
                      : 'bg-ios-secondary hover:bg-ios-secondary/80'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-ios-text mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this skill do?"
            className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-ios-text mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Triggers */}
        <div>
          <label className="block text-sm font-medium text-ios-text mb-1">
            Triggers (comma-separated)
          </label>
          <input
            type="text"
            value={triggers}
            onChange={(e) => setTriggers(e.target.value)}
            placeholder="keyword1, keyword2, keyword3"
            className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
          />
          <p className="text-xs text-ios-text-secondary mt-1">
            When these keywords appear in a message, this skill will be activated
          </p>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-ios-text mb-1">
            Skill Content (Markdown)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Skill Instructions&#10;&#10;Provide detailed instructions for the agent..."
            rows={6}
            className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue resize-none font-mono text-sm"
          />
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
          disabled={!name.trim() || !content.trim() || isSubmitting}
          className={cn(
            'px-6 py-2 rounded-lg font-medium transition-colors',
            name.trim() && content.trim() && !isSubmitting
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
