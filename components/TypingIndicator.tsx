import { memo } from 'react';

interface TypingIndicatorProps {
  typingUsers: string[];
}

const TypingIndicator = memo(function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const text = typingUsers.length === 1
    ? `${typingUsers[0]} is typing...`
    : typingUsers.length === 2
    ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
    : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;

  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
      <div className="flex items-center space-x-1">
        <div className="flex space-x-0.5">
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
        </div>
        <span>{text}</span>
      </div>
    </div>
  );
});

export default TypingIndicator; 