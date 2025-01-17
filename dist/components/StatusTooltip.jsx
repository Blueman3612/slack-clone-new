"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StatusTooltip;
const react_dom_1 = require("react-dom");
const react_1 = require("react");
function StatusTooltip({ emoji, text, targetRef }) {
    if (!emoji && !text)
        return null;
    const [position, setPosition] = (0, react_1.useState)({ top: 0, left: 0 });
    (0, react_1.useEffect)(() => {
        if (targetRef) {
            const updatePosition = () => {
                const rect = targetRef.getBoundingClientRect();
                setPosition({
                    top: rect.top - 48,
                    left: rect.left + (rect.width / 2),
                });
            };
            updatePosition();
            window.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [targetRef]);
    const tooltip = (<div className="fixed z-[1000] px-3 py-2 bg-gray-800/95 text-white text-sm rounded-md shadow-lg whitespace-nowrap border border-gray-600" style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)',
            backdropFilter: 'blur(8px)',
        }}>
      {emoji} {text}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800/95 border-b border-r border-gray-600 rotate-45"/>
    </div>);
    if (typeof document === 'undefined')
        return null;
    return (0, react_dom_1.createPortal)(tooltip, document.body);
}
