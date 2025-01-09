'use client'

import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { useTheme } from 'next-themes'
import { useCallback } from 'react'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  position?: 'top' | 'bottom';
}

export default function EmojiPicker({ 
  onEmojiSelect, 
  position = 'bottom' 
}: EmojiPickerProps) {
  const { theme } = useTheme()

  const handleEmojiSelect = useCallback((emoji: any) => {
    onEmojiSelect(emoji.native);
  }, [onEmojiSelect]);

  return (
    <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
      <div className="shadow-lg rounded-lg overflow-hidden">
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          theme={theme === 'dark' ? 'dark' : 'light'}
          previewPosition="none"
          skinTonePosition="none"
        />
      </div>
    </div>
  )
} 