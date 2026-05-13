import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from './Modal';
import { useSettingsStore } from '../../stores/settingsStore';
import { Check, Moon, Sun, Monitor, Key, Server, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsTab = 'appearance' | 'llm' | 'about';

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  return (
    <Modal isOpen={true} onClose={onClose} title="Settings" size="lg">
      {/* Tabs */}
      <div className="flex border-b border-ios-separator">
        <TabButton
          active={activeTab === 'appearance'}
          onClick={() => setActiveTab('appearance')}
          icon={<Sun size={18} />}
          label="Appearance"
        />
        <TabButton
          active={activeTab === 'llm'}
          onClick={() => setActiveTab('llm')}
          icon={<Key size={18} />}
          label="LLM Config"
        />
        <TabButton
          active={activeTab === 'about'}
          onClick={() => setActiveTab('about')}
          icon={<Info size={18} />}
          label="About"
        />
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'llm' && <LLMSettings />}
        {activeTab === 'about' && <AboutSection />}
      </div>

      <ModalFooter>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-ios-blue text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          Done
        </button>
      </ModalFooter>
    </Modal>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2',
        active
          ? 'text-ios-blue border-ios-blue'
          : 'text-ios-text-secondary border-transparent hover:text-ios-text'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function AppearanceSettings() {
  const { 
    theme, 
    setTheme, 
    sidebarCollapsed, 
    setSidebarCollapsed,
    messageGrouping,
    setMessageGrouping 
  } = useSettingsStore();

  const themes: Array<{ id: 'light' | 'dark' | 'system'; icon: React.ReactNode; label: string }> = [
    { id: 'light', icon: <Sun size={20} />, label: 'Light' },
    { id: 'dark', icon: <Moon size={20} />, label: 'Dark' },
    { id: 'system', icon: <Monitor size={20} />, label: 'System' },
  ];

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div>
        <h3 className="text-sm font-medium text-ios-text mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                'p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all',
                theme === t.id
                  ? 'border-ios-blue bg-ios-blue/10'
                  : 'border-ios-separator hover:border-ios-blue/50'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                theme === t.id ? 'bg-ios-blue text-white' : 'bg-ios-secondary text-ios-text-secondary'
              )}>
                {t.icon}
              </div>
              <span className="text-sm text-ios-text">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div>
        <h3 className="text-sm font-medium text-ios-text mb-3">Sidebar</h3>
        <label className="flex items-center justify-between p-3 bg-ios-secondary rounded-xl cursor-pointer">
          <span className="text-ios-text">Collapsed sidebar</span>
          <ToggleSwitch
            checked={sidebarCollapsed}
            onChange={setSidebarCollapsed}
          />
        </label>
      </div>

      {/* Message grouping */}
      <div>
        <h3 className="text-sm font-medium text-ios-text mb-3">Messages</h3>
        <label className="flex items-center justify-between p-3 bg-ios-secondary rounded-xl cursor-pointer">
          <span className="text-ios-text">Group consecutive messages</span>
          <ToggleSwitch
            checked={messageGrouping}
            onChange={setMessageGrouping}
          />
        </label>
      </div>
    </div>
  );
}

function LLMSettings() {
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [sdkAvailable, setSdkAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/llm');
      if (response.ok) {
        const data = await response.json();
        setModel(data.model || '');
        setHasApiKey(data.has_api_key || false);
        setBaseUrl(data.base_url || '');
      }
      
      const statusResponse = await fetch('/api/settings/sdk-status');
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        setSdkAvailable(status.sdk_available);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
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
        const data = await response.json();
        setHasApiKey(data.has_api_key);
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

  const models = [
    { id: 'anthropic/claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
    { id: 'anthropic/claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'openhands/claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (OpenHands)' },
  ];

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

      {/* API Key Status */}
      <div className={cn(
        'p-3 rounded-xl flex items-center gap-3',
        hasApiKey ? 'bg-green-500/10' : 'bg-ios-secondary'
      )}>
        <Key size={20} className={hasApiKey ? 'text-green-500' : 'text-ios-text-secondary'} />
        <div>
          <div className={cn('font-medium', hasApiKey ? 'text-green-600' : 'text-ios-text')}>
            API Key {hasApiKey ? 'Configured' : 'Not Set'}
          </div>
          <div className="text-xs text-ios-text-secondary">
            {hasApiKey 
              ? 'LLM API key is configured'
              : 'Set your API key below to enable AI responses'}
          </div>
        </div>
      </div>

      {/* Model selection */}
      <div>
        <label className="block text-sm font-medium text-ios-text mb-1">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue"
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-ios-text mb-1">
          API Key {hasApiKey && '(already set)'}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={hasApiKey ? '••••••••' : 'Enter your API key'}
          className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
        />
        <p className="text-xs text-ios-text-secondary mt-1">
          Leave blank to keep current key. Supports Anthropic, OpenAI, and other providers.
        </p>
      </div>

      {/* Base URL (optional) */}
      <div>
        <label className="block text-sm font-medium text-ios-text mb-1">
          Base URL (optional)
        </label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
          className="w-full px-4 py-2 bg-ios-secondary rounded-lg text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue"
        />
        <p className="text-xs text-ios-text-secondary mt-1">
          For custom API endpoints or self-hosted models
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={cn(
          'p-3 rounded-lg text-sm',
          message.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
        )}>
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
