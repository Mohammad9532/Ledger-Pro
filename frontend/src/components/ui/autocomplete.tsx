import * as React from "react"
import { Input } from "./input"

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string; logoUrl?: string; subLabel?: string }[];
  placeholder?: string;
}

export function Autocomplete({ value, onChange, options, placeholder }: AutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(value.toLowerCase()) || 
    opt.value.toLowerCase().includes(value.toLowerCase()) ||
    (opt.subLabel && opt.subLabel.toLowerCase().includes(value.toLowerCase()))
  );

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full"
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.map((opt, idx) => (
            <div
              key={idx}
              className="px-3 py-2 cursor-pointer hover:bg-muted flex items-center gap-3"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.logoUrl && (
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-white rounded border overflow-hidden">
                  <img src={opt.logoUrl} alt="" className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium">{opt.label}</span>
                {opt.subLabel && <span className="text-xs text-muted-foreground">{opt.subLabel}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
