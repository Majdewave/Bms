import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export type Drug = {
  id: string;
  name: string;
  dosage?: string;
};

interface DrugAutocompleteProps {
  onSelect: (drug: Drug) => void;
  className?: string;
  placeholder?: string;
}

const DrugAutocomplete: React.FC<DrugAutocompleteProps> = ({ onSelect, className = '', placeholder = 'הזן שם תרופה' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/drugs/search?q=${encodeURIComponent(query)}`);
        setResults(Array.isArray(res.data) ? res.data.slice(0, 20) : []);
        setShowDropdown(true);
      } catch {
        setResults([]);
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    }, 300);
    // eslint-disable-next-line
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (drug: Drug) => {
    setQuery(`${drug.name}${drug.dosage ? ' ' + drug.dosage : ''}`);
    setShowDropdown(false);
    onSelect(drug);
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <input
        type="text"
        className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500"
        value={query}
        placeholder={placeholder}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && results.length > 0 && setShowDropdown(true)}
        autoComplete="off"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
          {loading && (
            <div className="px-4 py-2 text-slate-500 text-sm">טוען...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-2 text-slate-400 text-sm">לא נמצאו תוצאות</div>
          )}
          {results.map((drug) => (
            <div
              key={drug.id}
              className="flex justify-between items-center px-4 py-2 cursor-pointer hover:bg-slate-100"
              onMouseDown={() => handleSelect(drug)}
            >
              <span className="font-medium">{drug.name}</span>
              {drug.dosage && <span className="text-xs text-slate-500 ml-2">{drug.dosage}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DrugAutocomplete;
