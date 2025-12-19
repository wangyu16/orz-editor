import { useState, useEffect } from 'react';
import { ExplorerItem } from '@/lib/types';
import { createClient } from '@/lib/supabase'; // Correct import path

export function useFileUrl(file: ExplorerItem | null) {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setUrl(null);
            return;
        }

        // Guest mode - (Currently mocks, so no real URL for now, return null)
        // If we implemented Blob storage for guest, we'd use URL.createObjectURL(file.blob)
        if (typeof window !== 'undefined' && !document.cookie.includes('sb-')) { // Simple guest check or pass prop
            // For now, Guest mode files are mock. 
            // If file has a 'content' field in guestTree (not currently typed), we could handle text.
            // But for binaries, we don't have them in Guest mode yet.
            setLoading(false);
            return;
        }

        async function fetchUrl() {
            setLoading(true);
            setError(null);
            try {
                // We'll use the download API to get a presigned URL, 
                // but we might want a dedicated 'preview' param if we don't want 'Content-Disposition: attachment'
                // However, the current downloadFile implementation in useFileSystem uses <a> tag download.
                // We need a direct link.

                // Let's call a new endpoint or the existing one?
                // Actually, for R2, we need distinct signed URLs.
                // Let's Try: fetching a signed URL from Supabase Edge Function or Next route.

                if (!file) return;
                const response = await fetch(`/api/files/${file!.id}/preview`);
                if (!response.ok) throw new Error('Failed to get preview URL');

                const data = await response.json();
                setUrl(data.url);
            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchUrl();
    }, [file]);

    return { url, loading, error };
}
