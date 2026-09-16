// src/lib/watchlist-import.ts — versioned, append-only watchlist imports.

import {
    addWatchlistContracts,
    createWatchlist,
    fetchWatchlists,
    resolveContract,
    type ServerWatchlist,
} from './shioaji';
import type { ContractInfo, SecurityType } from './types/contract';

type ImportSecurityType = Exclude<SecurityType, null>;

export interface WatchlistImportManifest {
    version: 1;
    watchlists: {
        name: string;
        contracts: {
            code: string;
            security_type: ImportSecurityType;
        }[];
    }[];
}

export interface WatchlistImportFailure {
    listName: string;
    code?: string;
    message: string;
}

export interface WatchlistImportResult {
    createdLists: number;
    updatedLists: number;
    unchangedLists: number;
    failedLists: number;
    addedContracts: number;
    duplicateContracts: number;
    failedContracts: number;
    failures: WatchlistImportFailure[];
    changedListIds: string[];
    refreshWarning?: string;
}

const SECURITY_TYPES = new Set<ImportSecurityType>([
    'IND',
    'STK',
    'FUT',
    'OPT',
    'WRT',
]);
const COMBO_ERROR = '組合商品暫不支援加入自選，請使用「組合商品」面板';

function schemaError(path: string, reason: string): never {
    throw new Error(`JSON 格式錯誤：${path} ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseName(value: unknown, path: string): string {
    if (typeof value !== 'string') schemaError(path, '必須為非空字串');
    const name = value.trim();
    if (!name) schemaError(path, '不得為空白');
    return name;
}

function parseContract(value: unknown, path: string) {
    if (!isRecord(value)) schemaError(path, '必須為物件');
    if (typeof value.code !== 'string') {
        schemaError(`${path}.code`, '必須為非空字串');
    }
    const code = value.code.trim().toUpperCase();
    if (!code) schemaError(`${path}.code`, '不得為空白');
    if (typeof value.security_type !== 'string') {
        schemaError(`${path}.security_type`, '必須為 IND、STK、FUT、OPT 或 WRT 之一');
    }
    if (!SECURITY_TYPES.has(value.security_type as ImportSecurityType)) {
        schemaError(`${path}.security_type`, '必須為 IND、STK、FUT、OPT 或 WRT 之一');
    }
    return {
        code,
        security_type: value.security_type as ImportSecurityType,
    };
}

export function parseWatchlistImport(text: string): WatchlistImportManifest {
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        throw new Error('JSON 格式錯誤：無法解析 JSON');
    }
    if (!isRecord(raw)) schemaError('根節點', '必須為物件');
    if (raw.version !== 1) schemaError('version', '必須為 1');
    if (!Array.isArray(raw.watchlists) || raw.watchlists.length === 0) {
        schemaError('watchlists', '必須為非空陣列');
    }

    const names = new Set<string>();
    const watchlists = raw.watchlists.map((value, index) => {
        const path = `watchlists[${index}]`;
        if (!isRecord(value)) schemaError(path, '必須為物件');
        const name = parseName(value.name, `${path}.name`);
        if (names.has(name)) schemaError(`${path}.name`, '清單名稱重複');
        names.add(name);
        if (!Array.isArray(value.contracts) || value.contracts.length === 0) {
            schemaError(`${path}.contracts`, '必須為非空陣列');
        }
        return {
            name,
            contracts: value.contracts.map((contract, contractIndex) =>
                parseContract(contract, `${path}.contracts[${contractIndex}]`),
            ),
        };
    });

    return { version: 1, watchlists };
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function resolveManifestContracts(manifest: WatchlistImportManifest) {
    const requests = new Map<string, {
        code: string;
        securityType: ImportSecurityType;
    }>();
    for (const list of manifest.watchlists) {
        for (const contract of list.contracts) {
            const key = `${contract.security_type}\u0000${contract.code}`;
            if (!requests.has(key)) {
                requests.set(key, {
                    code: contract.code,
                    securityType: contract.security_type,
                });
            }
        }
    }

    const queue = [...requests.entries()];
    const resolutions = new Map<string, PromiseSettledResult<ContractInfo>>();
    let next = 0;
    const worker = async () => {
        while (next < queue.length) {
            const [key, request] = queue[next++]!;
            try {
                resolutions.set(
                    key,
                    { status: 'fulfilled', value: await resolveContract(request.code, request.securityType) },
                );
            } catch (reason) {
                resolutions.set(key, { status: 'rejected', reason });
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
    return resolutions;
}

function blankResult(): WatchlistImportResult {
    return {
        createdLists: 0,
        updatedLists: 0,
        unchangedLists: 0,
        failedLists: 0,
        addedContracts: 0,
        duplicateContracts: 0,
        failedContracts: 0,
        failures: [],
        changedListIds: [],
    };
}


export async function importWatchlistManifest(
    manifest: WatchlistImportManifest,
): Promise<WatchlistImportResult> {
    const [lists, resolutions] = await Promise.all([
        fetchWatchlists(),
        resolveManifestContracts(manifest),
    ]);
    const result = blankResult();

    for (const importList of manifest.watchlists) {
        const matches = lists.filter(
            (list) => list.name === importList.name,
        );
        if (matches.length > 1) {
            result.failedLists++;
            result.failures.push({
                listName: importList.name,
                message: '伺服器已有多個同名清單，未匯入',
            });
            continue;
        }

        const existing = matches[0];
        const seenCodes = new Set(existing?.contracts.map((contract) => contract.code) ?? []);
        const additions: ContractInfo[] = [];
        for (const requested of importList.contracts) {
            const key = `${requested.security_type}\u0000${requested.code}`;
            const resolution = resolutions.get(key)!;
            if (resolution.status === 'rejected') {
                result.failedContracts++;
                result.failures.push({
                    listName: importList.name,
                    code: requested.code,
                    message: errorMessage(resolution.reason),
                });
                continue;
            }
            const contract = resolution.value;
            if (contract.combo) {
                result.failedContracts++;
                result.failures.push({
                    listName: importList.name,
                    code: requested.code,
                    message: COMBO_ERROR,
                });
                continue;
            }
            if (seenCodes.has(contract.code)) {
                result.duplicateContracts++;
                continue;
            }
            seenCodes.add(contract.code);
            additions.push(contract);
        }

        if (existing) {
            if (additions.length === 0) {
                result.unchangedLists++;
                continue;
            }
            try {
                await addWatchlistContracts(existing.id, additions);
                result.updatedLists++;
                result.addedContracts += additions.length;
                result.changedListIds.push(existing.id);
            } catch (error) {
                result.failedLists++;
                result.failedContracts += additions.length;
                for (const contract of additions) {
                    result.failures.push({
                        listName: importList.name,
                        code: contract.code,
                        message: errorMessage(error),
                    });
                }
            }
            continue;
        }

        if (additions.length === 0) {
            result.failedLists++;
            result.failures.push({
                listName: importList.name,
                message: '沒有可匯入的有效商品',
            });
            continue;
        }
        try {
            const created = await createWatchlist(importList.name, additions);
            result.createdLists++;
            result.addedContracts += additions.length;
            result.changedListIds.push(created.id);
        } catch (error) {
            result.failedLists++;
            result.failedContracts += additions.length;
            for (const contract of additions) {
                result.failures.push({
                    listName: importList.name,
                    code: contract.code,
                    message: errorMessage(error),
                });
            }
        }
    }

    return result;
}
