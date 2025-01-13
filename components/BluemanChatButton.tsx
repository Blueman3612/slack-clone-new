import { useState } from 'react';
import { BluemanChat } from './BluemanChat';

export function BluemanChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-gray-700"
      >
        <span className="text-blue-400">🤖</span>
        <span>Blueman AI</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-[500px] h-[600px] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Chat with Blueman</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1">
              <BluemanChat />
            </div>
          </div>
        </div>
      )}
    </>
  );
} 