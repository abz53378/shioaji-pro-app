// src/components/watchlist-import-result.tsx — bounded import outcome details.

import type { WatchlistImportResult } from '../lib/watchlist-import';
import * as styles from './watchlist-import-dialog.css';

const MAX_VISIBLE_FAILURES = 100;

export function WatchlistImportResultView({
    result,
}: {
    result: WatchlistImportResult;
}) {
    const failed = result.failedContracts + result.failedLists;
    const success = failed === 0 && !result.refreshWarning;
    const visibleFailures = result.failures.slice(0, MAX_VISIBLE_FAILURES);
    const hiddenFailures = result.failures.length - visibleFailures.length;

    return (
        <div className={success ? styles.summaryOk : styles.summaryWarn}>
            <div>
                建立 {result.createdLists} 個清單、更新 {result.updatedLists} 個清單、新增 {result.addedContracts} 檔、略過 {result.duplicateContracts} 個重複、失敗 {result.failedContracts} 檔
            </div>
            {result.failedLists > 0 ? (
                <div>另有 {result.failedLists} 個清單未完成匯入</div>
            ) : null}
            {result.refreshWarning ? (
                <div className={styles.refreshWarning}>
                    {result.refreshWarning}
                </div>
            ) : null}
            {visibleFailures.length > 0 ? (
                <ul className={styles.failures}>
                    {visibleFailures.map((failure, index) => (
                        <li key={`${failure.listName}-${failure.code ?? 'list'}-${index}`}>
                            <strong>{failure.listName}</strong>
                            {failure.code ? ` · ${failure.code}` : ''}
                            <span>{failure.message}</span>
                        </li>
                    ))}
                </ul>
            ) : null}
            {hiddenFailures > 0 ? (
                <div className={styles.moreFailures}>
                    另有 {hiddenFailures} 筆失敗明細未顯示
                </div>
            ) : null}
        </div>
    );
}
