import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

interface AutocompleteProps<TItem> {
  items: TItem[]
  query: string
  onQueryChange: (value: string) => void
  onSelect: (item: TItem) => void
  getItemId: (item: TItem) => string
  getItemLabel: (item: TItem) => string
  getItemSearchText?: (item: TItem) => string
  getItemSecondaryText?: (item: TItem) => string | undefined
  placeholder?: string
  className?: string
  inputClassName?: string
  dropdownClassName?: string
  noResultsText?: string
  minQueryLength?: number
  maxResults?: number
  emptyQueryShowsAll?: boolean
  disabled?: boolean
}

const DEFAULT_INPUT_CLASS =
  'w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all'

const normalizeText = (value: string) => value.toLocaleLowerCase().trim()

const renderHighlightedText = (value: string, query: string) => {
  if (!query) {
    return value
  }

  const normalizedValue = value.toLocaleLowerCase()
  const normalizedQuery = query.toLocaleLowerCase().trim()

  if (!normalizedQuery || !normalizedValue.includes(normalizedQuery)) {
    return value
  }

  const parts: Array<{ text: string; highlighted: boolean }> = []
  let cursor = 0

  while (cursor < value.length) {
    const matchIndex = normalizedValue.indexOf(normalizedQuery, cursor)

    if (matchIndex === -1) {
      parts.push({ text: value.slice(cursor), highlighted: false })
      break
    }

    if (matchIndex > cursor) {
      parts.push({ text: value.slice(cursor, matchIndex), highlighted: false })
    }

    const endIndex = matchIndex + normalizedQuery.length
    parts.push({ text: value.slice(matchIndex, endIndex), highlighted: true })
    cursor = endIndex
  }

  return parts.map((part, index) =>
    part.highlighted ? <mark key={`${part.text}-${index}`} className="bg-yellow-100 text-inherit rounded-sm px-0.5">{part.text}</mark> : <span key={`${part.text}-${index}`}>{part.text}</span>
  )
}

export default function Autocomplete<TItem>({
  items,
  query,
  onQueryChange,
  onSelect,
  getItemId,
  getItemLabel,
  getItemSearchText,
  getItemSecondaryText,
  placeholder,
  className = '',
  inputClassName = DEFAULT_INPUT_CLASS,
  dropdownClassName = '',
  noResultsText = 'לא נמצאו תוצאות',
  minQueryLength = 0,
  maxResults = 50,
  emptyQueryShowsAll = false,
  disabled = false,
}: AutocompleteProps<TItem>) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const normalizedQuery = normalizeText(query)

  const filteredItems = useMemo(() => {
    if (!normalizedQuery && !emptyQueryShowsAll) {
      return []
    }

    if (normalizedQuery.length < minQueryLength) {
      return []
    }

    const results = items.filter((item) => {
      const searchValue = normalizeText(getItemSearchText?.(item) ?? getItemLabel(item))
      if (!normalizedQuery) {
        return true
      }

      return searchValue.includes(normalizedQuery)
    })

    return results.slice(0, maxResults)
  }, [items, normalizedQuery, emptyQueryShowsAll, minQueryLength, maxResults, getItemSearchText, getItemLabel])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (filteredItems.length === 0) {
      setActiveIndex(-1)
      return
    }

    setActiveIndex((previousIndex) => {
      if (previousIndex < 0 || previousIndex >= filteredItems.length) {
        return 0
      }

      return previousIndex
    })
  }, [filteredItems, isOpen])

  const handleSelect = (item: TItem) => {
    onSelect(item)
    setIsOpen(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()

      if (!isOpen) {
        setIsOpen(true)
        return
      }

      if (filteredItems.length === 0) {
        return
      }

      setActiveIndex((currentIndex) => {
        if (currentIndex < 0) {
          return 0
        }

        return (currentIndex + 1) % filteredItems.length
      })
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()

      if (!isOpen) {
        setIsOpen(true)
        return
      }

      if (filteredItems.length === 0) {
        return
      }

      setActiveIndex((currentIndex) => {
        if (currentIndex <= 0) {
          return filteredItems.length - 1
        }

        return currentIndex - 1
      })
      return
    }

    if (event.key === 'Enter') {
      if (!isOpen || filteredItems.length === 0) {
        return
      }

      event.preventDefault()
      const indexToSelect = activeIndex >= 0 ? activeIndex : 0
      const selectedItem = filteredItems[indexToSelect]

      if (selectedItem) {
        handleSelect(selectedItem)
      }
      return
    }

    if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault()
        setIsOpen(false)
      }
    }
  }

  const shouldShowNoResults = isOpen && normalizedQuery.length >= minQueryLength && filteredItems.length === 0
  const shouldShowList = isOpen && filteredItems.length > 0

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => {
          onQueryChange(event.target.value)
          if (!isOpen) {
            setIsOpen(true)
          }
        }}
        onFocus={() => {
          if (disabled) {
            return
          }

          setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
        className={inputClassName}
      />

      {(shouldShowList || shouldShowNoResults) && (
        <div
          className={`absolute inset-x-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto ${dropdownClassName}`}
          role="listbox"
        >
          {shouldShowList && (
            <ul className="py-1">
              {filteredItems.map((item, index) => {
                const isActive = index === activeIndex
                const label = getItemLabel(item)
                const secondaryText = getItemSecondaryText?.(item)

                return (
                  <li
                    key={getItemId(item)}
                    role="option"
                    aria-selected={isActive}
                    onMouseDown={() => handleSelect(item)}
                    className={`px-3 py-2 cursor-pointer flex items-start justify-between gap-3 ${isActive ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                  >
                    <span className="text-sm text-slate-900 break-words">
                      {renderHighlightedText(label, query)}
                    </span>
                    {secondaryText ? (
                      <span className="text-xs text-slate-500 shrink-0 text-end">
                        {renderHighlightedText(secondaryText, query)}
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}

          {shouldShowNoResults ? (
            <div className="px-3 py-2 text-sm text-slate-500">{noResultsText}</div>
          ) : null}
        </div>
      )}
    </div>
  )
}
