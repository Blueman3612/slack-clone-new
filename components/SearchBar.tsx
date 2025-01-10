'use client'

import { useState, useEffect, useCallback } from 'react';
import { FiSearch } from 'react-icons/fi';
import debounce from 'lodash/debounce';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce the search to avoid too many API calls
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query);
    }, 300),
    [onSearch]
  );

  useEffect(() => {
    // Cleanup the debounced function on unmount
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="px-4 py-2 border-b border-gray-700 bg-gray-900">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleChange}
          placeholder="Search messages..."
          className="w-full pl-10 pr-4 py-2 rounded-md 
                   bg-gray-700 hover:bg-gray-600
                   text-white
                   placeholder-gray-400
                   border-none
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   transition-colors duration-200"
        />
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </form>
    </div>
  );
} 