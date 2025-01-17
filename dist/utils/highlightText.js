"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.highlightText = highlightText;
const react_1 = __importDefault(require("react"));
function highlightText(text, query) {
    if (!query.trim()) {
        return [react_1.default.createElement('span', { key: '0' }, text)];
    }
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => {
        const isMatch = part.toLowerCase() === query.toLowerCase();
        return react_1.default.createElement('span', {
            key: index,
            className: isMatch ? "bg-yellow-200 dark:bg-yellow-900 rounded px-0.5" : undefined
        }, part);
    });
}
