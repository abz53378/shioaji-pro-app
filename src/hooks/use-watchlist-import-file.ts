// src/hooks/use-watchlist-import-file.ts — guarded browser JSON file reader.

import { useEffect, useRef, useState } from 'react';

export function useWatchlistImportFile() {
    const [file, setFile] = useState<File | null>(null);
    const [text, setText] = useState<string | null>(null);
    const [readError, setReadError] = useState<string | null>(null);
    const activeReader = useRef<FileReader | null>(null);

    useEffect(() => () => activeReader.current?.abort(), []);

    const selectFile = (nextFile: File | null) => {
        if (!nextFile) return;
        activeReader.current?.abort();
        setFile(nextFile);
        setText(null);
        setReadError(null);

        const reader = new FileReader();
        activeReader.current = reader;
        reader.onload = () => {
            if (activeReader.current !== reader) return;
            activeReader.current = null;
            setText(typeof reader.result === 'string' ? reader.result : null);
        };
        reader.onerror = () => {
            if (activeReader.current !== reader) return;
            activeReader.current = null;
            setText(null);
            setReadError('無法讀取 JSON 檔案');
        };
        reader.readAsText(nextFile);
    };

    return { file, text, readError, selectFile };
}
