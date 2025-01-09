'use client'

import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useState } from 'react'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  position?: 'top' | 'bottom';
  targetRef: React.RefObject<HTMLElement>;
}

export default function EmojiPicker({ 
  onEmojiSelect, 
  position = 'bottom',
  targetRef
}: EmojiPickerProps) {
  const { theme } = useTheme()
  const [pickerStyle, setPickerStyle] = useState({
    top: 0,
    right: 0
  });

  useEffect(() => {
    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const pickerHeight = 420; // Approximate height of the emoji picker
      
      // Calculate initial top position
      let topPosition = position === 'top' ? rect.top - pickerHeight : rect.bottom + 10;
      
      // If the picker would be cut off at the top, position it below the button instead
      if (topPosition < 0) {
        topPosition = rect.bottom + 10;
      }

      setPickerStyle({
        top: topPosition,
        right: windowWidth - rect.right
      });
    }
  }, [targetRef, position]);

  const handleEmojiSelect = useCallback((emoji: any) => {
    onEmojiSelect(emoji.native);
  }, [onEmojiSelect]);

  return (
    <div 
      style={{
        position: 'fixed',
        top: pickerStyle.top,
        right: pickerStyle.right,
        zIndex: 50
      }}
      data-emoji-picker
    >
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