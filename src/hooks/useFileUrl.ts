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
        // Guest mode check (Better logic: check if file ID is not a UUID or check supabase session)
        // Since we don't have easy synchronous access to session here, let's rely on valid "remote" IDs being UUIDs, 
        // OR better: handle the 401 gracefully. 
        // Actually, the issue is that in guest mode, we don't have a session so the API call fails immediately.
        // We can just skip fetching if cookie 'sb-access-token' is missing, roughly.
        // Or better: Just catch the error and do nothing.

        // Guest Check:
        const isGuest = typeof window !== 'undefined' && !document.cookie.includes('sb-');
        if (isGuest) {
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

                if (response.status === 401) {
                    // Stale session or guest with cookie -> fail silently
                    setUrl(null);
                    return;
                }

                if (!response.ok) throw new Error('Failed to get preview URL');

                const data = await response.json();
                setUrl(data.url);
            } catch (err: any) {
                // Silently ignore 401s if they slip through, log others
                if (err.message !== 'Failed to get preview URL') {
                    console.error(err);
                }
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchUrl();
    }, [file]);

    return { url, loading, error };
}
