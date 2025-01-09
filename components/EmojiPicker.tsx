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
      const windowHeight = window.innerHeight;
      const pickerHeight = 420;
      const pickerWidth = 352;
      const padding = 10;
      
      let rightPosition = windowWidth - rect.right;
      let topPosition = position === 'top' ? rect.top - pickerHeight : rect.bottom + padding;
      
      // Ensure picker stays within right boundary
      if (rect.right - pickerWidth < padding) {
        rightPosition = windowWidth - (rect.right + pickerWidth + padding);
      }

      // Ensure picker stays within left boundary
      if (windowWidth - rightPosition - pickerWidth < padding) {
        rightPosition = padding;
      }

      // Ensure picker stays within vertical boundaries
      if (topPosition < padding) {
        topPosition = rect.bottom + padding;
      } else if (topPosition + pickerHeight > windowHeight - padding) {
        topPosition = rect.top - pickerHeight - padding;
      }

      setPickerStyle({
        top: topPosition,
        right: rightPosition
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