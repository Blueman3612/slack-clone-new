import { memo } from 'react';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    user?: {
      id: string;
      name?: string;
      email?: string;
    };
  };
  isOwn: boolean;
}

const MessageBubble = memo(function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const displayName = message.user?.name || message.user?.email?.split('@')[0] || 'Anonymous';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isOwn ? 'bg-blue-500 text-white' : 'bg-gray-100'
        }`}
      >
        <div className={`text-sm font-medium ${isOwn ? 'text-white' : 'text-gray-600'} mb-1`}>
          {displayName}
        </div>
        <div>{message.content}</div>
      </div>
    </div>
  );
});

export default MessageBubble; 