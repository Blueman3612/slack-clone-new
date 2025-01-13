'use client'

import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { 
  Smile, 
  Calendar, 
  Clock, 
  X,
  CheckCircle2,
  MinusCircle,
  MoonStar,
  MessageCircle,
  LogOut
} from 'lucide-react'
import EmojiPicker from './EmojiPicker'
import { useUserStatus } from '@/contexts/UserStatusContext'

const DEFAULT_STATUSES = [
  { emoji: '👋', text: 'In a meeting', icon: Calendar },
  { emoji: '🏃', text: 'Commuting', icon: Clock },
  { emoji: '🤒', text: 'Out sick', icon: MinusCircle },
  { emoji: '🌴', text: 'Vacationing', icon: MoonStar },
  { emoji: '💻', text: 'Working remotely', icon: MessageCircle },
]

export default function UserStatus() {
  const { data: session } = useSession()
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<{ emoji?: string; text?: string } | null>(null)
  const [customStatusText, setCustomStatusText] = useState('')
  const [customStatusEmoji, setCustomStatusEmoji] = useState('😊')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const { status, setStatus } = useUserStatus()

  // Fetch initial status
  useEffect(() => {
    let isSubscribed = true;

    const fetchStatus = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch(`/api/user/${session.user.id}/status`);
        if (response.ok && isSubscribed) {
          const status = await response.json();
          setCurrentStatus(status ? {
            emoji: status.emoji,
            text: status.text
          } : null);
        }
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };

    fetchStatus();

    // Set up polling with a reasonable interval (e.g., 30 seconds)
    const interval = setInterval(fetchStatus, 30000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        showStatusMenu && 
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        emojiButtonRef.current && 
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        // Only handle mousedown for outside clicks
        setShowStatusMenu(false)
        setShowEmojiPicker(false)
      }
    }

    // Change from 'mousedown' to 'click'
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showStatusMenu])

  const updateStatus = async (status: { emoji?: string; text?: string } | null) => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    try {
      if (status) {
        const response = await fetch('/api/user/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emoji: status.emoji,
            text: status.text,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update status');
        }

        const updatedStatus = await response.json();
        setCurrentStatus({
          emoji: updatedStatus.emoji,
          text: updatedStatus.text
        });
      } else {
        // Clear status
        await fetch('/api/user/status', {
          method: 'DELETE',
        });
        setCurrentStatus(null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (customStatusText.trim()) {
      const newStatus = {
        emoji: customStatusEmoji,
        text: customStatusText.trim()
      };
      await updateStatus(newStatus);
      setShowStatusMenu(false)
      setCustomStatusText('')
    }
  }

  if (!session?.user) return null

  return (
    <div className="relative bg-gray-900">
      <button
        onClick={(e) => {
          e.preventDefault()
          setShowStatusMenu(!showStatusMenu)
          if (showEmojiPicker) {
            setShowEmojiPicker(false)
          }
        }}
        className="flex items-center space-x-3 w-full hover:bg-gray-700 p-6 rounded-md"
        disabled={isLoading}
      >
        <div className="relative flex-shrink-0">
          <Image
            src={session.user.image || '/default-avatar.png'}
            alt={session.user.name || 'User'}
            width={36}
            height={36}
            className="rounded-md"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {session.user.name}
          </p>
          {currentStatus ? (
            <p className="text-xs text-gray-400 truncate">
              {currentStatus.emoji} {currentStatus.text}
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              What's your status?
            </p>
          )}
        </div>
      </button>

      {showStatusMenu && (
        <div 
          ref={menuRef}
          className="absolute bottom-full left-0 mb-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden z-[60]"
        >
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-sm font-medium text-white mb-4">Update your status</h3>
            
            <form onSubmit={handleCustomStatusSubmit} className="flex items-center space-x-2 mb-4">
              <button
                type="button"
                ref={emojiButtonRef}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 hover:bg-gray-700 rounded"
              >
                {customStatusEmoji}
              </button>
              <input
                type="text"
                value={customStatusText}
                onChange={(e) => setCustomStatusText(e.target.value)}
                placeholder="What's your status?"
                className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>

            {showEmojiPicker && (
              <div className="absolute z-50">
                <EmojiPicker
                  onEmojiSelect={(emoji) => {
                    setCustomStatusEmoji(emoji)
                    setShowEmojiPicker(false)
                  }}
                  position="top"
                  targetRef={emojiButtonRef}
                  preventClickPropagation={true}
                />
              </div>
            )}

            {currentStatus && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">
                  {currentStatus.emoji} {currentStatus.text}
                </span>
                <button
                  onClick={() => setCurrentStatus(null)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          
          <div className="py-2">
            {DEFAULT_STATUSES.map((status, index) => (
              <button
                key={index}
                className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center space-x-3"
                onClick={async () => {
                  await updateStatus({ emoji: status.emoji, text: status.text });
                  setShowStatusMenu(false);
                }}
                disabled={isLoading}
              >
                <span className="text-lg">{status.emoji}</span>
                <span className="text-sm text-gray-300">{status.text}</span>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-gray-700">
            <button
              onClick={async () => {
                await updateStatus(null);
                setShowStatusMenu(false);
              }}
              className="w-full px-3 py-2 text-sm text-white bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center space-x-2"
              disabled={isLoading}
            >
              <X size={16} />
              <span>Clear status</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 