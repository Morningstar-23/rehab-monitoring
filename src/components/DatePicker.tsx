// src/components/DatePicker.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

export interface DatePickerProps {
  value: string; // ISO format: YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string;
  conductedDates?: string[];
  className?: string;
  popoverAlign?: 'left' | 'right';
  showTodayButton?: boolean;
  showClearButton?: boolean;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function constructISO(m: string, d: string, y: string): string | null {
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  const year = parseInt(y, 10);

  if (
    !isNaN(month) && month >= 1 && month <= 12 &&
    !isNaN(day) && day >= 1 && day <= 31 &&
    !isNaN(year) && year >= 1900 && year <= 2100
  ) {
    const formattedM = String(month).padStart(2, '0');
    const formattedD = String(day).padStart(2, '0');
    return `${year}-${formattedM}-${formattedD}`;
  }
  return null;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  conductedDates = [],
  className = '',
  popoverAlign = 'left',
  showTodayButton = true,
  showClearButton = true,
  disabled = false,
  size = 'sm'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    placement: 'bottom' | 'top';
  }>({ placement: 'bottom' });

  // Individual segments
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  // Compute fixed viewport coordinates to never get clipped by overflow:hidden
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverHeight = 320;
    const popoverWidth = 288;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openUp = spaceBelow < popoverHeight && spaceAbove > spaceBelow;

    let left: number | undefined = rect.left;
    let right: number | undefined = undefined;

    if (popoverAlign === 'right' || rect.left + popoverWidth > window.innerWidth - 12) {
      if (rect.right - popoverWidth < 12) {
        left = Math.max(12, window.innerWidth - popoverWidth - 12);
        right = undefined;
      } else {
        left = undefined;
        right = window.innerWidth - rect.right;
      }
    } else {
      left = Math.max(12, rect.left);
    }

    if (openUp) {
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        left,
        right,
        placement: 'top'
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        left,
        right,
        placement: 'bottom'
      });
    }
  }, [popoverAlign]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Synchronize when value changes externally or resets
  useEffect(() => {
    if (value && value.length === 10) {
      const [y, m, d] = value.split('-');
      if (y && m && d) {
        setYear(y);
        setMonth(m);
        setDay(d);
        return;
      }
    }
    if (!value) {
      setMonth('');
      setDay('');
      setYear('');
    }
  }, [value]);

  // Calendar view year/month
  const parsedDate = useMemo(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth());

  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [value]);

  // Click outside listener handling portaled element
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const commitSegments = (m: string, d: string, y: string) => {
    if (!m && !d && !y) {
      onChange('');
      return;
    }
    if (m && d && y && m.length <= 2 && d.length <= 2 && y.length === 4) {
      const iso = constructISO(m, d, y);
      if (iso) onChange(iso);
    }
  };

  // Month Handlers
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMonth(raw);

    if (raw.length === 1) {
      const num = parseInt(raw, 10);
      if (num >= 2 && num <= 9) {
        const padded = `0${num}`;
        setMonth(padded);
        commitSegments(padded, day, year);
        dayRef.current?.focus();
        dayRef.current?.select();
        return;
      }
    } else if (raw.length === 2) {
      commitSegments(raw, day, year);
      dayRef.current?.focus();
      dayRef.current?.select();
      return;
    }
    commitSegments(raw, day, year);
  };

  const handleMonthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['/', '-', '.', 'Enter', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      dayRef.current?.focus();
      dayRef.current?.select();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const cur = parseInt(month || '0', 10);
      const next = cur >= 12 ? 1 : cur + 1;
      const val = String(next).padStart(2, '0');
      setMonth(val);
      commitSegments(val, day, year);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const cur = parseInt(month || '1', 10);
      const next = cur <= 1 ? 12 : cur - 1;
      const val = String(next).padStart(2, '0');
      setMonth(val);
      commitSegments(val, day, year);
    }
  };

  // Day Handlers
  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(raw);

    if (raw.length === 1) {
      const num = parseInt(raw, 10);
      if (num >= 4 && num <= 9) {
        const padded = `0${num}`;
        setDay(padded);
        commitSegments(month, padded, year);
        yearRef.current?.focus();
        yearRef.current?.select();
        return;
      }
    } else if (raw.length === 2) {
      commitSegments(month, raw, year);
      yearRef.current?.focus();
      yearRef.current?.select();
      return;
    }
    commitSegments(month, raw, year);
  };

  const handleDayKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['/', '-', '.', 'Enter', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      yearRef.current?.focus();
      yearRef.current?.select();
    } else if (e.key === 'Backspace' && !day) {
      e.preventDefault();
      monthRef.current?.focus();
      monthRef.current?.select();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      monthRef.current?.focus();
      monthRef.current?.select();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const cur = parseInt(day || '0', 10);
      const next = cur >= 31 ? 1 : cur + 1;
      const val = String(next).padStart(2, '0');
      setDay(val);
      commitSegments(month, val, year);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const cur = parseInt(day || '1', 10);
      const next = cur <= 1 ? 31 : cur - 1;
      const val = String(next).padStart(2, '0');
      setDay(val);
      commitSegments(month, val, year);
    }
  };

  // Year Handlers
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(raw);
    commitSegments(month, day, raw);
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !year) {
      e.preventDefault();
      dayRef.current?.focus();
      dayRef.current?.select();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      dayRef.current?.focus();
      dayRef.current?.select();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const cur = parseInt(year || String(new Date().getFullYear()), 10);
      const val = String(cur + 1);
      setYear(val);
      commitSegments(month, day, val);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const cur = parseInt(year || String(new Date().getFullYear()), 10);
      const val = String(cur - 1);
      setYear(val);
      commitSegments(month, day, val);
    }
  };

  // Smart Paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();

    const isoMatch = pasted.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      const mPad = m.padStart(2, '0');
      const dPad = d.padStart(2, '0');
      setMonth(mPad);
      setDay(dPad);
      setYear(y);
      commitSegments(mPad, dPad, y);
      return;
    }

    const usMatch = pasted.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (usMatch) {
      const [, m, d, y] = usMatch;
      const mPad = m.padStart(2, '0');
      const dPad = d.padStart(2, '0');
      setMonth(mPad);
      setDay(dPad);
      setYear(y);
      commitSegments(mPad, dPad, y);
      return;
    }

    const digits = pasted.replace(/\D/g, '');
    if (digits.length === 8) {
      const mPad = digits.slice(0, 2);
      const dPad = digits.slice(2, 4);
      const y = digits.slice(4, 8);
      setMonth(mPad);
      setDay(dPad);
      setYear(y);
      commitSegments(mPad, dPad, y);
    }
  };

  // Calendar Navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(v => v - 1);
    } else {
      setViewMonth(v => v - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(v => v + 1);
    } else {
      setViewMonth(v => v + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handleSelectDay = (dNum: number) => {
    const formattedM = String(viewMonth + 1).padStart(2, '0');
    const formattedD = String(dNum).padStart(2, '0');
    const isoDate = `${viewYear}-${formattedM}-${formattedD}`;
    setMonth(formattedM);
    setDay(formattedD);
    setYear(String(viewYear));
    onChange(isoDate);
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const today = new Date();
    const formattedM = String(today.getMonth() + 1).padStart(2, '0');
    const formattedD = String(today.getDate()).padStart(2, '0');
    const yStr = String(today.getFullYear());
    setMonth(formattedM);
    setDay(formattedD);
    setYear(yStr);
    onChange(`${yStr}-${formattedM}-${formattedD}`);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const handleClear = () => {
    setMonth('');
    setDay('');
    setYear('');
    onChange('');
    setIsOpen(false);
    monthRef.current?.focus();
  };

  const hasValue = Boolean(month || day || year || value);

  const sizeStyles = {
    xs: {
      wrapper: 'py-0.5 px-2 text-[11px] rounded-lg h-7',
      month: 'w-5',
      day: 'w-5',
      year: 'w-8',
      btn: 'p-1',
      icon: 'w-3 h-3'
    },
    sm: {
      wrapper: 'py-1 px-2.5 text-xs rounded-xl h-8',
      month: 'w-6',
      day: 'w-6',
      year: 'w-10',
      btn: 'p-1',
      icon: 'w-3.5 h-3.5'
    },
    md: {
      wrapper: 'py-1.5 px-3 text-sm rounded-xl h-9',
      month: 'w-7',
      day: 'w-7',
      year: 'w-12',
      btn: 'p-1.5',
      icon: 'w-4 h-4'
    }
  };

  const yOffset = coords.placement === 'top' ? 4 : -4;

  const calendarPopoverContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95, y: yOffset }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: yOffset }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: coords.top !== undefined ? `${coords.top}px` : undefined,
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
            left: coords.left !== undefined ? `${coords.left}px` : undefined,
            right: coords.right !== undefined ? `${coords.right}px` : undefined,
            zIndex: 99999
          }}
          className="w-72 bg-white dark:bg-sage-100 border border-sage-200 dark:border-sage-300 rounded-2xl shadow-2xl p-4 text-left space-y-3 pointer-events-auto"
        >
          {/* Header: Month & Year Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="font-display font-semibold text-sm text-sage-900 dark:text-sage-100">
                {MONTH_NAMES[viewMonth]}
              </span>
              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                className="bg-sage-50 dark:bg-sage-200 border border-sage-200 dark:border-sage-300 rounded-lg px-1.5 py-0.5 text-xs font-semibold text-sage-900 dark:text-sage-100 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 35 }, (_, i) => new Date().getFullYear() - 15 + i).map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-0.5">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-sage-100 dark:hover:bg-sage-200 text-sage-600 dark:text-sage-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-sage-100 dark:hover:bg-sage-200 text-sage-600 dark:text-sage-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-sage-400 uppercase">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Days Matrix */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="w-8 h-8" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(dNum => {
              const formattedM = String(viewMonth + 1).padStart(2, '0');
              const formattedD = String(dNum).padStart(2, '0');
              const dateStr = `${viewYear}-${formattedM}-${formattedD}`;
              const isSelected = value === dateStr;
              const isScheduled = conductedDates.includes(dateStr);

              return (
                <button
                  key={dNum}
                  type="button"
                  onClick={() => handleSelectDay(dNum)}
                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-rehab-700 dark:bg-rehab-600 text-white shadow-xs'
                      : isScheduled
                      ? 'bg-brass-100/70 dark:bg-brass-200/30 text-brass-900 dark:text-brass-200 hover:bg-brass-200 dark:hover:bg-brass-300 border border-brass-300/50'
                      : 'text-sage-700 dark:text-sage-200 hover:bg-sage-100 dark:hover:bg-sage-200'
                  }`}
                >
                  <span>{dNum}</span>
                  {isScheduled && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brass-600 dark:bg-brass-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Shortcuts */}
          {(showTodayButton || (showClearButton && hasValue)) && (
            <div className="pt-2 border-t border-sage-200 dark:border-sage-300 flex items-center justify-between text-xs font-semibold">
              {showTodayButton ? (
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="text-brass-700 dark:text-brass-400 hover:underline"
                >
                  Today
                </button>
              ) : <div />}

              {showClearButton && hasValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-sage-400 hover:text-red-500 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Segmented Input Wrapper */}
      <div
        className={`w-full bg-white dark:bg-sage-100 border border-sage-200 dark:border-sage-300 font-mono text-sage-900 dark:text-sage-100 flex items-center justify-between shadow-2xs focus-within:ring-2 focus-within:ring-brass-500/40 focus-within:border-brass-500 transition-all ${
          disabled ? 'opacity-40 cursor-not-allowed' : ''
        } ${sizeStyles[size].wrapper}`}
      >
        {/* Freely Clickable Segments: MM / DD / YYYY */}
        <div className="flex items-center space-x-0.5" onPaste={handlePaste}>
          <input
            ref={monthRef}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            value={month}
            onChange={handleMonthChange}
            onKeyDown={handleMonthKeyDown}
            onFocus={e => e.target.select()}
            placeholder="mm"
            className={`text-center bg-transparent focus:outline-none focus:bg-brass-100/40 dark:focus:bg-brass-500/20 rounded font-mono font-medium text-sage-900 dark:text-sage-100 placeholder:text-sage-400 placeholder:font-normal ${sizeStyles[size].month}`}
          />
          <span className="text-sage-400 font-mono select-none">/</span>

          <input
            ref={dayRef}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            value={day}
            onChange={handleDayChange}
            onKeyDown={handleDayKeyDown}
            onFocus={e => e.target.select()}
            placeholder="dd"
            className={`text-center bg-transparent focus:outline-none focus:bg-brass-100/40 dark:focus:bg-brass-500/20 rounded font-mono font-medium text-sage-900 dark:text-sage-100 placeholder:text-sage-400 placeholder:font-normal ${sizeStyles[size].day}`}
          />
          <span className="text-sage-400 font-mono select-none">/</span>

          <input
            ref={yearRef}
            type="text"
            inputMode="numeric"
            disabled={disabled}
            value={year}
            onChange={handleYearChange}
            onKeyDown={handleYearKeyDown}
            onFocus={e => e.target.select()}
            placeholder="yyyy"
            className={`text-center bg-transparent focus:outline-none focus:bg-brass-100/40 dark:focus:bg-brass-500/20 rounded font-mono font-medium text-sage-900 dark:text-sage-100 placeholder:text-sage-400 placeholder:font-normal ${sizeStyles[size].year}`}
          />
        </div>

        {/* Action icons on the right */}
        <div className="flex items-center space-x-1 pl-1">
          {hasValue && showClearButton && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-md text-sage-400 hover:text-red-500 hover:bg-sage-100 dark:hover:bg-sage-200 transition-colors"
              title="Clear date"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(prev => !prev)}
            className={`rounded-lg text-brass-600 dark:text-brass-400 hover:bg-sage-100 dark:hover:bg-sage-200 focus:outline-none transition-colors ${
              sizeStyles[size].btn
            } ${isOpen ? 'bg-sage-100 dark:bg-sage-200 text-brass-700' : ''}`}
            title="Open calendar picker"
          >
            <CalendarIcon className={sizeStyles[size].icon} />
          </button>
        </div>
      </div>

      {/* Render calendar popover directly to body via portal */}
      {typeof document !== 'undefined' && createPortal(calendarPopoverContent, document.body)}
    </div>
  );
};