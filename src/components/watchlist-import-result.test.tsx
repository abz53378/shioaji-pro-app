import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
    WatchlistImportResultView,
} from './watchlist-import-result';
import type { WatchlistImportResult } from '../lib/watchlist-import';

describe('WatchlistImportResultView', () => {
    it('renders a bounded failure list and reports hidden details', () => {
        const result: WatchlistImportResult = {
            createdLists: 0,
            updatedLists: 0,
            unchangedLists: 0,
            failedLists: 0,
            addedContracts: 0,
            duplicateContracts: 0,
            failedContracts: 101,
            changedListIds: [],
            failures: Array.from({ length: 101 }, (_, index) => ({
                listName: '測試清單',
                code: `C${index}`,
                message: '無法解析',
            })),
        };

        const html = renderToStaticMarkup(
            createElement(WatchlistImportResultView, { result }),
        );

        expect(html).toContain('C99');
        expect(html).not.toContain('C100');
        expect(html).toContain('另有 1 筆失敗明細未顯示');
    });
});
