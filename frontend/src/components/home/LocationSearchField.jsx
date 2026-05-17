import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { CITIES } from '../../data/mockData';
import { normalizeSearchText, textMatchesKeyword } from '../../utils/searchText';

/** Gợi ý từ danh sách thành phố + địa chỉ tin đăng. */
export function buildLocationSuggestions(rooms, input) {
  const q = normalizeSearchText(input);
  const seen = new Set();
  const items = [];

  const push = (item) => {
    const key = `${item.kind}:${normalizeSearchText(item.label)}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  CITIES.forEach((city) => {
    if (!q || textMatchesKeyword(city, input)) {
      push({
        id: `city-${city}`,
        label: city,
        city,
        subtitle: 'Tỉnh / Thành phố',
        kind: 'city',
      });
    }
  });

  rooms.forEach((room) => {
    const city = room.city?.trim();
    if (
      city &&
      (!q || textMatchesKeyword(city, input) || textMatchesKeyword(room.address || '', input))
    ) {
      push({
        id: `room-city-${room.id}-${city}`,
        label: city,
        city,
        subtitle: 'Khu vực có tin đăng',
        kind: 'city',
      });
    }

    const addr = room.address?.trim();
    if (addr && (!q || textMatchesKeyword(addr, input))) {
      const short = addr.length > 48 ? `${addr.slice(0, 48)}…` : addr;
      push({
        id: `addr-${room.id}`,
        label: short,
        city: city || undefined,
        subtitle: room.title ? String(room.title).slice(0, 40) : 'Địa chỉ tin đăng',
        kind: 'address',
      });
    }
  });

  return items.slice(0, 12);
}

export default function LocationSearchField({
  value,
  onChange,
  onApply,
  rooms = [],
  className = '',
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const suggestions = useMemo(() => buildLocationSuggestions(rooms, value), [rooms, value]);

  useEffect(() => {
    setHighlight(0);
  }, [value, suggestions.length]);

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const apply = (item) => {
    const next = item?.label ?? value.trim();
    onChange(next);
    onApply?.({
      query: next,
      city: item?.city || (item?.kind === 'city' ? item.label : undefined),
      kind: item?.kind || 'text',
    });
    setOpen(false);
    inputRef.current?.blur();
  };

  const clear = () => {
    onChange('');
    onApply?.({ query: '', city: undefined, kind: 'clear' });
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((i) => Math.min(i + 1, Math.max(0, suggestions.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && suggestions[highlight]) {
        apply(suggestions[highlight]);
      } else if (value.trim()) {
        apply({ label: value.trim(), kind: 'text' });
      }
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && (suggestions.length > 0 || value.trim());

  return (
    <div className={className} ref={rootRef}>
      <label htmlFor={listId} className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
          <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        </span>
        Địa điểm
      </label>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          ref={inputRef}
          id={listId}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete="list"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Bạn muốn đến đâu?"
          className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm text-slate-800 shadow-sm outline-none transition-shadow placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25"
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Xóa địa điểm"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {showList && (
          <ul
            id={`${listId}-listbox`}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10"
          >
            {suggestions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-500">Không có gợi ý — nhấn Enter để tìm</li>
            ) : (
              suggestions.map((item, idx) => (
                <li key={item.id} role="option" aria-selected={idx === highlight}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => apply(item)}
                    className={`flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      idx === highlight ? 'bg-blue-50 text-blue-900' : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span className="mt-0.5 text-base leading-none" aria-hidden>
                      {item.kind === 'city' ? '🏙️' : '📍'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium truncate">{item.label}</span>
                      {item.subtitle && (
                        <span className="block text-xs text-slate-500 truncate">{item.subtitle}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))
            )}
            {value.trim() && (
              <li className="border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => apply({ label: value.trim(), kind: 'text' })}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  <Search className="h-4 w-4 shrink-0" />
                  Tìm &quot;{value.trim()}&quot;
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}