// src/components/watchlist-import-dialog.tsx — append-only JSON watchlist import.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWatchlistImportFile } from '../hooks/use-watchlist-import-file';
import { useEscClose } from '../hooks/use-esc-close';
import type { WatchlistImportResult } from '../lib/watchlist-import';
import { WatchlistImportResultView } from './watchlist-import-result';
import * as styles from './watchlist-import-dialog.css';

const EXAMPLE = `{
  "version": 1,
  "watchlists": [
    {
      "name": "台股核心",
      "contracts": [
        { "code": "2330", "security_type": "STK" },
        { "code": "TXFR1", "security_type": "FUT" }
      ]
    }
  ]
}`;

export function WatchlistImportDialog({
    onImport,
    onClose,
}: {
    onImport: (text: string) => Promise<WatchlistImportResult>;
    onClose: () => void;
}) {
    const { file, text, readError, selectFile } = useWatchlistImportFile();
    const [busy, setBusy] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [result, setResult] = useState<WatchlistImportResult | null>(null);
    const error = importError ?? readError;

    useEscClose(() => {
        if (!busy) onClose();
    });

    const startImport = () => {
        if (busy || text === null) return;
        setBusy(true);
        setImportError(null);
        void onImport(text)
            .then(setResult)
            .catch((reason: unknown) =>
                setImportError(
                    reason instanceof Error ? reason.message : String(reason),
                ),
            )
            .finally(() => setBusy(false));
    };

    return createPortal(
        <div
            className={styles.overlay}
            onMouseDown={(event) => {
                if (!busy && event.target === event.currentTarget) onClose();
            }}
        >
            <div
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="watchlist-import-title"
            >
                <div className={styles.header}>
                    <div>
                        <div id="watchlist-import-title">批次匯入自選清單</div>
                        <div className={styles.subtitle}>
                            只會新增商品，不會刪除或調整既有順序
                        </div>
                    </div>
                </div>
                <div className={styles.body}>
                    <div className={styles.exampleLabel}>v1 JSON 格式</div>
                    <pre className={styles.example}>{EXAMPLE}</pre>
                    <label className={styles.fileRow}>
                        <span>{file?.name ?? '選擇 JSON 檔案'}</span>
                        <input
                            type="file"
                            accept=".json,application/json"
                            disabled={busy}
                            onChange={(event) => {
                                const nextFile = event.target.files?.[0] ?? null;
                                if (!nextFile) return;
                                selectFile(nextFile);
                                setImportError(null);
                                setResult(null);
                            }}
                        />
                    </label>
                    {error ? <div className={styles.error}>{error}</div> : null}
                    {result ? <WatchlistImportResultView result={result} /> : null}
                </div>
                <div className={styles.footer}>
                    <button
                        className={styles.cancelBtn}
                        disabled={busy}
                        onClick={onClose}
                    >
                        {result ? '關閉' : '取消'}
                    </button>
                    {result ? null : (
                        <button
                            className={styles.importBtn}
                            disabled={busy || text === null}
                            onClick={startImport}
                        >
                            {busy ? '匯入中…' : '開始匯入'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
