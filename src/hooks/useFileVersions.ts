import { useState, useEffect, useCallback } from 'react';
import { ExplorerItem, FileVersion } from '@/lib/types';
import { createClient } from '@/lib/supabase';

export function useFileVersions(file: ExplorerItem | null, isGuest: boolean = false) {
    const [versions, setVersions] = useState<FileVersion[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchVersions = useCallback(async () => {
        if (!file || file.kind !== 'file') {
            setVersions([]);
            return;
        }

        if (isGuest) {
            // Guest Mode: Read from in-memory file object
            const guestFile = file as any;
            setVersions(guestFile.versions || []);
            return;
        }

        setLoading(true);
        try {
            // Using direct fetch to our API route
            const res = await fetch(`/api/files/${file.id}/versions`);
            if (!res.ok) {
                const errBody = await res.text();
                console.error("Fetch versions failed:", res.status, errBody);
                throw new Error("Failed to fetch versions");
            }
            const data = await res.json();
            setVersions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [file, isGuest]);

    useEffect(() => {
        fetchVersions();
    }, [fetchVersions]);

    const createVersion = async (content: string) => {
        if (!file || file.kind !== 'file') return;

        if (isGuest) {
            // Guest Mode: Update in-memory
            const newVersion: FileVersion = {
                id: crypto.randomUUID(),
                file_id: file.id,
                content,
                created_at: new Date().toISOString(),
                is_auto_save: false
            };
            const guestFile = file as any;
            if (!guestFile.versions) guestFile.versions = [];

            // Add new, sort desc, limit 20
            const updated = [newVersion, ...guestFile.versions].slice(0, 20);
            guestFile.versions = updated;
            setVersions(updated);
            return;
        }

        try {
            const res = await fetch(`/api/files/${file.id}/versions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            if (res.ok) {
                const newV = await res.json();
                // Optimistic update
                setVersions(prev => [newV, ...prev].slice(0, 20));
            }
        } catch (err) {
            console.error("Failed to create version:", err);
        }
    };

    return { versions, loading, createVersion, fetchVersions };
}
