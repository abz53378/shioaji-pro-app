// src/components/watchlist-rows.tsx — rendered watchlist rows and row-local quotes.

import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import { memo } from 'react';
import { useQuote } from '../hooks/use-stream';
import type { WatchItem } from '../hooks/use-watchlist';
import * as panel from './panel.css';
import { Sparkline } from './sparkline';
import { getQuote } from '../lib/stream';
import type { ContractInfo } from '../lib/types/contract';
import { fmtPct, fmtPrice, fmtSigned } from '../lib/utils/format';
import * as styles from './watchlist.css';

function pctOf(item: WatchItem): number {
    const quote = getQuote(item.contract.code);
    const reference = quote?.index
        ? Number(quote.index.reference)
        : item.contract.reference;
    const close = quote?.tick
        ? Number(quote.tick.close)
        : quote?.index
          ? Number(quote.index.close)
          : item.snapshot?.close;
    if (close !== undefined && reference) {
        return ((close - reference) / reference) * 100;
    }
    return item.snapshot?.change_rate ?? 0;
}

export function sortWatchlistItems(
    items: WatchItem[],
    sortMode: 'custom' | 'desc' | 'asc',
): WatchItem[] {
    if (sortMode === 'custom') return items;
    const sorted = [...items].sort((left, right) => pctOf(right) - pctOf(left));
    return sortMode === 'asc' ? sorted.reverse() : sorted;
}

const WatchRow = memo(function WatchRow({
    item,
    selected,
    dropTarget,
    spark,
    arrange,
    canUp,
    canDown,
    onMove,
    onSelect,
    onRemove,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}: {
    item: WatchItem;
    selected: boolean;
    dropTarget: boolean;
    spark: boolean;
    arrange: boolean;
    canUp: boolean;
    canDown: boolean;
    onMove: (code: string, direction: -1 | 1) => void;
    onSelect: (contract: ContractInfo) => void;
    onRemove: (code: string) => void;
    onDragStart: (code: string) => void;
    onDragOver: (code: string) => void;
    onDrop: () => void;
    onDragEnd: () => void;
}) {
    const quote = useQuote(item.contract.code);
    const tick = quote?.tick;
    const index = quote?.index;
    const close = tick
        ? Number(tick.close)
        : index
          ? Number(index.close)
          : item.snapshot?.close;
    const reference = index ? Number(index.reference) : item.contract.reference;
    const change = tick?.price_chg
        ? Number(tick.price_chg)
        : index
          ? Number(index.close) - Number(index.reference)
          : close !== undefined && reference
            ? close - reference
            : undefined;
    const percent = change !== undefined && reference
        ? (change / reference) * 100
        : item.snapshot?.change_rate;
    const direction = change === undefined || change === 0 ? 'flat' : change > 0 ? 'up' : 'down';
    const flashDirection = !quote?.flashSeq
        ? null
        : quote.lastDir === -1
          ? ('down' as const)
          : ('up' as const);

    return (
        <div
            className={`${styles.row[selected ? 'selected' : 'normal']} ${spark ? styles.rowSparkCols : ''} ${dropTarget ? styles.dropTarget : ''} ${arrange ? styles.rowArrange : ''}`}
            draggable={arrange}
            onClick={() => {
                if (!arrange) onSelect(item.contract);
            }}
            onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                onDragStart(item.contract.code);
            }}
            onDragOver={(event) => {
                if (!arrange) return;
                event.preventDefault();
                onDragOver(item.contract.code);
            }}
            onDrop={(event) => {
                if (!arrange) return;
                event.preventDefault();
                onDrop();
            }}
            onDragEnd={onDragEnd}
        >
            {flashDirection ? (
                <span
                    key={quote?.flashSeq}
                    className={styles.flashOverlay[flashDirection]}
                />
            ) : null}
            {arrange ? (
                <span className={styles.gripHandle}>
                    <GripVertical size={12} />
                </span>
            ) : null}
            <span className={styles.code}>{item.contract.code}</span>
            {spark ? (
                <span className={styles.sparkCell}>
                    <Sparkline
                        contract={item.contract}
                        last={close}
                        reference={reference || undefined}
                        height={26}
                        stretch
                    />
                </span>
            ) : null}
            <span className={`${styles.price} ${panel.dirText[direction]}`}>
                {tick?.simtrade ? <span className={styles.simBadge}>試搓</span> : null}
                {fmtPrice(close)}
            </span>
            <span className={styles.name}>{item.contract.name}</span>
            <span className={`${styles.change} ${panel.dirText[direction]}`}>
                {fmtSigned(change)} {fmtPct(percent)}
            </span>
            {arrange ? (
                <span className={styles.moveCol}>
                    <button
                        className={styles.moveBtn}
                        title='上移'
                        disabled={!canUp}
                        onClick={(event) => {
                            event.stopPropagation();
                            onMove(item.contract.code, -1);
                        }}
                    >
                        <ChevronUp size={11} />
                    </button>
                    <button
                        className={styles.moveBtn}
                        title='下移'
                        disabled={!canDown}
                        onClick={(event) => {
                            event.stopPropagation();
                            onMove(item.contract.code, 1);
                        }}
                    >
                        <ChevronDown size={11} />
                    </button>
                </span>
            ) : (
                <button
                    className={styles.rowRemove}
                    title='從清單移除'
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove(item.contract.code);
                    }}
                >
                    <X size={10} />
                </button>
            )}
        </div>
    );
});

export function WatchlistRows({
    items,
    selectedCode,
    loading,
    spark,
    arrange,
    dropCode,
    onMove,
    onSelect,
    onRemove,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}: {
    items: WatchItem[];
    selectedCode: string | null;
    loading: boolean;
    spark: boolean;
    arrange: boolean;
    dropCode: string | null;
    onMove: (code: string, direction: -1 | 1) => void;
    onSelect: (contract: ContractInfo) => void;
    onRemove: (code: string) => void;
    onDragStart: (code: string) => void;
    onDragOver: (code: string) => void;
    onDrop: () => void;
    onDragEnd: () => void;
}) {
    return (
        <div className={panel.panelBody}>
            <div className={styles.list}>
                {loading && items.length === 0 ? (
                    <div className={styles.loadingHint}>載入清單…</div>
                ) : null}
                {!loading && items.length === 0 ? (
                    <div className={styles.loadingHint}>
                        清單是空的 — 在下方輸入代碼加入
                    </div>
                ) : null}
                {items.map((item, index) => (
                    <WatchRow
                        key={item.contract.code}
                        item={item}
                        selected={item.contract.code === selectedCode}
                        spark={spark}
                        arrange={arrange}
                        canUp={index > 0}
                        canDown={index < items.length - 1}
                        onMove={onMove}
                        dropTarget={arrange && item.contract.code === dropCode}
                        onSelect={onSelect}
                        onRemove={onRemove}
                        onDragStart={onDragStart}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        onDragEnd={onDragEnd}
                    />
                ))}
            </div>
        </div>
    );
}
