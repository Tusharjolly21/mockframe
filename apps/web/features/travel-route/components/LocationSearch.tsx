"use client";

import { useEffect, useState, useRef } from "react";
import { searchLocations, type LocationSearchResult } from "../services/geocoding";
import { Search, MapPin, Loader2 } from "lucide-react";

interface LocationSearchProps {
  label: string;
  placeholder?: string;
  onSelect: (location: LocationSearchResult) => void;
  initialValue?: string;
}

export function LocationSearch({ label, placeholder, onSelect, initialValue = "" }: LocationSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const locations = await searchLocations(query);
        setResults(locations);
        setOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={containerRef} className="relative w-full">
      <span className="block mb-1 text-xs font-semibold text-[#6b6b76] uppercase tracking-wider">{label}</span>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || "Search location..."}
          className="w-full h-10 pl-9 pr-9 text-sm rounded-lg border border-[#e4e4ec] bg-white text-[#17171c] placeholder-[#9a9aa4] focus:border-[#3b82f6] focus:outline-none transition-colors"
        />
        <Search className="absolute left-3 top-3 h-4 w-4 text-[#9a9aa4]" />
        {loading && <Loader2 className="absolute right-3 top-3 h-4 w-4 text-[#3b82f6] animate-spin" />}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1.5 bg-white border border-[#e4e4ec] rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-[#f1f1f5]">
          {results.map((loc) => (
            <li
              key={loc.id}
              onClick={() => {
                setQuery(loc.name);
                onSelect(loc);
                setOpen(false);
              }}
              className="flex items-start gap-2.5 px-3 py-2 text-xs text-[#17171c] hover:bg-[#f8f8fb] cursor-pointer transition-colors"
            >
              <MapPin className="h-4 w-4 text-[#3b82f6] mt-0.5 shrink-0" />
              <span className="line-clamp-2 leading-relaxed">{loc.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
