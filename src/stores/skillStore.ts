/**
 * Zustand store for skill state management.
 */

import { create } from 'zustand';
import type { Skill, SkillCategory, SkillCategoryInfo } from '@/types';
import { SKILL_CATEGORIES } from '@/types';

interface SkillState {
  // Data
  skills: Map<string, Skill>;
  categories: SkillCategoryInfo[];
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  setSkills: (skills: Skill[]) => void;
  
  addSkill: (skill: Skill) => void;
  updateSkill: (id: string, updates: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
  
  getSkill: (id: string) => Skill | undefined;
  
  // Computed getters
  getBuiltinSkills: () => Skill[];
  getCustomSkills: () => Skill[];
  getAllSkills: () => Skill[];
  getSkillsByCategory: (category: SkillCategory) => Skill[];
  searchSkills: (query: string) => Skill[];
  
  setLoading: (isLoading: boolean) => void;
  setCreating: (isCreating: boolean) => void;
  setError: (error: string | null) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  skills: new Map<string, Skill>(),
  categories: SKILL_CATEGORIES,
  isLoading: false,
  isCreating: false,
  error: null,
};

export const useSkillStore = create<SkillState>((set, get) => ({
  ...initialState,
  
  setSkills: (skills) => {
    const map = new Map<string, Skill>();
    skills.forEach(skill => map.set(skill.id, skill));
    set({ skills: map });
  },
  
  addSkill: (skill) => {
    const skills = new Map(get().skills);
    skills.set(skill.id, skill);
    set({ skills });
  },
  
  updateSkill: (id, updates) => {
    const skills = new Map(get().skills);
    const existing = skills.get(id);
    if (existing && !existing.isBuiltin) {
      skills.set(id, { ...existing, ...updates });
      set({ skills });
    }
  },
  
  deleteSkill: (id) => {
    const skills = new Map(get().skills);
    const skill = skills.get(id);
    if (skill && !skill.isBuiltin) {
      skills.delete(id);
      set({ skills });
    }
  },
  
  getSkill: (id) => get().skills.get(id),
  
  getBuiltinSkills: () => {
    return Array.from(get().skills.values()).filter(s => s.isBuiltin);
  },
  
  getCustomSkills: () => {
    return Array.from(get().skills.values()).filter(s => !s.isBuiltin);
  },
  
  getAllSkills: () => Array.from(get().skills.values()),
  
  getSkillsByCategory: (category) => {
    return Array.from(get().skills.values()).filter(s => s.category === category);
  },
  
  searchSkills: (query) => {
    const lowerQuery = query.toLowerCase();
    return Array.from(get().skills.values()).filter(skill =>
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery) ||
      skill.triggers.some(t => t.toLowerCase().includes(lowerQuery))
    );
  },
  
  setLoading: (isLoading) => set({ isLoading }),
  setCreating: (isCreating) => set({ isCreating }),
  setError: (error) => set({ error }),
  
  reset: () => set(initialState),
}));

// Selector hooks
export const useSkill = (id: string) => {
  return useSkillStore(state => state.skills.get(id));
};

export const useBuiltinSkills = () => {
  const skills = useSkillStore(state => state.skills);
  return Array.from(skills.values()).filter(s => s.isBuiltin);
};

export const useCustomSkills = () => {
  const skills = useSkillStore(state => state.skills);
  return Array.from(skills.values()).filter(s => !s.isBuiltin);
};

export const useSkillsByCategory = (category: SkillCategory) => {
  const skills = useSkillStore(state => state.skills);
  return Array.from(skills.values()).filter(s => s.category === category);
};

export const useSkillCategories = () => {
  return useSkillStore(state => state.categories);
};
