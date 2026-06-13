import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Menu, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface SearchResult {
  type: string;
  id: number;
  label: string;
  sub: string;
}

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 1) { setResults([]); setShowResults(false); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(value)}`);
        setResults(res.data.results || []);
        setShowResults(true);
      } catch { setResults([]); }
    }, 300);
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setQuery('');
    if (result.type === 'contact') navigate(`/people/${result.id}`);
    else if (result.type === 'transaction') navigate(`/transactions?highlight=${result.id}`);
    else if (result.type === 'account') navigate(`/accounts/${result.id}`);
  };

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors">
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div ref={searchRef} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search people, transactions, accounts..."
            className="pl-9 w-64 md:w-80 bg-background"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
          />
          {showResults && results.length > 0 && (
            <div className="absolute top-12 left-0 w-full bg-popover border border-border rounded-lg shadow-xl py-2 max-h-80 overflow-y-auto z-50">
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}-${i}`}
                  className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors"
                  onClick={() => handleResultClick(r)}
                >
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.sub}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
