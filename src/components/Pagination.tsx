import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange
}) => {
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-sage-200 dark:border-sage-300 text-xs text-sage-500 font-medium">
      <div className="flex items-center space-x-2">
        <span>
          Showing <strong className="text-sage-800">{start}</strong> to <strong className="text-sage-800">{end}</strong> of <strong className="text-sage-800">{totalItems}</strong> entries
        </span>
        {onPageSizeChange && (
          <div className="flex items-center space-x-1.5 pl-2 border-l border-sage-200 dark:border-sage-300">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="bg-white dark:bg-sage-100 border border-sage-200 dark:border-sage-300 rounded-lg px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-brass-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-sage-200 dark:border-sage-300 text-sage-600 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((page, idx, arr) => (
            <React.Fragment key={page}>
              {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-sage-400">...</span>}
              <button
                onClick={() => onPageChange(page)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                  currentPage === page
                    ? 'bg-rehab-700 dark:bg-rehab-600 text-white shadow-xs'
                    : 'text-sage-600 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-200 border border-sage-200 dark:border-sage-300'
                }`}
              >
                {page}
              </button>
            </React.Fragment>
          ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-1.5 rounded-lg border border-sage-200 dark:border-sage-300 text-sage-600 dark:text-sage-400 hover:bg-sage-100 dark:hover:bg-sage-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};