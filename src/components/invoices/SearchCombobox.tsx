"use client";
import { useEffect, useRef, useState } from "react";
import { SearchOption } from "@/types/invoice";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  label: string;                                    // e.g. "Property"
  placeholder?: string;                             // e.g. "Search properties..."
  value: SearchOption | null;                       // currently selected option
  onChange: (option: SearchOption | null) => void;  // called when selection changes
  onSearch: (query: string) => Promise<SearchOption[]>; // fetch options from API
  disabled?: boolean;                               // e.g. Unit is disabled until Property is picked
}

export function SearchCombobox({
  label,
  placeholder = "Search...",
  value,
  onChange,
  onSearch,
  disabled = false,
}: Props) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce ref — we wait 300ms after the user stops typing before fetching
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Fetch options when query changes ──────────────────────────────────────
  useEffect(() => {
    if (!open) return; // don't fetch if popover is closed

    // Clear previous debounce timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await onSearch(query);
        // Deduplicate by id — handles the backend duplicate bug gracefully
        const seen = new Set<number>();
        const unique = results.filter(r => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
        setOptions(unique);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  // ─── Load initial options when popover opens ───────────────────────────────
  useEffect(() => {
    if (open && options.length === 0) {
      setQuery(""); // triggers the effect above with empty query = load all
    }
  }, [open]);

  const handleSelect = (option: SearchOption) => {
    // If clicking the already-selected option, deselect it
    onChange(value?.id === option.id ? null : option);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent the popover from opening
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {label}
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={`
              w-full h-9 justify-between text-sm font-normal px-3
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              ${value ? "text-gray-800" : "text-gray-400"}
            `}
          >
            <span className="truncate">
              {value ? value.name : placeholder}
            </span>

            <span className="flex items-center gap-1 ml-2 shrink-0">
              {/* Clear button — only shown when something is selected */}
              {value && (
                <X
                  className="w-3 h-3 text-gray-400 hover:text-gray-600"
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[240px] p-0" align="start">
          <Command shouldFilter={false}>
            {/* shouldFilter=false — we handle filtering via API, not locally */}
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}

              {!loading && options.length === 0 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}

              {!loading && options.length > 0 && (
                <CommandGroup>
                  {options.map(option => (
                    <CommandItem
                      key={option.id}
                      value={String(option.id)}
                      onSelect={() => handleSelect(option)}
                      className="flex items-center justify-between"
                    >
                      <span>{option.name}</span>
                      {value?.id === option.id && (
                        <Check className="w-4 h-4 text-[#EF4217]" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}