import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface DropdownOption {
  id: string | number;
  label: string;
  sublabel?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownClassName?: string;
  searchPlaceholder?: string;
}

export function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  dropdownClassName = "",
  searchPlaceholder = "Search..."
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sort options alphabetically by label
  const sortedOptions = [...options].sort((a, b) => 
    a.label.toLowerCase().localeCompare(b.label.toLowerCase())
  );

  // Filter options based on search query
  const filteredOptions = sortedOptions.filter(option => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const label = option.label.toLowerCase();
    const sublabel = option.sublabel?.toLowerCase() || '';
    
    return label.includes(query) || sublabel.includes(query);
  });

  // Find the selected option
  const selectedOption = options.find(option => option.id === value);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure the dropdown is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
    } else {
      // Clear search when dropdown closes
      setSearchQuery('');
    }
  }, [isOpen]);

  return (
    <div className={cn("relative w-full", className)} ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className="w-full justify-between font-normal"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption ? selectedOption.label : placeholder}
        {isOpen ? (
          <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        ) : (
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        )}
      </Button>

      {isOpen && (
        <div 
          className={cn(
            "absolute z-50 mt-1 w-full rounded-md border border-input bg-background shadow-md",
            dropdownClassName
          )}
        >
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    option.id === value && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                >
                  <div>
                    <span>{option.label}</span>
                    {option.sublabel && (
                      <span className="ml-2 text-xs text-muted-foreground">({option.sublabel})</span>
                    )}
                  </div>
                  {option.id === value && <Check className="h-4 w-4" />}
                </div>
              ))
            ) : (
              <div className="text-center py-2 text-sm text-muted-foreground">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}