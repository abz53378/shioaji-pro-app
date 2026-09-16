// src/components/watchlist.tsx — server-backed editable watchlists.

import {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { neighborCode } from '../lib/list-move';
import type { ServerWatchlist } from '../lib/shioaji';
import type { ContractInfo, SecurityType } from '../lib/types/contract';
import type { WatchItem } from '../hooks/use-watchlist';
import type { WatchlistImportResult } from '../lib/watchlist-import';
import {
    WatchlistListPicker,
    type WatchlistSortMode,
} from './watchlist-list-picker';
import {
    sortWatchlistItems,
    WatchlistRows,
} from './watchlist-rows';
import { WatchlistSymbolInput } from './watchlist-symbol-input';

const SPARK_KEY = 'sj-pro-watchlist-spark';

const LazyWatchlistImportDialog = lazy(() =>
    import('./watchlist-import-dialog').then(({ WatchlistImportDialog }) => ({
        default: WatchlistImportDialog,
    })),
);

export function Watchlist({
    items,
    selectedCode,
    onSelect,
    onAdd,
    onRemove,
    onReorder,
    serverLists,
    activeListId,
    onSelectList,
    onCreateList,
    onRenameList,
    onDeleteList,
    onImport,
    loading,
}: {
    items: WatchItem[];
    selectedCode: string | null;
    onSelect: (contract: ContractInfo) => void;
    onAdd: (
        code: string,
        type?: SecurityType,
        resolved?: ContractInfo,
    ) => Promise<unknown>;
    onRemove: (code: string) => void;
    onReorder: (fromCode: string, toCode: string) => void;
    serverLists: ServerWatchlist[];
    activeListId: string;
    onSelectList: (id: string) => void;
    onCreateList: (name: string) => Promise<unknown>;
    onRenameList: (name: string) => Promise<boolean>;
    onDeleteList: () => Promise<unknown>;
    onImport: (text: string) => Promise<WatchlistImportResult>;
    loading: boolean;
}) {
    const [importOpen, setImportOpen] = useState(false);
    const [spark, setSpark] = useState(
        () => localStorage.getItem(SPARK_KEY) === '1',
    );
    const [sortMode, setSortMode] = useState<WatchlistSortMode>('custom');
    const [arrange, setArrange] = useState(false);
    const [sortTick, setSortTick] = useState(0);
    const dragCode = useRef<string | null>(null);
    const dropCodeRef = useRef<string | null>(null);
    const [dropCode, setDropCode] = useState<string | null>(null);

    useEffect(() => {
        if (sortMode === 'custom') return;
        const timer = setInterval(() => setSortTick((value) => value + 1), 10_000);
        return () => clearInterval(timer);
    }, [sortMode]);

    const viewItems = useMemo(
        () => sortWatchlistItems(items, sortMode),
        // The interval refreshes quote-derived order while sorting is active.
        [items, sortMode, sortTick],
    );

    const clearDragState = useCallback(() => {
        dragCode.current = null;
        dropCodeRef.current = null;
        setDropCode(null);
    }, []);

    useEffect(() => {
        setArrange(false);
        clearDragState();
    }, [activeListId, clearDragState]);

    const setDropTarget = useCallback((code: string) => {
        dropCodeRef.current = code;
        setDropCode(code);
    }, []);

    const handleDragStart = useCallback(
        (code: string) => {
            if (arrange) dragCode.current = code;
        },
        [arrange],
    );

    const handleDrop = useCallback(() => {
        const from = dragCode.current;
        const to = dropCodeRef.current;
        clearDragState();
        if (from && to && from !== to) onReorder(from, to);
    }, [clearDragState, onReorder]);

    const moveRow = useCallback(
        (code: string, direction: -1 | 1) => {
            const target = neighborCode(
                items.map((item) => item.contract.code),
                code,
                direction,
            );
            if (target) onReorder(code, target);
        },
        [items, onReorder],
    );

    const toggleArrange = useCallback(() => {
        if (!arrange) setSortMode('custom');
        clearDragState();
        setArrange((value) => !value);
    }, [arrange, clearDragState]);

    const cycleSort = useCallback(() => {
        setSortMode((mode) =>
            mode === 'custom' ? 'desc' : mode === 'desc' ? 'asc' : 'custom',
        );
    }, []);

    const toggleSpark = useCallback(() => {
        setSpark((value) => {
            localStorage.setItem(SPARK_KEY, value ? '0' : '1');
            return !value;
        });
    }, []);

    return (
        <>
            <WatchlistListPicker
                serverLists={serverLists}
                activeListId={activeListId}
                onSelectList={onSelectList}
                onCreateList={onCreateList}
                onRenameList={onRenameList}
                onDeleteList={onDeleteList}
                spark={spark}
                onToggleSpark={toggleSpark}
                sortMode={sortMode}
                arrange={arrange}
                onToggleArrange={toggleArrange}
                onCycleSort={cycleSort}
                onOpenImport={() => setImportOpen(true)}
            />
            <WatchlistRows
                items={viewItems}
                selectedCode={selectedCode}
                loading={loading}
                spark={spark}
                arrange={arrange}
                dropCode={dropCode}
                onMove={moveRow}
                onSelect={onSelect}
                onRemove={onRemove}
                onDragStart={handleDragStart}
                onDragOver={setDropTarget}
                onDrop={handleDrop}
                onDragEnd={clearDragState}
            />
            <WatchlistSymbolInput onAdd={onAdd} />
            {importOpen ? (
                <Suspense fallback={null}>
                    <LazyWatchlistImportDialog
                        onImport={onImport}
                        onClose={() => setImportOpen(false)}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
