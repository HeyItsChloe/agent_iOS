/**
 * iOS-style "+" button dropdown for triggering tool actions.
 * Similar to the attachment menu in iOS Messages.
 */

import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ToolAction, ToolActionId, getAvailableToolActions } from '../../types/tool-actions';

interface ToolsDropdownProps {
  /** Tool IDs enabled for the current conversation's agent(s) */
  enabledToolIds: string[];
  /** Callback when a tool action is selected */
  onToolAction: (actionId: ToolActionId) => void;
  /** Whether running in Electron environment */
  isElectron: boolean;
  /** Whether the dropdown should be disabled */
  disabled?: boolean;
}

export function ToolsDropdown({
  enabledToolIds,
  onToolAction,
  isElectron,
  disabled = false,
}: ToolsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get available actions based on enabled tools and platform
  const availableActions = getAvailableToolActions(enabledToolIds, isElectron);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleActionClick = (action: ToolAction) => {
    onToolAction(action.id);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Don't render if no tools available
  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Plus Button */}
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0',
          'bg-ios-blue text-white hover:bg-blue-600',
          'focus:outline-none focus:ring-2 focus:ring-ios-blue focus:ring-offset-2',
          isOpen && 'rotate-45 bg-ios-text-secondary hover:bg-gray-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={isOpen ? 'Close tools menu' : 'Open tools menu'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute bottom-12 left-0 w-72 z-50',
            'bg-ios-card rounded-2xl shadow-2xl border border-ios-separator overflow-hidden',
            'animate-in slide-in-from-bottom-2 fade-in duration-200'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header */}
          <div className="px-4 py-2.5 bg-ios-secondary/50 border-b border-ios-separator">
            <span className="text-xs font-semibold text-ios-text-secondary uppercase tracking-wider">
              Tools
            </span>
          </div>

          {/* Action Items */}
          <div className="py-1">
            {availableActions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={cn(
                  'w-full px-4 py-3 flex items-center gap-3',
                  'hover:bg-ios-secondary active:bg-ios-secondary/80',
                  'transition-colors text-left',
                  'focus:outline-none focus:bg-ios-secondary',
                  index !== availableActions.length - 1 && 'border-b border-ios-separator/50'
                )}
                role="menuitem"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-ios-secondary flex items-center justify-center text-xl flex-shrink-0">
                  {action.icon}
                </div>

                {/* Label and Description */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ios-text text-sm">
                    {action.label}
                  </div>
                  <div className="text-xs text-ios-text-secondary truncate">
                    {action.description}
                  </div>
                </div>

                {/* Electron-only indicator */}
                {action.electronOnly && (
                  <div className="text-[10px] text-ios-text-secondary bg-ios-secondary px-1.5 py-0.5 rounded">
                    App
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
