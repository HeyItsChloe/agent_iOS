import { useState, useEffect, useMemo } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Key, Info, CheckCircle, XCircle, Loader2, Server } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { ModelConfig, LLMSettings, TestConnectionResult, SDKStatus } from '../../api/client';

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsTab = 'appearance' | 'llm' | 'advanced' | 'about';

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-ios-card rounded-xl shadow-2xl overflow-hidden border border-ios-separator" style={{ width: '600px', maxWidth: '95vw' }}>
        
        {/* macOS Window Titlebar */}
        <div className="h-12 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-b border-ios-separator flex items-center px-4 gap-2">
          <div className="flex gap-2">
            <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 text-center text-sm font-medium text-ios-text">Settings</div>
        </div>
        
        {/* Toolbar with icons (macOS System Preferences style) */}
        <div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-ios-separator p-3">
          <div className="flex justify-center gap-4">
            <ToolbarButton
              active={activeTab === 'appearance'}
              onClick={() => setActiveTab('appearance')}
              icon="🎨"
              label="Appearance"
            />
            <ToolbarButton
              active={activeTab === 'llm'}
              onClick={() => setActiveTab('llm')}
              icon="🔑"
              label="LLM Config"
            />
            <ToolbarButton
              active={activeTab === 'advanced'}
              onClick={() => setActiveTab('advanced')}
              icon="⚙️"
              label="Advanced"
            />
            <ToolbarButton
              active={activeTab === 'about'}
              onClick={() => setActiveTab('about')}
              icon="ℹ️"
              label="About"
            />
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'llm' && <LLMSettingsPanel />}
          {activeTab === 'advanced' && <AdvancedSettings />}
          {activeTab === 'about' && <AboutSection />}
        </div>

      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

function ToolbarButton({ active, onClick, icon, label }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
        active
          ? 'bg-ios-blue text-white'
          : 'text-ios-text hover:bg-ios-secondary'
      )}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function AppearanceSettings() {
  const { 
    theme, 
    setTheme, 
    compactMode, 
    setCompactMode,
    showTimestamps,
    setShowTimestamps 
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div>
        <h4 className="text-sm font-semibold text-ios-text mb-3">Theme</h4>
        <div className="flex gap-4">
          <label className="flex-1 cursor-pointer">
            <input type="radio" name="theme" className="sr-only" checked={theme === 'light'} onChange={() => setTheme('light')} />
            <div className={cn(
              'p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all',
              theme === 'light' ? 'border-ios-blue bg-ios-blue/10' : 'border-ios-separator hover:border-ios-blue/50'
            )}>
              <div className="w-12 h-8 rounded-md bg-white border border-gray-200 shadow-sm" />
              <span className={cn('text-xs font-medium', theme === 'light' ? 'text-ios-blue' : 'text-ios-text-secondary')}>Light</span>
            </div>
          </label>
          <label className="flex-1 cursor-pointer">
            <input type="radio" name="theme" className="sr-only" checked={theme === 'dark'} onChange={() => setTheme('dark')} />
            <div className={cn(
              'p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all',
              theme === 'dark' ? 'border-ios-blue bg-ios-blue/10' : 'border-ios-separator hover:border-ios-blue/50'
            )}>
              <div className="w-12 h-8 rounded-md bg-gray-800 border border-gray-600 shadow-sm" />
              <span className={cn('text-xs font-medium', theme === 'dark' ? 'text-ios-blue' : 'text-ios-text-secondary')}>Dark</span>
            </div>
          </label>
          <label className="flex-1 cursor-pointer">
            <input type="radio" name="theme" className="sr-only" checked={theme === 'system'} onChange={() => setTheme('system')} />
            <div className={cn(
              'p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all',
              theme === 'system' ? 'border-ios-blue bg-ios-blue/10' : 'border-ios-separator hover:border-ios-blue/50'
            )}>
              <div className="w-12 h-8 rounded-md bg-gradient-to-r from-white to-gray-800 border border-gray-300 shadow-sm" />
              <span className={cn('text-xs font-medium', theme === 'system' ? 'text-ios-blue' : 'text-ios-text-secondary')}>Auto</span>
            </div>
          </label>
        </div>
      </div>

      {/* Sidebar */}
      <div>
        <h4 className="text-sm font-semibold text-ios-text mb-3">Sidebar</h4>
        <div className="bg-ios-secondary rounded-lg p-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-ios-text">Compact sidebar mode</span>
            <ToggleSwitch checked={compactMode} onChange={setCompactMode} />
          </label>
        </div>
      </div>

      {/* Messages */}
      <div>
        <h4 className="text-sm font-semibold text-ios-text mb-3">Messages</h4>
        <div className="bg-ios-secondary rounded-lg p-3 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-ios-text">Show timestamps</span>
            <ToggleSwitch checked={showTimestamps} onChange={setShowTimestamps} />
          </label>
        </div>
      </div>
    </div>
  );
}

function AdvancedSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-ios-text mb-3">Data Management</h4>
        <div className="bg-ios-secondary rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-ios-text block">Clear conversation history</span>
              <span className="text-xs text-ios-text-secondary">Delete all messages and conversations</span>
            </div>
            <button className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-md transition-colors">
              Clear
            </button>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-ios-text mb-3">Developer</h4>
        <div className="bg-ios-secondary rounded-lg p-3 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm text-ios-text block">Debug mode</span>
              <span className="text-xs text-ios-text-secondary">Show detailed logs in console</span>
            </div>
            <ToggleSwitch checked={false} onChange={() => {}} />
          </label>
        </div>
      </div>
    </div>
  );
}

function LLMSettingsPanel() {
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [provider, setProvider] = useState('');
  const [providerDisplayName, setProviderDisplayName] = useState('');
  const [apiKeyHint, setApiKeyHint] = useState('');
  const [hasApiKeyForModel, setHasApiKeyForModel] = useState(false);
  const [sdkAvailable, setSdkAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/llm');
      if (response.ok) {
        const data: LLMSettings = await response.json();
        setModel(data.model || '');
        setProvider(data.provider || '');
        setProviderDisplayName(data.provider_display_name || '');
        setApiKeyHint(data.api_key_hint || '');
        setHasApiKeyForModel(data.has_api_key_for_model || false);
        setBaseUrl(data.base_url || '');
        setAvailableModels(data.available_models || []);
      }
      
      const statusResponse = await fetch('/api/settings/sdk-status');
      if (statusResponse.ok) {
        const status: SDKStatus = await statusResponse.json();
        setSdkAvailable(status.sdk_available);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group models by provider for the dropdown
  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelConfig[]> = {};
    for (const m of availableModels) {
      const p = m.provider || 'other';
      if (!groups[p]) groups[p] = [];
      groups[p].push(m);
    }
    return groups;
  }, [availableModels]);

  const providerOrder = ['openhands', 'anthropic', 'openai', 'other'];
  const providerLabels: Record<string, string> = {
    openhands: '── OpenHands Cloud (uses your account LLM) ──',
    anthropic: '── Anthropic (requires your API key) ──',
    openai: '── OpenAI (requires your API key) ──',
    other: '── Other ──',
  };

  // Check if using OpenHands Cloud
  const isOpenHandsCloud = provider === 'openhands';

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    // Find the model config
    const modelConfig = availableModels.find(m => m.id === newModel);
    if (modelConfig) {
      setProvider(modelConfig.provider);
      // Update base URL for OpenHands models
      if (modelConfig.base_url) {
        setBaseUrl(modelConfig.base_url);
      } else if (modelConfig.provider !== 'openhands') {
        setBaseUrl('');
      }
    }
    // Clear message when model changes
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || undefined,
          api_key: apiKey || undefined,
          base_url: baseUrl || undefined,
        }),
      });
      
      if (response.ok) {
        const data: LLMSettings = await response.json();
        setHasApiKeyForModel(data.has_api_key_for_model);
        setProvider(data.provider);
        setProviderDisplayName(data.provider_display_name);
        setApiKeyHint(data.api_key_hint);
        setApiKey(''); // Clear API key field
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey || undefined,
        }),
      });
      
      if (response.ok) {
        const result: TestConnectionResult = await response.json();
        if (result.success) {
          setMessage({ type: 'success', text: result.message });
        } else {
          setMessage({ type: 'error', text: result.message });
        }
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to test connection' });
    } finally {
      setTesting(false);
    }
  };

  // Get dynamic label for API key field
  const apiKeyLabel = useMemo(() => {
    if (provider === 'openhands') return 'OpenHands API Key';
    if (provider === 'anthropic') return 'Anthropic API Key';
    if (provider === 'openai') return 'OpenAI API Key';
    return 'API Key';
  }, [provider]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-ios-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* SDK Status */}
      <div className={cn(
        'p-3 rounded-xl flex items-center gap-3',
        sdkAvailable ? 'bg-green-500/10' : 'bg-yellow-500/10'
      )}>
        <Server size={20} className={sdkAvailable ? 'text-green-500' : 'text-yellow-500'} />
        <div>
          <div className={cn('font-medium', sdkAvailable ? 'text-green-600' : 'text-yellow-600')}>
            SDK {sdkAvailable ? 'Available' : 'Not Available'}
          </div>
          <div className="text-xs text-ios-text-secondary">
            {sdkAvailable 
              ? 'OpenHands SDK is installed and ready'
              : 'Install openhands-sdk for full functionality'}
          </div>
        </div>
      </div>

      {/* API Key Status for current model */}
      <div className={cn(
        'p-3 rounded-xl flex items-center gap-3',
        hasApiKeyForModel ? 'bg-green-500/10' : 'bg-ios-secondary'
      )}>
        {hasApiKeyForModel ? (
          <CheckCircle size={20} className="text-green-500" />
        ) : (
          <Key size={20} className="text-ios-text-secondary" />
        )}
        <div>
          <div className={cn('font-medium', hasApiKeyForModel ? 'text-green-600' : 'text-ios-text')}>
            {providerDisplayName} {hasApiKeyForModel ? 'Connected' : 'Not Configured'}
          </div>
          <div className="text-xs text-ios-text-secondary">
            {hasApiKeyForModel 
              ? `API key configured for ${providerDisplayName}`
              : `Enter your ${providerDisplayName} API key below`}
          </div>
        </div>
      </div>

      {/* Model selection with grouped options */}
      <div>
        <label className="block text-sm font-medium text-ios-text mb-1">Model</label>
        <select
          value={model}
          onChange={(e) => handleModelChange(e.target.value)}
          className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue"
        >
          {providerOrder.map(p => {
            const models = groupedModels[p];
            if (!models || models.length === 0) return null;
            return (
              <optgroup key={p} label={providerLabels[p] || p}>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
        {provider && (
          <p className="text-xs text-ios-text-secondary mt-1">
            Provider: {providerDisplayName}
          </p>
        )}
      </div>

      {/* OpenHands Cloud explanation */}
      {isOpenHandsCloud && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-600">
              <strong>OpenHands Cloud Mode:</strong> Runs on OpenHands infrastructure using 
              the LLM configured in your OpenHands account settings at{' '}
              <a href="https://app.all-hands.dev" target="_blank" rel="noopener noreferrer" 
                 className="underline">app.all-hands.dev</a>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic API Key field */}
      <div>
        <label className="block text-sm font-medium text-ios-text mb-1">
          {apiKeyLabel} {hasApiKeyForModel && '(configured)'}
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasApiKeyForModel ? '••••••••••••••••' : `Enter your ${apiKeyLabel}`}
            className="flex-1 px-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
          />
          <button
            onClick={handleTestConnection}
            disabled={testing || (!apiKey && !hasApiKeyForModel)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              testing || (!apiKey && !hasApiKeyForModel)
                ? 'bg-ios-secondary text-ios-text-secondary cursor-not-allowed'
                : 'bg-ios-secondary text-ios-blue hover:bg-ios-blue/10'
            )}
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : 'Test'}
          </button>
        </div>
        <p className="text-xs text-ios-text-secondary mt-1">
          {apiKeyHint || 'Enter your API key'}
        </p>
      </div>

      {/* Base URL (auto-set for OpenHands, editable for others) */}
      <div>
        <label className="block text-sm font-medium text-ios-text mb-1">
          Base URL {provider === 'openhands' ? '(auto-configured)' : '(optional)'}
        </label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={provider === 'openhands' ? 'https://app.all-hands.dev' : 'Leave empty for default'}
          className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
          readOnly={provider === 'openhands'}
        />
        <p className="text-xs text-ios-text-secondary mt-1">
          {provider === 'openhands' 
            ? 'Automatically set for OpenHands models'
            : 'For custom API endpoints or self-hosted models'}
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={cn(
          'p-3 rounded-lg text-sm flex items-center gap-2',
          message.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
        )}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'w-full py-2 rounded-lg font-medium transition-colors',
          saving
            ? 'bg-ios-secondary text-ios-text-secondary cursor-not-allowed'
            : 'bg-ios-blue text-white hover:bg-blue-600'
        )}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-ios-blue to-purple-500 flex items-center justify-center text-4xl">
          💬
        </div>
        <h2 className="text-xl font-semibold text-ios-text">Agent iOS Chat</h2>
        <p className="text-ios-text-secondary">Version 0.1.0</p>
      </div>

      <div className="bg-ios-secondary rounded-xl p-4 space-y-3">
        <p className="text-sm text-ios-text">
          A beautiful iOS Messages-style desktop application for chatting with AI agents 
          powered by the OpenHands SDK.
        </p>
        
        <div className="pt-2 border-t border-ios-separator">
          <h4 className="text-sm font-medium text-ios-text mb-2">Features</h4>
          <ul className="text-sm text-ios-text-secondary space-y-1">
            <li>• Single and group agent conversations</li>
            <li>• Sub-agent delegation support</li>
            <li>• Custom agents and skills</li>
            <li>• Real-time WebSocket streaming</li>
            <li>• Persistent conversation history</li>
          </ul>
        </div>
      </div>

      <div className="text-center text-sm text-ios-text-secondary">
        <a
          href="https://github.com/All-Hands-AI/OpenHands"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ios-blue hover:underline"
        >
          OpenHands on GitHub
        </a>
      </div>
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'w-12 h-7 rounded-full transition-colors relative',
        checked ? 'bg-ios-blue' : 'bg-ios-separator'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
