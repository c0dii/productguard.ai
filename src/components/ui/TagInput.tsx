'use client';

import { useState, KeyboardEvent } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
  helpText?: string;
  maxTags?: number;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = 'Type and press Enter...',
  label,
  helpText,
  maxTags,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    if (value.includes(trimmedTag)) return;
    if (maxTags && value.length >= maxTags) return;

    onChange([...value, trimmedTag]);
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]!);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-pg-text">
          {label}
          {maxTags && (
            <span className="ml-2 text-xs text-pg-text-muted">
              ({value.length}/{maxTags})
            </span>
          )}
        </label>
      )}

      {/* Tags Display + Input */}
      <div className="min-h-[42px] px-3 py-2 rounded-lg bg-pg-surface border border-pg-border focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-opacity-20 transition-all">
        <div className="flex flex-wrap gap-2">
          {/* Existing Tags */}
          {value.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-cyan-300 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}

          {/* Input */}
          {(!maxTags || value.length < maxTags) && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => inputValue && addTag(inputValue)}
              placeholder={value.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[120px] bg-transparent text-pg-text placeholder:text-pg-text-muted focus:outline-none text-sm"
            />
          )}
        </div>
      </div>

      {/* Help Text */}
      {helpText && (
        <p className="text-xs text-pg-text-muted">{helpText}</p>
      )}
    </div>
  );
}
