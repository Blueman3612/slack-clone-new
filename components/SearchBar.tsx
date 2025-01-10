'use client'

import { useState, useEffect, useCallback } from 'react';
import { FiSearch } from 'react-icons/fi';
import debounce from 'lodash/debounce';
import { Message } from '@/types';

interface SearchBarProps {
  onSearch: (query: string, results: Array<{
    key: string;
    type: 'channel' | 'dm';
    name: string;
    messages: Message[];
    messageCount: number;
  }>) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery && !isSearching) {
      setSearchQuery('');
    }
  }, [searchQuery, isSearching]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      onSearch('', []);
      setSearchQuery('');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/messages/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      
      const results = await response.json();
      onSearch(query, results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce(performSearch, 300),
    []
  );

  useEffect(() => {
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
    performSearch(searchQuery);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={searchQuery}
        onChange={handleChange}
        placeholder="Search messages..."
        className="w-full p-3 rounded-lg border dark:border-gray-600 
                 bg-white dark:bg-gray-800 
                 text-gray-900 dark:text-white
                 placeholder-gray-500 dark:placeholder-gray-400
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
} 