/**
 * API client for communicating with the FastAPI backend.
 */

const BASE_URL = '/api';

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new APIError(
      data?.detail || `Request failed: ${response.statusText}`,
      response.status,
      data
    );
  }

  return response.json();
}

// Conversations API
export const conversationsApi = {
  list: () => request<any[]>('/conversations'),
  
  get: (id: string) => request<any>(`/conversations/${id}`),
  
  create: (data: {
    type: string;
    agent_ids: string[];
    skill_ids: string[];
    title?: string;
  }) => request<any>('/conversations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  delete: (id: string) => request<void>(`/conversations/${id}`, {
    method: 'DELETE',
  }),
  
  sendMessage: (id: string, content: string, mentionAgentId?: string) =>
    request<any>(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, mention_agent_id: mentionAgentId }),
    }),
  
  updateAgents: (id: string, agentIds: string[]) =>
    request<any>(`/conversations/${id}/agents`, {
      method: 'PUT',
      body: JSON.stringify({ agent_ids: agentIds }),
    }),
  
  updateSkills: (id: string, skillIds: string[]) =>
    request<any>(`/conversations/${id}/skills`, {
      method: 'PUT',
      body: JSON.stringify({ skill_ids: skillIds }),
    }),
};

// Agents API
export const agentsApi = {
  list: () => request<any[]>('/agents'),
  
  get: (id: string) => request<any>(`/agents/${id}`),
  
  create: (data: {
    name: string;
    description: string;
    avatar?: string;
    color?: string;
    system_prompt?: string;
    tool_ids?: string[];
    skill_ids?: string[];
  }) => request<any>('/agents', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: string, data: Partial<{
    name: string;
    description: string;
    avatar: string;
    color: string;
    system_prompt: string;
    tool_ids: string[];
    skill_ids: string[];
  }>) => request<any>(`/agents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id: string) => request<void>(`/agents/${id}`, {
    method: 'DELETE',
  }),
  
  listTools: () => request<any[]>('/agents/tools'),
};

// Skills API
export const skillsApi = {
  list: () => request<any[]>('/skills'),
  
  get: (id: string) => request<any>(`/skills/${id}`),
  
  create: (data: {
    name: string;
    description: string;
    icon?: string;
    category?: string;
    triggers?: string[];
    content: string;
  }) => request<any>('/skills', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: string, data: Partial<{
    name: string;
    description: string;
    icon: string;
    category: string;
    triggers: string[];
    content: string;
  }>) => request<any>(`/skills/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id: string) => request<void>(`/skills/${id}`, {
    method: 'DELETE',
  }),
  
  listCategories: () => request<any[]>('/skills/categories'),
};

// Settings API
export const settingsApi = {
  getLLM: () => request<{
    model: string;
    has_api_key: boolean;
    base_url: string | null;
    available_models: Array<{ id: string; name: string }>;
  }>('/settings/llm'),
  
  updateLLM: (data: {
    model?: string;
    api_key?: string;
    base_url?: string;
  }) => request<any>('/settings/llm', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  getApp: () => request<{
    data_dir: string;
    default_workspace: string;
    debug: boolean;
  }>('/settings/app'),
  
  getSDKStatus: () => request<{
    sdk_available: boolean;
    sdk_version: string;
    tools_available: boolean;
    llm_configured: boolean;
  }>('/settings/sdk-status'),
};

// Health API
export const healthApi = {
  check: () => request<{ status: string }>('/health'),
};

export { APIError };
