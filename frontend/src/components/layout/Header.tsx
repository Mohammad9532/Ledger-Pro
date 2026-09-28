import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Menu, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface SearchResult {
  type: string;
  id: number;
  label: string;
  sub: string;
}

const typeLabel: Record<string, string> = {
  contact: 'Person',
  transaction: 'Txn',
  account: 'Account',
};

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ctrl/Cmd + K jumps to search; Escape closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setShowResults(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

  const initials = (user?.name ?? 'LP')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <header className="h-16 shrink-0 border-b border-border bg-background/85 backdrop-blur-md flex items-center justify-between gap-3 px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div ref={searchRef} className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
          <input
            ref={inputRef}
            placeholder="Search people, transactions, accounts…"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-16 text-sm text-foreground placeholder:text-faint focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-ring/20 transition-[border-color,box-shadow] duration-150"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
          />
          <kbd className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-1 mono text-[10px] text-faint border border-border rounded px-1.5 py-0.5 bg-secondary pointer-events-none">
            Ctrl K
          </kbd>
          {showResults && results.length > 0 && (
            <div className="absolute top-12 left-0 w-full bg-popover border border-border rounded-xl shadow-md py-1.5 max-h-80 overflow-y-auto z-50 animate-fade-in">
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}-${i}`}
                  className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors flex items-center gap-3"
                  onClick={() => handleResultClick(r)}
                >
                  <span className="stamp w-[72px] justify-center shrink-0">{typeLabel[r.type] ?? r.type}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{r.label}</span>
                    <span className="block text-xs text-muted-foreground truncate">{r.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden md:inline-flex stamp">{today}</span>

        <div ref={profileMenuRef} className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 hover:bg-secondary p-1.5 pr-2 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-display text-[15px] flex items-center justify-center">
              {initials}
            </div>
            <span className="hidden md:inline-block text-sm font-medium">{user?.name}</span>
            <ChevronDown className="hidden md:block w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-md py-1.5 z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Link
                to="/profile"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors"
              >
                <User className="w-4 h-4 text-muted-foreground" />
                My Profile
              </Link>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-negative hover:bg-negative/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
