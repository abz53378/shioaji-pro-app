// src/components/watchlist-symbol-input.tsx — product search and single-symbol add.

import { useEffect, useState } from 'react';
import {
    searchProducts,
    type ProductSuggestion,
} from '../lib/product-search';
import type { ContractInfo, SecurityType } from '../lib/types/contract';
import * as panel from './panel.css';
import * as styles from './watchlist.css';

export function WatchlistSymbolInput({
    onAdd,
}: {
    onAdd: (
        code: string,
        type?: SecurityType,
        resolved?: ContractInfo,
    ) => Promise<unknown>;
}) {
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);

    useEffect(() => {
        const query = input.trim();
        if (!query) {
            setSuggestions([]);
            return;
        }
        let active = true;
        const timer = setTimeout(() => {
            void searchProducts(query, 10)
                .then((results) => {
                    if (active) setSuggestions(results);
                })
                .catch(() => {
                    if (active) setSuggestions([]);
                });
        }, 150);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [input]);

    const submit = async () => {
        const code = input.trim().toUpperCase();
        if (!code || busy) return;
        setBusy(true);
        try {
            await onAdd(code);
            setInput('');
        } catch {
            // Keep the manual input so the user can correct it.
        } finally {
            setBusy(false);
        }
    };

    const selectSuggestion = async (suggestion: ProductSuggestion) => {
        setSuggestions([]);
        setInput('');
        setBusy(true);
        try {
            await onAdd(
                suggestion.code,
                suggestion.security_type,
                suggestion.contract,
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={styles.addRow}>
            {suggestions.length > 0 ? (
                <div className={styles.suggestBox}>
                    {suggestions.map((suggestion) => (
                        <button
                            key={suggestion.code}
                            className={styles.suggestRow}
                            onClick={() => void selectSuggestion(suggestion)}
                        >
                            <span className={styles.suggestCode}>{suggestion.code}</span>
                            <span className={styles.suggestName}>{suggestion.name}</span>
                            <span className={styles.suggestCat}>{suggestion.detail}</span>
                        </button>
                    ))}
                </div>
            ) : null}
            <input
                className={styles.addInput}
                placeholder='股票、期貨或指數（如 台積電期）'
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        setSuggestions([]);
                        void submit();
                    }
                    if (event.key === 'Escape') setSuggestions([]);
                }}
            />
            <button className={panel.btn} onClick={() => void submit()} disabled={busy}>
                {busy ? '…' : '+'}
            </button>
        </div>
    );
}
