import { useState, useEffect } from 'react';
import { ExplorerItem } from '@/lib/types';
import { useFileUrl } from './useFileUrl';

export function useFileContent(file: ExplorerItem | null) {
    const { url } = useFileUrl(file);
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!file || !url) {
            setContent('');
            return;
        }

        async function fetchContent() {
            setLoading(true);
            setError(null);
            try {
                // Use proxy endpoint to avoid CORS issues with R2
                const res = await fetch(`/api/files/${file!.id}/content`);
                if (!res.ok) throw new Error('Failed to fetch content');
                const text = await res.text();
                setContent(text);
            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchContent();
    }, [file]); // url dependency removed as we use ID now

    return { content, loading, error };
}
