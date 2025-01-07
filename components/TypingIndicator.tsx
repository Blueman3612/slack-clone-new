import React from 'react';

interface TypingIndicatorProps {
  name: string;
}

export default function TypingIndicator({ name }: TypingIndicatorProps) {
  return (
    <div className="text-sm text-gray-600 flex items-center gap-2">
      <span className="font-medium">{name}</span>
      <span className="text-gray-500">is typing</span>
      <span className="flex gap-1">
        <span className="animate-bounce delay-0">.</span>
        <span className="animate-bounce delay-100">.</span>
        <span className="animate-bounce delay-200">.</span>
      </span>
    </div>
  );
} 