import React from 'react';

export function highlightText(text: string, query: string): JSX.Element[] {
  console.log('Highlighting text:', { text, query });
  
  if (!query.trim()) {
    return [React.createElement('span', { key: '0' }, text)];
  }
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  
  console.log('Split parts:', parts);
  
  return parts.map((part, index) => {
    const isMatch = part.toLowerCase() === query.toLowerCase();
    console.log('Part:', { part, isMatch });
    
    if (isMatch) {
      return React.createElement('span', {
        key: index,
        className: "bg-yellow-200 dark:bg-yellow-900 text-black dark:text-white relative z-10",
        style: { display: 'inline-block' }
      }, part);
    }
    return React.createElement('span', { 
      key: index,
      style: { display: 'inline-block' }
    }, part);
  });
} 