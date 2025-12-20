
import { createClient } from '@/lib/supabase';
import { ThemeComposition } from './markdown-api';

const SETTINGS_ROOT = '.settings';
const MARKDOWN_FOLDER = 'markdown'; // inside .settings
const DEFAULT_SETTINGS_FILE = 'default.json';

export interface MarkdownSettings {
    name: string;
    theme: ThemeComposition;
}

// Helper to ensure a folder path exists
async function ensureFolder(supabase: any, name: string, parentId: string | null): Promise<string> {
    // Check if exists
    let query = supabase
        .from('folders')
        .select('id')
        .eq('name', name)
        .eq('is_deleted', false);

    if (parentId) {
        query = query.eq('parent_id', parentId);
    } else {
        query = query.is('parent_id', null);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
        return data[0].id;
    }

    // Create if not exists
    const { data: newFolder, error: createError } = await supabase
        .from('folders')
        .insert({
            name,
            parent_id: parentId,
            user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select('id')
        .single();

    if (createError) throw createError;
    return newFolder.id;
}

export const SettingsAPI = {
    async ensureSettingsFolder(): Promise<string> {
        const supabase = createClient();
        const rootId = await ensureFolder(supabase, SETTINGS_ROOT, null);
        const markdownId = await ensureFolder(supabase, MARKDOWN_FOLDER, rootId);
        return markdownId;
    },

    async saveSettings(name: string, settings: MarkdownSettings): Promise<void> {
        const supabase = createClient();
        const folderId = await this.ensureSettingsFolder();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.warn("SettingsAPI: Guest user, skipping save.");
            return;
        }

        const fileName = name.endsWith('.json') ? name : `${name}.json`;
        const content = JSON.stringify(settings, null, 2);

        // Check if file exists to get ID for update, or create new
        const { data: existing } = await supabase
            .from('files')
            .select('*')
            .eq('folder_id', folderId)
            .eq('name', fileName)
            .eq('is_deleted', false)
            .single();

        let fileId = existing?.id;

        let uuid_r2 = existing?.uuid_r2;

        if (!existing) {
            // 1. Create R2 placeholder (upload happens via API usually, but here we can just post to our content API or direct save)
            // Actually, simplest is to use the existing POST /api/files/create which handles metadata and then upload content?
            // Or better: Use the generic file upload flow? 
            // Since settings are small text, we can use a simpler flow:
            // 1. Create file record
            // 2. Upload to R2. 
            // To avoid duplicating logic, let's use the browser-side helper `saveFile` if possible?
            // But `saveFile` expects a file ID.

            // Let's manually create the record and then use the API to save content.
            const { v4: uuidv4 } = require('uuid'); // We might not have uuid on client?
            // Actually, let's just use the /api/files/create endpoint logic but simpler:
            // We can't easily upload to R2 from client without signed URL. 

            // Simplest approach for text files on client: 
            // 1. Create file metadata if needed.
            // 2. Use `POST /api/files/[id]/content` to save the string content. 

            // Let's create the file metadata first
            const { data: newFile, error: createError } = await supabase
                .from('files')
                .insert({
                    name: fileName,
                    folder_id: folderId,
                    user_id: user.id,
                    type: 'application/json',
                    size: content.length,
                    uuid_r2: crypto.randomUUID() // Browser native UUID
                })
                .select('*')
                .single();

            if (createError) throw createError;
            fileId = newFile.id;
        }

        // Save content using our API
        const res = await fetch(`/api/files/${fileId}/content`, {
            method: 'POST',
            body: content
        });

        if (!res.ok) throw new Error('Failed to save settings content');
    },

    async loadSettings(name: string = 'default'): Promise<MarkdownSettings | null> {
        const supabase = createClient();

        // Quick check for auth to avoid 401s
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const folderId = await this.ensureSettingsFolder();

        const fileName = name.endsWith('.json') ? name : `${name}.json`;

        const { data: file } = await supabase
            .from('files')
            .select('id')
            .eq('folder_id', folderId)
            .eq('name', fileName)
            .eq('is_deleted', false)
            .single();

        if (!file) return null;

        try {
            const res = await fetch(`/api/files/${file.id}/content`);
            if (res.status === 401 || !res.ok) return null;
            return await res.json() as MarkdownSettings;
        } catch {
            return null;
        }
    },

    async listSettings(): Promise<string[]> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        const folderId = await this.ensureSettingsFolder();
        const { data: files } = await supabase
            .from('files')
            .select('name')
            .eq('folder_id', folderId)
            .eq('is_deleted', false);

        return files ? files.map(f => f.name.replace('.json', '')) : [];
    },

    async getAssociation(fileId: string): Promise<string | null> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const rootId = await ensureFolder(supabase, SETTINGS_ROOT, null);

        // Find associations.json
        const { data: file } = await supabase
            .from('files')
            .select('*')
            .eq('folder_id', rootId)
            .eq('name', 'associations.json')
            .eq('is_deleted', false)
            .single();

        if (!file) return null;

        try {
            const res = await fetch(`/api/files/${file.id}/content`);
            if (!res.ok) return null;
            const associations = await res.json();
            return associations[fileId] || null;
        } catch {
            return null;
        }
    },

    async saveAssociation(fileId: string, presetName: string): Promise<void> {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const rootId = await ensureFolder(supabase, SETTINGS_ROOT, null);

        // Fetch existing
        const { data: file } = await supabase
            .from('files')
            .select('*')
            .eq('folder_id', rootId)
            .eq('name', 'associations.json')
            .eq('is_deleted', false)
            .single();

        let associations: Record<string, string> = {};

        if (file) {
            try {
                const res = await fetch(`/api/files/${file.id}/content`);
                if (res.ok) associations = await res.json();
            } catch (e) {/* ignore */ }
        }

        associations[fileId] = presetName;
        const content = JSON.stringify(associations, null, 2);

        if (file) {
            await fetch(`/api/files/${file.id}/content`, {
                method: 'POST',
                body: content
            });
        } else {
            // Create new
            const { data: newFile, error } = await supabase
                .from('files')
                .insert({
                    name: 'associations.json',
                    folder_id: rootId,
                    user_id: user.id,
                    type: 'application/json',
                    size: content.length,
                    uuid_r2: crypto.randomUUID()
                })
                .select()
                .single();

            if (error || !newFile) throw error;

            await fetch(`/api/files/${newFile.id}/content`, {
                method: 'POST',
                body: content
            });
        }
    }
};
