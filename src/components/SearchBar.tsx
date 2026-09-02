import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  count?: number;
  total?: number;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  count,
  total,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-sage-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 text-xs bg-white dark:bg-sage-100 border border-sage-200 dark:border-sage-300 rounded-xl text-sage-900 focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500 transition-all font-medium placeholder:text-sage-400"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600 p-0.5 rounded-full hover:bg-sage-200/50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {typeof count === 'number' && typeof total === 'number' && (
        <div className="text-xs text-sage-500 shrink-0 font-medium hidden sm:block">
          Showing <span className="font-semibold text-rehab-800">{count}</span> of {total}
        </div>
      )}
    </div>
  );
};