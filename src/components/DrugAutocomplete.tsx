import React, { useState, useRef, useEffect } from 'react';
import * as apiClient from '@/api/apiClient';

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

const DrugAutocomplete: React.FC<DrugAutocompleteProps> = ({
  onSelect,
  className = '',
  placeholder = 'הזן שם תרופה'
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ================= SEARCH ================= */

  const handleCustomDrug = () => {
  const customDrug: Drug = {
    id: 'custom',
    name: query.trim(),
  };

  setShowDropdown(false);
  onSelect(customDrug);
};


  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);

        const data = await apiClient.get<Drug[]>(
          `/api/drugs/search?q=${encodeURIComponent(query)}`
        );

        const list = Array.isArray(data) ? data : [];

        setResults(list.slice(0, 20));
        setShowDropdown(true);

      } catch (err) {
        console.error('Drug search failed:', err);
        setResults([]);
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    }, 300);

  }, [query]);

  /* ================= CLICK OUTSIDE ================= */

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ================= SELECT ================= */

  const handleSelect = (drug: Drug) => {
    setQuery(`${drug.name}${drug.dosage ? ' ' + drug.dosage : ''}`);
    setShowDropdown(false);
    onSelect(drug);
  };

  /* ================= UI ================= */

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
        <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow z-50 max-h-60 overflow-y-auto">

          {loading && (
            <div className="px-4 py-2 text-sm text-gray-500">טוען...</div>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <div
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-t"
              onMouseDown={handleCustomDrug}
            >
              <div className="font-medium">
                ➕ הוסף כטקסט חופשי
              </div>

              <div className="text-sm text-gray-500">
                {query}
              </div>
            </div>
          )}

          {results.map((drug) => (
            <div
              key={drug.id}
              className="flex justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onMouseDown={() => handleSelect(drug)}
            >
              <span>{drug.name}</span>
              {drug.dosage && <span className="text-xs text-gray-500">{drug.dosage}</span>}
            </div>
          ))}
          {query.trim() && (
              <div
                className="px-4 py-2 border-t bg-gray-50 hover:bg-gray-100 cursor-pointer"
                onMouseDown={handleCustomDrug}
              >
                ➕ השתמש ב־"{query}" כטקסט חופשי
              </div>
            )}
          
        </div>
        
      )}
    </div>
  );
};

export default DrugAutocomplete;