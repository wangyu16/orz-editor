
import { createClient } from '@/lib/supabase';
import { ORZ_THEMES } from './markdown-api';

const SETTINGS_ROOT = '.settings';

// Helper to ensure a folder path exists (root level only)
async function ensureSettingsFolder(supabase: ReturnType<typeof createClient>): Promise<string> {
    let query = supabase
        .from('folders')
        .select('id')
        .eq('name', SETTINGS_ROOT)
        .eq('is_deleted', false)
        .is('parent_id', null);

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) return data[0].id;

    const { data: newFolder, error: createError } = await supabase
        .from('folders')
        .insert({
            name: SETTINGS_ROOT,
            parent_id: null,
            user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select('id')
        .single();

    if (createError) throw createError;
    return newFolder.id;
}

async function readJsonFile(supabase: ReturnType<typeof createClient>, folderId: string, fileName: string): Promise<Record<string, string> | null> {
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
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

async function writeJsonFile(
    supabase: ReturnType<typeof createClient>,
    folderId: string,
    fileName: string,
    userId: string,
    data: Record<string, string>
): Promise<void> {
    const content = JSON.stringify(data, null, 2);

    const { data: existing } = await supabase
        .from('files')
        .select('id')
        .eq('folder_id', folderId)
        .eq('name', fileName)
        .eq('is_deleted', false)
        .single();

    if (existing) {
        await fetch(`/api/files/${existing.id}/content`, { method: 'POST', body: content });
    } else {
        const { data: newFile, error } = await supabase
            .from('files')
            .insert({
                name: fileName,
                folder_id: folderId,
                user_id: userId,
                type: 'application/json',
                size: content.length,
                uuid_r2: crypto.randomUUID()
            })
            .select('id')
            .single();
        if (error || !newFile) throw error;
        await fetch(`/api/files/${newFile.id}/content`, { method: 'POST', body: content });
    }
}

export const SettingsAPI = {
    async getAssociation(fileId: string): Promise<string | null> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        try {
            const folderId = await ensureSettingsFolder(supabase);
            const associations = await readJsonFile(supabase, folderId, 'associations.json');
            if (!associations) return null;
            const theme = associations[fileId];
            // Validate it's a known theme (backward-compat: old preset names are ignored)
            return theme && (ORZ_THEMES as readonly string[]).includes(theme) ? theme : null;
        } catch {
            return null;
        }
    },

    async saveAssociation(fileId: string, themeName: string): Promise<void> {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const folderId = await ensureSettingsFolder(supabase);
        const existing = await readJsonFile(supabase, folderId, 'associations.json') || {};
        existing[fileId] = themeName;
        await writeJsonFile(supabase, folderId, 'associations.json', user.id, existing);
    },

    async getDefaultTheme(): Promise<string | null> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        try {
            const folderId = await ensureSettingsFolder(supabase);
            const prefs = await readJsonFile(supabase, folderId, 'user-prefs.json');
            if (!prefs) return null;
            const theme = prefs['defaultTheme'];
            return theme && (ORZ_THEMES as readonly string[]).includes(theme) ? theme : null;
        } catch {
            return null;
        }
    },

    async setDefaultTheme(themeName: string): Promise<void> {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const folderId = await ensureSettingsFolder(supabase);
        await writeJsonFile(supabase, folderId, 'user-prefs.json', user.id, { defaultTheme: themeName });
    }
};
