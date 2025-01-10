import React from 'react';

export function highlightText(text: string, query: string): JSX.Element[] {
  if (!query.trim()) {
    return [React.createElement('span', { key: '0' }, text)];
  }
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  
  return parts.map((part, index) => {
    const isMatch = part.toLowerCase() === query.toLowerCase();
    
    return React.createElement('span', {
      key: index,
      className: isMatch ? "bg-yellow-200 dark:bg-yellow-900 rounded px-0.5" : undefined
    }, part);
  });
} 