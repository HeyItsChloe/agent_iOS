import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showClose = true 
}: ModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className={cn(
        'relative w-full bg-ios-card rounded-2xl shadow-xl overflow-hidden animate-modal-in',
        sizeClasses[size]
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ios-separator">
          <h2 className="text-lg font-semibold text-ios-text">{title}</h2>
          {showClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-ios-secondary flex items-center justify-center text-ios-text-secondary transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ModalFooterProps {
  children: ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-ios-separator bg-ios-secondary/30">
      {children}
    </div>
  );
}
