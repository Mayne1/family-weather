"use client";

import { useEffect, useId, useState } from "react";
import type { LocationCandidate } from "../lib/location";

type Props = {
  id: string;
  name?: string;
  value: string;
  required?: boolean;
  className?: string;
  forcedSuggestions?: LocationCandidate[];
  onChange: (value: string) => void;
  onSelect: (candidate: LocationCandidate) => void;
};

export default function LocationSearchInput({ id, name, value, required, className = "", forcedSuggestions = [], onChange, onSelect }: Props) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<LocationCandidate[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2 || forcedSuggestions.length) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json();
        if (response.ok && data.ok) {
          setSuggestions(data.suggestions || []);
          setOpen(true);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      }
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, forcedSuggestions.length]);

  const choices = forcedSuggestions.length ? forcedSuggestions : suggestions;
  const choose = (candidate: LocationCandidate) => {
    onSelect(candidate);
    setOpen(false);
  };

  return (
    <div className={`locationSearch ${className}`}>
      <input
        id={id}
        name={name}
        value={value}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && choices.length > 0}
        onChange={(event) => { setSuggestions([]); onChange(event.target.value); setOpen(true); }}
        onFocus={() => choices.length && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {open && choices.length > 0 && (
        <div className="locationSuggestions" id={listId} role="listbox">
          {choices.map((candidate) => (
            <button type="button" role="option" aria-selected="false" key={candidate.id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(candidate)}>
              <strong>{candidate.name}</strong>
              <span>{candidate.label}</span>
            </button>
          ))}
          <small>Location search data © OpenStreetMap contributors</small>
        </div>
      )}
    </div>
  );
}
