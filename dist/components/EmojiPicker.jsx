"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EmojiPicker;
const data_1 = __importDefault(require("@emoji-mart/data"));
const react_1 = __importDefault(require("@emoji-mart/react"));
const next_themes_1 = require("next-themes");
const react_2 = require("react");
function EmojiPicker({ onEmojiSelect, position = 'bottom', targetRef }) {
    const { theme } = (0, next_themes_1.useTheme)();
    const [pickerStyle, setPickerStyle] = (0, react_2.useState)({
        top: 0,
        right: 0
    });
    (0, react_2.useEffect)(() => {
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
            }
            else if (topPosition + pickerHeight > windowHeight - padding) {
                topPosition = rect.top - pickerHeight - padding;
            }
            setPickerStyle({
                top: topPosition,
                right: rightPosition
            });
        }
    }, [targetRef, position]);
    const handleEmojiSelect = (0, react_2.useCallback)((emoji) => {
        onEmojiSelect(emoji.native);
    }, [onEmojiSelect]);
    return (<div style={{
            position: 'fixed',
            top: pickerStyle.top,
            right: pickerStyle.right,
            zIndex: 50
        }} data-emoji-picker>
      <div className="shadow-lg rounded-lg overflow-hidden">
        <react_1.default data={data_1.default} onEmojiSelect={handleEmojiSelect} theme={theme === 'dark' ? 'dark' : 'light'} previewPosition="none" skinTonePosition="none"/>
      </div>
    </div>);
}
