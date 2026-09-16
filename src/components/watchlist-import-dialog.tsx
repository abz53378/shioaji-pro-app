// src/components/watchlist-import-dialog.tsx — append-only JSON watchlist import.

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEscClose } from '../hooks/use-esc-close';
import type { WatchlistImportResult } from '../lib/watchlist-import';
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
    const [file, setFile] = useState<File | null>(null);
    const [text, setText] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<WatchlistImportResult | null>(null);
    const activeReader = useRef<FileReader | null>(null);
    useEscClose(() => {
        if (!busy) onClose();
    });

    const failed = (result?.failedContracts ?? 0) + (result?.failedLists ?? 0);
    const success = result !== null && failed === 0 && !result.refreshWarning;

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
                                activeReader.current?.abort();
                                setFile(nextFile);
                                setText(null);
                                setError(null);
                                setResult(null);
                                const reader = new FileReader();
                                activeReader.current = reader;
                                reader.onload = () => {
                                    if (activeReader.current !== reader) return;
                                    activeReader.current = null;
                                    setText(
                                        typeof reader.result === 'string'
                                            ? reader.result
                                            : null,
                                    );
                                };
                                reader.onerror = () => {
                                    if (activeReader.current !== reader) return;
                                    activeReader.current = null;
                                    setText(null);
                                    setError('無法讀取 JSON 檔案');
                                };
                                reader.readAsText(nextFile);
                            }}
                        />
                    </label>
                    {error && <div className={styles.error}>{error}</div>}
                    {result && (
                        <div className={success ? styles.summaryOk : styles.summaryWarn}>
                            <div>
                                建立 {result.createdLists} 個清單、更新 {result.updatedLists} 個清單、新增 {result.addedContracts} 檔、略過 {result.duplicateContracts} 個重複、失敗 {result.failedContracts} 檔
                            </div>
                            {result.failedLists > 0 && (
                                <div>另有 {result.failedLists} 個清單未完成匯入</div>
                            )}
                            {result.refreshWarning && (
                                <div className={styles.refreshWarning}>
                                    {result.refreshWarning}
                                </div>
                            )}
                            {result.failures.length > 0 && (
                                <ul className={styles.failures}>
                                    {result.failures.map((failure, index) => (
                                        <li key={`${failure.listName}-${failure.code ?? 'list'}-${index}`}>
                                            <strong>{failure.listName}</strong>
                                            {failure.code ? ` · ${failure.code}` : ''}
                                            <span>{failure.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
                <div className={styles.footer}>
                    <button
                        className={styles.cancelBtn}
                        disabled={busy}
                        onClick={onClose}
                    >
                        {result ? '關閉' : '取消'}
                    </button>
                    {!result && (
                        <button
                            className={styles.importBtn}
                            disabled={busy || text === null}
                            onClick={() => {
                                if (busy || text === null) return;
                                setBusy(true);
                                setError(null);
                                void onImport(text)
                                    .then(setResult)
                                    .catch((reason: unknown) =>
                                        setError(
                                            reason instanceof Error
                                                ? reason.message
                                                : String(reason),
                                        ),
                                    )
                                    .finally(() => setBusy(false));
                            }}
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
