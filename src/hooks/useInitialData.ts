/**
 * Hook to fetch initial data (agents, skills, etc.) when the app loads.
 */

import { useEffect, useState } from 'react';
import { agentsApi, skillsApi } from '../api/client';
import { useAgentStore } from '../stores/agentStore';
import { useSkillStore } from '../stores/skillStore';

export function useInitialData() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const setAgents = useAgentStore((state) => state.setAgents);
  const setTools = useAgentStore((state) => state.setTools);
  const setSkills = useSkillStore((state) => state.setSkills);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch agents, tools, and skills in parallel
        const [agentsData, skillsData] = await Promise.all([
          agentsApi.list().catch((err) => {
            console.error('Failed to fetch agents:', err);
            return [];
          }),
          skillsApi.list().catch((err) => {
            console.error('Failed to fetch skills:', err);
            return [];
          }),
        ]);

        // Also try to fetch tools
        const toolsData = await agentsApi.listTools().catch((err) => {
          console.error('Failed to fetch tools:', err);
          return [];
        });

        // Map backend data to frontend types
        const agents = agentsData.map((a: any) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          avatar: a.avatar || null,
          color: a.color || '#007AFF',
          type: a.type || 'builtin',
          systemPrompt: a.system_prompt || '',
          toolIds: a.tool_ids || [],
          skillIds: a.skill_ids || [],
          isBuiltin: a.is_builtin ?? true,
        }));

        const skills = skillsData.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          icon: s.icon || '✨',
          category: s.category || 'general',
          triggers: s.triggers || [],
          content: s.content || '',
          isBuiltin: s.is_builtin ?? false,
        }));

        const tools = toolsData.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          icon: t.icon || '🔧',
          annotations: t.annotations || {
            readOnly: false,
            destructive: false,
            idempotent: false,
            openWorld: false,
          },
        }));

        // Update stores
        setAgents(agents);
        setSkills(skills);
        setTools(tools);

        console.log(`Loaded ${agents.length} agents, ${skills.length} skills, ${tools.length} tools`);
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchInitialData();
  }, [setAgents, setSkills, setTools]);

  return { isLoading, error };
}
