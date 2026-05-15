import { useState } from 'react';
import { GitBranch, ArrowUpFromLine, ArrowDownToLine, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface GitToolbarProps {
  onGitCommand: (command: string) => void;
  disabled?: boolean;
}

export function GitToolbar({ onGitCommand, disabled }: GitToolbarProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [currentBranch, setCurrentBranch] = useState('main');

  const handleCommand = async (command: string, label: string) => {
    if (disabled || isLoading) return;
    
    setIsLoading(label);
    try {
      onGitCommand(command);
    } finally {
      // Reset after a short delay to show feedback
      setTimeout(() => setIsLoading(null), 500);
    }
  };

  const handlePush = () => handleCommand('git push', 'push');
  const handlePull = () => handleCommand('git pull', 'pull');
  
  const handleSwitchBranch = (branch: string) => {
    handleCommand(`git checkout ${branch}`, 'branch');
    setCurrentBranch(branch);
    setShowBranchMenu(false);
  };

  // Common branches - in a real app, these would be fetched from git
  const branches = ['main', 'develop', 'feature/new-feature'];

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-t border-ios-separator bg-ios-card/50">
      <span className="text-xs text-ios-text-secondary mr-2">Git:</span>
      
      {/* Push button */}
      <ToolbarButton
        onClick={handlePush}
        disabled={disabled || isLoading !== null}
        loading={isLoading === 'push'}
        icon={<ArrowUpFromLine size={14} />}
        label="Push"
      />
      
      {/* Pull button */}
      <ToolbarButton
        onClick={handlePull}
        disabled={disabled || isLoading !== null}
        loading={isLoading === 'pull'}
        icon={<ArrowDownToLine size={14} />}
        label="Pull"
      />
      
      {/* Branch switcher */}
      <div className="relative ml-1">
        <button
          onClick={() => setShowBranchMenu(!showBranchMenu)}
          disabled={disabled || isLoading !== null}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
            disabled || isLoading !== null
              ? 'text-ios-text-secondary cursor-not-allowed'
              : 'text-ios-text hover:bg-ios-secondary'
          )}
        >
          <GitBranch size={14} />
          <span className="max-w-[80px] truncate">{currentBranch}</span>
          <ChevronDown size={12} />
        </button>
        
        {/* Branch dropdown */}
        {showBranchMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowBranchMenu(false)} 
            />
            <div className="absolute bottom-full left-0 mb-1 w-40 bg-ios-card border border-ios-separator rounded-lg shadow-ios-lg overflow-hidden z-20">
              <div className="py-1">
                {branches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => handleSwitchBranch(branch)}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-xs hover:bg-ios-secondary transition-colors',
                      branch === currentBranch 
                        ? 'text-ios-blue font-medium' 
                        : 'text-ios-text'
                    )}
                  >
                    {branch === currentBranch && '✓ '}
                    {branch}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon: React.ReactNode;
  label: string;
}

function ToolbarButton({ onClick, disabled, loading, icon, label }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
        disabled
          ? 'text-ios-text-secondary cursor-not-allowed'
          : 'text-ios-text hover:bg-ios-secondary'
      )}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  );
}
