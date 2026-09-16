// src/components/watchlist-list-picker.tsx — named-list controls.

import {
    ArrowDown,
    ArrowDownUp,
    ArrowUp,
    Check,
    FileUp,
    GripVertical,
    Pencil,
    Plus,
    TrendingUp,
    Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { ServerWatchlist } from '../lib/shioaji';
import * as panel from './panel.css';
import * as styles from './watchlist.css';

export type WatchlistSortMode = 'custom' | 'desc' | 'asc';

export function WatchlistListPicker({
    serverLists,
    activeListId,
    onSelectList,
    onCreateList,
    onRenameList,
    onDeleteList,
    spark,
    onToggleSpark,
    sortMode,
    arrange,
    onToggleArrange,
    onCycleSort,
    onOpenImport,
}: {
    serverLists: ServerWatchlist[];
    activeListId: string;
    onSelectList: (id: string) => void;
    onCreateList: (name: string) => Promise<unknown>;
    onRenameList: (name: string) => Promise<boolean>;
    onDeleteList: () => Promise<unknown>;
    spark: boolean;
    onToggleSpark: () => void;
    sortMode: WatchlistSortMode;
    arrange: boolean;
    onToggleArrange: () => void;
    onCycleSort: () => void;
    onOpenImport: () => void;
}) {
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const renameBusy = useRef(false);
    const renameEscaped = useRef(false);
    const activeList = serverLists.find((list) => list.id === activeListId);

    const startRename = () => {
        if (!activeList) return;
        renameEscaped.current = false;
        setRenameValue(activeList.name);
        setRenaming(true);
    };

    const commitRename = async () => {
        if (renameBusy.current) return;
        const name = renameValue.trim();
        if (!name || name === activeList?.name) {
            setRenaming(false);
            return;
        }
        renameBusy.current = true;
        try {
            if (await onRenameList(name)) setRenaming(false);
        } finally {
            renameBusy.current = false;
        }
    };

    const submitNewList = async () => {
        const name = newName.trim();
        if (!name) return;
        try {
            await onCreateList(name);
            setCreating(false);
            setNewName('');
        } catch {
            // notified upstream
        }
    };

    return (
        <div className={styles.listPicker}>
            {creating ? (
                <>
                    <input
                        autoFocus
                        className={styles.addInput}
                        placeholder='新清單名稱'
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') void submitNewList();
                            if (event.key === 'Escape') setCreating(false);
                        }}
                    />
                    <button className={panel.btn} onClick={() => void submitNewList()}>
                        建立
                    </button>
                </>
            ) : renaming ? (
                <input
                    autoFocus
                    className={styles.addInput}
                    placeholder='清單名稱'
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onFocus={(event) => event.currentTarget.select()}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') void commitRename();
                        if (event.key === 'Escape') {
                            renameEscaped.current = true;
                            setRenaming(false);
                        }
                    }}
                    onBlur={() => {
                        if (!renameEscaped.current) void commitRename();
                    }}
                />
            ) : (
                <>
                    <select
                        className={styles.listSelect}
                        value={activeListId}
                        onChange={(event) => {
                            setConfirmDelete(false);
                            onSelectList(event.target.value);
                        }}
                    >
                        {serverLists.map((list) => (
                            <option key={list.id} value={list.id}>
                                {list.name}（{list.contracts.length}）
                            </option>
                        ))}
                    </select>
                    <button className={styles.listBtn} title='重新命名清單' onClick={startRename}>
                        <Pencil size={12} />
                    </button>
                    <button
                        className={`${styles.listBtn} ${arrange ? styles.listBtnOn : ''}`}
                        disabled={!arrange && sortMode !== 'custom'}
                        title={arrange
                            ? '完成調整'
                            : sortMode !== 'custom'
                              ? '依漲跌幅排序中無法調整順序 — 先切回自訂順序'
                              : '調整順序（拖曳或上下移，存回伺服器）'}
                        onClick={onToggleArrange}
                    >
                        {arrange ? <Check size={12} /> : <GripVertical size={12} />}
                    </button>
                    <button
                        className={`${styles.listBtn} ${sortMode !== 'custom' ? styles.listBtnOn : ''}`}
                        disabled={arrange}
                        title={arrange
                            ? '調整順序中 — 先按完成'
                            : sortMode === 'custom'
                              ? '依漲跌幅排序'
                              : sortMode === 'desc'
                                ? '漲幅在前 — 點擊改跌幅在前'
                                : '跌幅在前 — 點擊回自訂順序'}
                        onClick={onCycleSort}
                    >
                        {sortMode === 'custom' ? (
                            <ArrowDownUp size={12} />
                        ) : sortMode === 'desc' ? (
                            <ArrowDown size={12} />
                        ) : (
                            <ArrowUp size={12} />
                        )}
                    </button>
                    <button
                        className={`${styles.listBtn} ${spark ? styles.listBtnOn : ''}`}
                        title={spark ? '關閉小線圖' : '顯示小線圖'}
                        onClick={onToggleSpark}
                    >
                        <TrendingUp size={12} />
                    </button>
                    <button className={styles.listBtn} title='建立新清單' onClick={() => setCreating(true)}>
                        <Plus size={12} />
                    </button>
                    <button
                        className={styles.listBtn}
                        title='批次匯入 JSON'
                        aria-label='批次匯入 JSON'
                        onClick={onOpenImport}
                    >
                        <FileUp size={12} />
                    </button>
                    <button
                        className={`${styles.listBtn} ${confirmDelete ? styles.listBtnDanger : ''}`}
                        title={confirmDelete ? '再按一次確認刪除整個清單' : '刪除目前清單'}
                        onClick={() => {
                            if (confirmDelete) {
                                setConfirmDelete(false);
                                void onDeleteList();
                                return;
                            }
                            setConfirmDelete(true);
                            setTimeout(() => setConfirmDelete(false), 2500);
                        }}
                    >
                        {confirmDelete ? '確認?' : <Trash2 size={12} />}
                    </button>
                </>
            )}
        </div>
    );
}
