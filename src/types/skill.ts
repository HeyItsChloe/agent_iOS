/**
 * Skill data types.
 */

/** Skill category */
export type SkillCategory = 'coding' | 'documentation' | 'analysis' | 'custom';

/** A skill that enhances agent capabilities */
export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: SkillCategory;
  triggers: string[];
  content: string;
  isBuiltin: boolean;
}

/** Request to create a new skill */
export interface SkillCreate {
  name: string;
  description: string;
  icon?: string;
  category?: SkillCategory;
  triggers?: string[];
  content: string;
}

/** Request to update a skill */
export interface SkillUpdate {
  name?: string;
  description?: string;
  icon?: string;
  category?: SkillCategory;
  triggers?: string[];
  content?: string;
}

/** Skill category metadata */
export interface SkillCategoryInfo {
  id: SkillCategory;
  name: string;
  icon: string;
}

/** Skill from API (snake_case) */
export interface SkillFromAPI {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: SkillCategory;
  triggers: string[];
  content: string;
  is_builtin: boolean;
}

/** Convert API skill to frontend skill */
export function parseSkill(api: SkillFromAPI): Skill {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    icon: api.icon,
    category: api.category,
    triggers: api.triggers,
    content: api.content,
    isBuiltin: api.is_builtin,
  };
}

/** Skill categories */
export const SKILL_CATEGORIES: SkillCategoryInfo[] = [
  { id: 'coding', name: 'Coding', icon: '💻' },
  { id: 'documentation', name: 'Documentation', icon: '📝' },
  { id: 'analysis', name: 'Analysis', icon: '🔍' },
  { id: 'custom', name: 'Custom', icon: '⚡' },
];

/** Get category info by ID */
export function getCategoryInfo(categoryId: SkillCategory): SkillCategoryInfo {
  return SKILL_CATEGORIES.find(c => c.id === categoryId) || SKILL_CATEGORIES[3];
}
