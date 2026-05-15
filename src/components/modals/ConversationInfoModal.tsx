import { useState } from 'react';
import { 
  X, 
  Edit3, 
  Image, 
  FileText, 
  Link2, 
  BellOff, 
  Bell,
  StopCircle,
  Trash2,
  Archive,
  Check
} from 'lucide-react';
import { useActiveConversation } from '../../stores/conversationStore';
import { useConversationStore } from '../../stores/conversationStore';
import { useAgentStore } from '../../stores/agentStore';

interface ConversationInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConversationInfoModal({ isOpen, onClose }: ConversationInfoModalProps) {
  const activeConversation = useActiveConversation();
  const { updateConversation, deleteConversation } = useConversationStore();
  const { agents } = useAgentStore();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !activeConversation) return null;

  const conversationAgents = activeConversation.agentIds
    .map(id => agents.get(id))
    .filter(Boolean);

  // Extract shared media from messages (images, files, links)
  const sharedMedia = {
    images: [] as { url: string; timestamp: Date }[],
    files: [] as { name: string; url: string; timestamp: Date }[],
    links: [] as { url: string; title: string; timestamp: Date }[],
  };

  // Parse messages for media (simplified - would need actual attachment data)
  activeConversation.messages.forEach(msg => {
    // Extract image URLs from content
    const imgMatches = msg.content.match(/!\[.*?\]\((.*?)\)/g);
    if (imgMatches) {
      imgMatches.forEach(match => {
        const url = match.match(/\((.*?)\)/)?.[1];
        if (url) sharedMedia.images.push({ url, timestamp: msg.timestamp });
      });
    }
    
    // Extract links from content
    const linkMatches = msg.content.match(/https?:\/\/[^\s)]+/g);
    if (linkMatches) {
      linkMatches.forEach(url => {
        if (!url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          sharedMedia.links.push({ url, title: url, timestamp: msg.timestamp });
        }
      });
    }
  });

  const displayName = activeConversation.title 
    || conversationAgents.map(a => a?.name).join(', ') 
    || 'Conversation';

  const handleStartEditName = () => {
    setEditedName(activeConversation.title || '');
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    updateConversation(activeConversation.id, { 
      title: editedName.trim() || null 
    });
    setIsEditingName(false);
  };

  const handleToggleMute = () => {
    updateConversation(activeConversation.id, { 
      isMuted: !activeConversation.isMuted 
    });
  };

  const handleStopConversation = () => {
    updateConversation(activeConversation.id, { 
      isStopped: true 
    });
  };

  const handleArchive = () => {
    updateConversation(activeConversation.id, { 
      isArchived: true 
    });
    onClose();
  };

  const handleDelete = () => {
    deleteConversation(activeConversation.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="relative w-full max-w-md bg-ios-card rounded-2xl shadow-xl overflow-hidden animate-modal-in">
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ios-separator">
          <h2 className="text-lg font-semibold text-ios-text">Conversation Info</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-ios-secondary flex items-center justify-center text-ios-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {/* Conversation header with avatars */}
          <div className="p-6 flex flex-col items-center border-b border-ios-separator">
            {/* Agent avatars */}
            <div className="flex -space-x-3 mb-4">
              {conversationAgents.slice(0, 4).map((agent, i) => (
                <div
                  key={agent?.id || i}
                  className="w-16 h-16 rounded-full border-3 border-ios-card flex items-center justify-center text-2xl"
                  style={{ 
                    backgroundColor: agent?.color || '#007AFF',
                    zIndex: 4 - i 
                  }}
                >
                  {agent?.avatar || '🤖'}
                </div>
              ))}
            </div>
            
            {/* Conversation name */}
            {isEditingName ? (
              <div className="flex items-center gap-2 w-full max-w-xs">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Conversation name"
                  className="flex-1 px-3 py-2 bg-ios-secondary rounded-lg text-ios-text text-center focus:outline-none focus:ring-2 focus:ring-ios-blue"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                />
                <button
                  onClick={handleSaveName}
                  className="w-8 h-8 rounded-full bg-ios-blue flex items-center justify-center text-white"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartEditName}
                className="flex items-center gap-2 text-xl font-semibold text-ios-text hover:text-ios-blue transition-colors"
              >
                {displayName}
                <Edit3 size={16} className="text-ios-text-secondary" />
              </button>
            )}
            
            {/* Agent names list */}
            <p className="text-sm text-ios-text-secondary mt-2">
              {conversationAgents.map(a => a?.name).join(', ')}
            </p>
          </div>

          {/* Mute toggle */}
          <div className="px-4 py-3 border-b border-ios-separator">
            <button
              onClick={handleToggleMute}
              className="w-full flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                {activeConversation.isMuted ? (
                  <BellOff size={20} className="text-ios-text-secondary" />
                ) : (
                  <Bell size={20} className="text-ios-blue" />
                )}
                <span className="text-ios-text">Mute Alerts</span>
              </div>
              <div className={`w-12 h-7 rounded-full transition-colors ${
                activeConversation.isMuted ? 'bg-ios-blue' : 'bg-ios-secondary'
              }`}>
                <div className={`w-6 h-6 rounded-full bg-white shadow mt-0.5 transition-transform ${
                  activeConversation.isMuted ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'
                }`} />
              </div>
            </button>
          </div>

          {/* Shared Media Section */}
          <div className="px-4 py-3 border-b border-ios-separator">
            <h3 className="text-sm font-medium text-ios-text-secondary mb-3">SHARED CONTENT</h3>
            
            {/* Images */}
            <button className="w-full flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Image size={20} className="text-ios-blue" />
                <span className="text-ios-text">Photos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ios-text-secondary">{sharedMedia.images.length}</span>
                <span className="text-ios-text-secondary">›</span>
              </div>
            </button>

            {/* Files */}
            <button className="w-full flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-ios-green" />
                <span className="text-ios-text">Files</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ios-text-secondary">{sharedMedia.files.length}</span>
                <span className="text-ios-text-secondary">›</span>
              </div>
            </button>

            {/* Links */}
            <button className="w-full flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Link2 size={20} className="text-ios-purple" />
                <span className="text-ios-text">Links</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ios-text-secondary">{sharedMedia.links.length}</span>
                <span className="text-ios-text-secondary">›</span>
              </div>
            </button>
          </div>

          {/* Actions */}
          <div className="px-4 py-3">
            {/* Stop Conversation */}
            {!activeConversation.isStopped && (
              <button
                onClick={handleStopConversation}
                className="w-full flex items-center gap-3 py-3 text-ios-orange"
              >
                <StopCircle size={20} />
                <span>Stop Conversation</span>
              </button>
            )}
            {activeConversation.isStopped && (
              <div className="flex items-center gap-3 py-3 text-ios-text-secondary">
                <StopCircle size={20} />
                <span>Conversation Stopped</span>
              </div>
            )}

            {/* Archive */}
            <button
              onClick={handleArchive}
              className="w-full flex items-center gap-3 py-3 text-ios-blue"
            >
              <Archive size={20} />
              <span>Archive Conversation</span>
            </button>

            {/* Delete */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 py-3 text-ios-red"
              >
                <Trash2 size={20} />
                <span>Delete Conversation</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 py-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 bg-ios-red text-white rounded-lg font-medium"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 bg-ios-secondary text-ios-text rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
