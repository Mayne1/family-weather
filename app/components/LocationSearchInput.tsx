"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { LocationCandidate } from "../lib/location";

type Props = {
  id: string;
  name?: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  forcedSuggestions?: LocationCandidate[];
  onChange: (value: string) => void;
  onSelect: (candidate: LocationCandidate) => void;
};

export default function LocationSearchInput({ id, name, value, required, placeholder, className = "", forcedSuggestions = [], onChange, onSelect }: Props) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<LocationCandidate[]>([]);
  const [open, setOpen] = useState(false);
  const selectedValue = useRef("");
  const typedValue = useRef("");

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2 || forcedSuggestions.length || query === selectedValue.current || query !== typedValue.current) {
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
    selectedValue.current = candidate.label;
    typedValue.current = "";
    onSelect(candidate);
    setSuggestions([]);
    setOpen(false);
  };
  const showChoices = choices.length > 0 && (open || forcedSuggestions.length > 0);

  return (
    <div className={`locationSearch ${className}`}>
      <input
        id={id}
        name={name}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showChoices}
        onChange={(event) => { selectedValue.current = ""; typedValue.current = event.target.value.trim(); setSuggestions([]); onChange(event.target.value); setOpen(true); }}
        onFocus={() => choices.length && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {showChoices && (
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
