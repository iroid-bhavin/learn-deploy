import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { allTimezones, formatUtcOffset } from '../time'

interface Props {
  value: string
  onChange: (timezone: string) => void
}

// Current UTC offset of a timezone, e.g. "UTC+5:30" (falls back to "" if unsupported).
const offsetOf = (timeZone: string) => {
  try {
    return formatUtcOffset(new Date().toISOString(), timeZone)
  } catch {
    return ''
  }
}

const options = allTimezones().map((tz) => {
  const offset = offsetOf(tz)
  // Searchable by name, "UTC+5:30" and the "GMT+5:30" spelling.
  const search = `${tz.replace(/[_/]/g, ' ')} ${offset} ${offset.replace('UTC', 'GMT')}`.toLowerCase()
  return { tz, offset, search }
})

// Every word in the query must appear, so "new york" and "york america" both match.
const matches = (search: string, query: string) =>
  query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => search.includes(word))

export default function TimezoneSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const filtered = useMemo(() => options.filter((option) => matches(option.search, query)), [query])

  // Close when clicking anywhere outside the component.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Keep the highlighted option visible while using the arrow keys.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const openList = () => {
    setQuery('')
    setActive(Math.max(0, options.findIndex((option) => option.tz === value)))
    setOpen(true)
  }

  const choose = (tz: string) => {
    onChange(tz)
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[active]) choose(filtered[active].tz)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const currentOffset = options.find((option) => option.tz === value)?.offset ?? offsetOf(value)

  return (
    <div ref={rootRef} className="relative flex items-center gap-2 text-sm">
      <span className="text-gray-600">Display timezone</span>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-64 items-center justify-between gap-2 rounded border border-gray-300 bg-white px-2 py-1 text-left hover:border-blue-500"
      >
        <span className="truncate">{value}</span>
        <span className="shrink-0 text-xs text-gray-500">{currentOffset} ▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded border border-gray-200 bg-white shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search city, region or offset…"
            role="combobox"
            aria-controls={listId}
            aria-expanded
            aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
            className="w-full border-b border-gray-200 px-3 py-2 focus:outline-none"
          />
          <ul ref={listRef} id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-gray-500">No timezones found</li>}
            {filtered.map((option, index) => (
              <li
                key={option.tz}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.tz === value}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option.tz)}
                className={`flex cursor-pointer justify-between gap-2 px-3 py-1.5 ${
                  index === active ? 'bg-blue-50' : ''
                } ${option.tz === value ? 'font-medium text-blue-700' : ''}`}
              >
                <span className="truncate">{option.tz}</span>
                <span className="shrink-0 text-xs text-gray-500">{option.offset}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
