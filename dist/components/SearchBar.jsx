"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SearchBar;
const react_1 = require("react");
const debounce_1 = __importDefault(require("lodash/debounce"));
function SearchBar({ onSearch }) {
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [isSearching, setIsSearching] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (!searchQuery && !isSearching) {
            setSearchQuery('');
        }
    }, [searchQuery, isSearching]);
    const performSearch = async (query) => {
        if (!query.trim()) {
            onSearch('', []);
            setSearchQuery('');
            return;
        }
        setIsSearching(true);
        try {
            const response = await fetch(`/api/messages/search?query=${encodeURIComponent(query)}`);
            if (!response.ok)
                throw new Error('Search failed');
            const results = await response.json();
            onSearch(query, results);
        }
        catch (error) {
            console.error('Search error:', error);
        }
        finally {
            setIsSearching(false);
        }
    };
    const debouncedSearch = (0, react_1.useCallback)((0, debounce_1.default)(performSearch, 300), []);
    (0, react_1.useEffect)(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);
    const handleChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query);
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        performSearch(searchQuery);
    };
    return (<div className="relative">
      <input type="text" value={searchQuery} onChange={handleChange} placeholder="Search messages..." className="w-full p-3 rounded-lg border dark:border-gray-600 
                 bg-white dark:bg-gray-800 
                 text-gray-900 dark:text-white
                 placeholder-gray-500 dark:placeholder-gray-400
                 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
    </div>);
}
