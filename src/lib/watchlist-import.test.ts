import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContractInfo } from './types/contract';

vi.mock('./shioaji', () => ({
    addWatchlistContracts: vi.fn(),
    createWatchlist: vi.fn(),
    fetchWatchlists: vi.fn(),
    resolveContract: vi.fn(),
}));

import {
    addWatchlistContracts,
    createWatchlist,
    fetchWatchlists,
    resolveContract,
    type ServerWatchlist,
} from './shioaji';
import {
    importWatchlistManifest,
    parseWatchlistImport,
} from './watchlist-import';

const addContracts = vi.mocked(addWatchlistContracts);
const createList = vi.mocked(createWatchlist);
const fetchLists = vi.mocked(fetchWatchlists);
const resolve = vi.mocked(resolveContract);

const contract = (code: string, security_type = 'STK') =>
    ({
        code,
        security_type,
        exchange: security_type === 'STK' ? 'TSE' : 'TAIFEX',
        target_code: null,
        name: code,
        currency: 'TWD',
        reference: 0,
        limit_up: 0,
        limit_down: 0,
        day_trade: '',
        update_date: '',
        category: '',
        margin_trading_balance: 0,
        short_selling_balance: 0,
    }) as ContractInfo;

const list = (id: string, name: string, codes: string[]): ServerWatchlist => ({
    id,
    name,
    contracts: codes.map((code) => ({
        code,
        security_type: 'STK',
        exchange: 'TSE',
    })),
});

afterEach(() => {
    vi.resetAllMocks();
});

describe('watchlist import manifest', () => {
    it('parses and normalizes the v1 multi-list example', () => {
        expect(
            parseWatchlistImport(JSON.stringify({
                version: 1,
                watchlists: [{
                    name: ' 台股核心 ',
                    contracts: [
                        { code: ' 2330 ', security_type: 'STK' },
                        { code: 'txfr1', security_type: 'FUT' },
                    ],
                }],
            })),
        ).toEqual({
            version: 1,
            watchlists: [{
                name: '台股核心',
                contracts: [
                    { code: '2330', security_type: 'STK' },
                    { code: 'TXFR1', security_type: 'FUT' },
                ],
            }],
        });
    });

    it('rejects malformed or unsupported manifests before any API call', () => {
        const invalid = [
            '{',
            JSON.stringify({ version: 2, watchlists: [] }),
            JSON.stringify({ version: 1, watchlists: [{ name: 'A', contracts: [{ code: '2330', security_type: 'BAD' }] }] }),
            JSON.stringify({ version: 1, watchlists: [] }),
            JSON.stringify({ version: 1, watchlists: [{ name: 'A', contracts: [] }] }),
            JSON.stringify({ version: 1, watchlists: [
                { name: ' A ', contracts: [{ code: '2330', security_type: 'STK' }] },
                { name: 'A', contracts: [{ code: '2317', security_type: 'STK' }] },
            ] }),
        ];

        for (const input of invalid) {
            expect(() => parseWatchlistImport(input)).toThrow('JSON 格式錯誤');
        }
        expect(fetchLists).not.toHaveBeenCalled();
        expect(resolve).not.toHaveBeenCalled();
        expect(addContracts).not.toHaveBeenCalled();
        expect(createList).not.toHaveBeenCalled();
    });

    it('appends canonical nonduplicates, creates missing lists, and continues after failures', async () => {
        fetchLists.mockResolvedValue([
            list('core', '核心', ['2330', 'TXFF6']),
            list('broken', '壞掉', []),
        ]);
        resolve.mockImplementation(async (code) => {
            if (code === 'BAD') throw new Error('找不到商品');
            return contract(code === 'TXFR1' ? 'TXFF6' : code);
        });
        addContracts.mockImplementation(async (id) => {
            if (id === 'broken') throw new Error('500 寫入失敗');
            return list(id, id, []);
        });
        createList.mockResolvedValue(list('later', '後續', ['1101']));

        const result = await importWatchlistManifest(parseWatchlistImport(JSON.stringify({
            version: 1,
            watchlists: [
                { name: '核心', contracts: [
                    { code: '2330', security_type: 'STK' },
                    { code: 'txfr1', security_type: 'FUT' },
                    { code: '2317', security_type: 'STK' },
                    { code: 'bad', security_type: 'STK' },
                ] },
                { name: '壞掉', contracts: [{ code: '0050', security_type: 'STK' }] },
                { name: '後續', contracts: [{ code: '1101', security_type: 'STK' }] },
            ],
        })));

        expect(addContracts).toHaveBeenNthCalledWith(1, 'core', [contract('2317')]);
        expect(addContracts).toHaveBeenNthCalledWith(2, 'broken', [contract('0050')]);
        expect(createList).toHaveBeenCalledWith('後續', [contract('1101')]);
        expect(result).toMatchObject({
            createdLists: 1,
            updatedLists: 1,
            failedLists: 1,
            addedContracts: 2,
            duplicateContracts: 2,
            failedContracts: 2,
            changedListIds: ['core', 'later'],
        });
        expect(result.failures).toEqual([
            { listName: '核心', code: 'BAD', message: '找不到商品' },
            { listName: '壞掉', code: '0050', message: '500 寫入失敗' },
        ]);
    });

    it('fails safely for ambiguous names and avoids empty new lists', async () => {
        fetchLists.mockResolvedValue([
            list('one', '重複', []),
            list('two', '重複', []),
        ]);
        resolve.mockRejectedValue(new Error('找不到商品'));

        const result = await importWatchlistManifest(parseWatchlistImport(JSON.stringify({
            version: 1,
            watchlists: [
                { name: '重複', contracts: [{ code: '2330', security_type: 'STK' }] },
                { name: '空白新清單', contracts: [{ code: 'BAD', security_type: 'STK' }] },
            ],
        })));

        expect(addContracts).not.toHaveBeenCalled();
        expect(createList).not.toHaveBeenCalled();
        expect(result).toMatchObject({ failedLists: 2, failedContracts: 1 });
        expect(result.failures).toEqual([
            { listName: '重複', message: '伺服器已有多個同名清單，未匯入' },
            { listName: '空白新清單', code: 'BAD', message: '找不到商品' },
            { listName: '空白新清單', message: '沒有可匯入的有效商品' },
        ]);
    });
});
