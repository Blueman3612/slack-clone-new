"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const TypingIndicator = (0, react_1.memo)(function TypingIndicator({ typingUsers }) {
    if (typingUsers.length === 0)
        return null;
    const text = typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : typingUsers.length === 2
            ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
            : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;
    return (<div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"/>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"/>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"/>
        </div>
        <span>{text}</span>
      </div>
    </div>);
});
exports.default = TypingIndicator;
