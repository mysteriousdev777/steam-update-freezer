import { useEffect, useRef, useState, type FC } from 'react';
import { Command } from 'cmdk';
import { ChevronsUpDown, FolderOpen, Lock, Search, X } from 'lucide-react';

import { cn } from '../lib/cn';
import type { InstalledGame } from '../../shared/types';

type GameSelectProps = {
  games: InstalledGame[];
  selectedAppId: string;
  /** Title to show for a manual pick (not in the scan); the App ID is used if it's unknown. */
  manualName?: string;
  onSelect: (game: InstalledGame) => void;
  /** Manual pick for an install path the scan didn't find: opens a native picker for the .acf. */
  onBrowseAcf: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

// cmdk identifies items by their `value`; name + appId makes it unique and searchable by either.
const getGameValue = (game: InstalledGame) => `${game.name} ${game.appId}`;

// Sentinel highlight value: matches no `"<name> <appId>"` row, so cmdk highlights nothing (rather
// than defaulting to the first row) when the current pick isn't a listed game.
const NO_LISTED_SELECTION = '__no_listed_selection__';

// Text shown on the closed trigger, in priority order: picked game → a known title for a manual
// pick (.acf) → restored App ID (before the scan resolves it) → scanning → empty.
const getTriggerLabel = (
  selectedGame: InstalledGame | undefined,
  selectedAppId: string,
  manualName: string,
  isLoading: boolean,
): string => {
  if (selectedGame) return selectedGame.name;

  if (manualName) return manualName;

  if (selectedAppId) return `App ID: ${selectedAppId}`;

  if (isLoading) return 'Scanning games…';

  return 'Select a game…';
};

// Steam-style searchable game picker: a trigger that opens a filterable dropdown of installed
// games. Each row shows the name + App ID, with a lock icon for already-frozen games.
export const GameSelect: FC<GameSelectProps> = ({
  games,
  selectedAppId,
  manualName = '',
  onSelect,
  onBrowseAcf,
  disabled = false,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedGame = games.find(game => game.appId === selectedAppId);

  // Close on outside click.
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);

    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  // Focus the search field on open; clear the query on close (covers every close path:
  // pick, Escape, outside click, and the trigger toggle).
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const pick = (game: InstalledGame) => {
    onSelect(game);
    close();
  };

  const browseAcf = () => {
    onBrowseAcf();
    close();
  };

  const triggerLabel = getTriggerLabel(selectedGame, selectedAppId, manualName, isLoading);

  // Whether the trigger shows a real game title (vs. a placeholder / App ID) — drives text color.
  const hasTitle = Boolean(selectedGame) || Boolean(manualName);

  const hasNoGames = !isLoading && games.length === 0;

  // Manual-pick row, always visible regardless of search/empty state — not a Command.Item so
  // it's exempt from cmdk's filter.
  const browseAcfRow = (
    <button
      type="button"
      onClick={browseAcf}
      className="flex w-full cursor-pointer items-center gap-3 border-t border-steam-panel px-3 py-2 text-left text-steam-muted hover:text-steam-accent"
    >
      <FolderOpen className="size-4 shrink-0" />
      <span>Select manifest file manually…</span>
    </button>
  );

  return (
    <div className="relative flex flex-col gap-1" ref={containerRef}>
      <span className="text-sm text-steam-muted">Game</span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'flex items-center gap-2 rounded border border-transparent bg-steam-bar px-3 py-2 text-left outline-none',
          'focus:border-steam-accent',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        )}
      >
        {selectedGame?.isReadonly && (
          <span title="Updates blocked">
            <Lock className="size-4 shrink-0 text-steam-ok" />
          </span>
        )}
        <span className={cn('flex-1 truncate', hasTitle ? 'text-steam-text' : 'text-steam-muted')}>
          {triggerLabel}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-steam-muted" />
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded border border-steam-panel bg-steam-bg shadow-lg shadow-black/40">
          {hasNoGames ? (
            <div>
              <div className="px-3 py-6 text-center text-sm text-steam-muted">
                No games found. Install a game in Steam, or Rescan.
              </div>
              {browseAcfRow}
            </div>
          ) : (
            <Command
              // Highlight the current pick; the sentinel when it isn't a listed game (a manual
              // manifest, or nothing picked yet). Re-read on each open — Command remounts with the
              // dropdown.
              defaultValue={selectedGame ? getGameValue(selectedGame) : NO_LISTED_SELECTION}
              onKeyDown={event => {
                if (event.key === 'Escape') close();
              }}
              // appId values are unique; match on name + appId so search hits either.
              filter={(value, query) => (value.toLowerCase().includes(query.toLowerCase()) ? 1 : 0)}
            >
              <div className="flex items-center gap-2 border-b border-steam-panel px-3">
                <Search className="size-4 shrink-0 text-steam-muted" />
                <Command.Input
                  ref={inputRef}
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search games…"
                  className="flex-1 bg-transparent py-2 text-steam-text outline-none placeholder:text-steam-muted"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="shrink-0 cursor-pointer text-steam-muted hover:text-steam-text"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <div className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-steam-muted">
                Search results
              </div>

              <Command.List className="max-h-72 overflow-y-auto p-1">
                <Command.Empty className="px-3 py-6 text-center text-sm text-steam-muted">
                  No games found.
                </Command.Empty>

                {games.map(game => (
                  <Command.Item
                    key={game.appId}
                    value={getGameValue(game)}
                    onSelect={() => pick(game)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded px-2 py-2 outline-none',
                      'data-[selected=true]:bg-steam-panel',
                      game.appId === selectedAppId && 'text-steam-accent',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{game.name}</span>
                      <span className="text-xs text-steam-muted">App ID: {game.appId}</span>
                    </div>
                    {game.isReadonly && (
                      <span title="Updates blocked">
                        <Lock className="size-4 shrink-0 text-steam-ok" aria-label="Frozen" />
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.List>
              {browseAcfRow}
            </Command>
          )}
        </div>
      )}
    </div>
  );
};
