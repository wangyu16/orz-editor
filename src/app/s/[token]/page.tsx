import React from 'react';
import { createClient } from '@supabase/supabase-js';

import { notFound } from 'next/navigation';
import { ExplorerItem, FileMetadata } from '@/lib/types';
import { FileIcon, Folder, Download } from 'lucide-react';
import { getCategory } from '@/lib/fileUtils';
import { parseMarkdown, getThemeCSS, ORZ_THEMES } from '@/lib/orz-parser';

// Service Role Client for public access lookup
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getItemByToken(token: string) {
    // 1. Try File
    const { data: file } = await supabaseAdmin.from('files').select('*').eq('share_token', token).single();
    if (file) return { item: file as ExplorerItem, type: 'file' };

    // 2. Try Folder
    const { data: folder } = await supabaseAdmin.from('folders').select('*').eq('share_token', token).single();
    if (folder) return { item: folder as ExplorerItem, type: 'folder' };

    return null;
}

// For Folders: Fetch children
async function getFolderContents(folderId: string) {
    const { data: files } = await supabaseAdmin.from('files').select('*').eq('folder_id', folderId);
    const { data: folders } = await supabaseAdmin.from('folders').select('*').eq('parent_id', folderId);
    return [...(folders || []), ...(files || [])] as ExplorerItem[];
}

async function getOwnerTheme(userId: string, fileId: string): Promise<string> {
    const fallback = 'dark-elegant-1';
    try {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { s3Client, R2_BUCKET_NAME } = await import('@/lib/r2');

        // Find .settings folder
        const { data: rootSettings } = await supabaseAdmin.from('folders')
            .select('id')
            .eq('user_id', userId)
            .eq('name', '.settings')
            .is('parent_id', null)
            .eq('is_deleted', false)
            .single();

        if (!rootSettings) return fallback;

        const readJsonFile = async (fileName: string): Promise<Record<string, string> | null> => {
            const { data: file } = await supabaseAdmin.from('files')
                .select('*')
                .eq('folder_id', rootSettings.id)
                .eq('name', fileName)
                .eq('is_deleted', false)
                .single();
            if (!file) return null;
            const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: file.uuid_r2 });
            const s3Item = await s3Client.send(command);
            const str = await s3Item.Body?.transformToString();
            return str ? JSON.parse(str) : null;
        };

        // 1. Check associations.json for file-specific theme
        try {
            const associations = await readJsonFile('associations.json');
            if (associations && associations[fileId]) {
                const theme = associations[fileId];
                if ((ORZ_THEMES as readonly string[]).includes(theme)) return theme;
            }
        } catch { /* ignore */ }

        // 2. Fall back to user-prefs.json default theme
        try {
            const prefs = await readJsonFile('user-prefs.json');
            if (prefs && prefs['defaultTheme']) {
                const theme = prefs['defaultTheme'];
                if ((ORZ_THEMES as readonly string[]).includes(theme)) return theme;
            }
        } catch { /* ignore */ }

    } catch (err) {
        console.error('[PublicView] Error in getOwnerTheme:', err);
    }
    return fallback;
}

export default async function PublicPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const result = await getItemByToken(token);

    if (!result) return notFound();

    const { item, type } = result;

    if (type === 'folder') {
        const children = await getFolderContents(item.id);
        return (
            <div className="min-h-screen bg-background text-foreground p-8">
                <header className="mb-8 border-b border-zinc-800 pb-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Folder className="w-6 h-6 text-accent" />
                        {item.name}
                    </h1>
                    <a href={`/raw/${token}`} className="text-sm bg-zinc-800 px-3 py-1.5 rounded" target="_blank">
                        Raw View
                    </a>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {children.map((child) => (
                        <div key={child.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-3">
                            {child.kind === 'folder' ? <Folder className="w-8 h-8 text-accent" /> : <FileIcon className="w-8 h-8 text-zinc-400" />}
                            <div className="overflow-hidden">
                                <div className="truncate font-medium">{child.name}</div>
                                <div className="text-xs text-zinc-500">
                                    {child.kind === 'file' ? (child.size ? (child.size / 1024).toFixed(1) + ' KB' : '0 KB') : 'Folder'}
                                </div>
                            </div>
                        </div>
                    ))}
                    {children.length === 0 && (
                        <div className="col-span-full text-center text-zinc-500 py-12">Empty Folder</div>
                    )}
                </div>
            </div>
        );
    }

    // It's a file
    const category = getCategory(item.name);
    let content = '';

    if (category === 'text_code' || category === 'markdown_split') {
        try {
            const { GetObjectCommand } = await import('@aws-sdk/client-s3');
            const { s3Client, R2_BUCKET_NAME } = await import('@/lib/r2');
            const command = new GetObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: (item as FileMetadata).uuid_r2,
            });
            const s3Item = await s3Client.send(command);
            content = await s3Item.Body?.transformToString() || '';
        } catch (e) {
            console.error("Failed to fetch content", e);
            content = "Error loading content.";
        }
    }

    let precompiledHtml: string | undefined;
    let precompiledCss: string | undefined;

    if (category === 'markdown_split') {
        const themeName = await getOwnerTheme(item.user_id, item.id);
        precompiledHtml = parseMarkdown(content);
        precompiledCss = getThemeCSS(themeName);
    }

    return (
        <div className="h-screen flex flex-col bg-zinc-950 text-white">
            <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900">
                <div className="flex items-center gap-2">
                    <FileIcon className="w-5 h-5 text-accent" />
                    <span className="font-medium">{item.name}</span>
                </div>
                <div className="flex gap-2">
                    <a href={`/raw/${token}`} download className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded transition-colors">
                        <Download className="w-4 h-4" />
                        Download
                    </a>
                </div>
            </header>
            <div className="flex-1 overflow-hidden relative">
                <PublicFileRenderer
                    item={item}
                    category={category}
                    content={content}
                    rawUrl={`/raw/${token}`}
                    precompiledHtml={precompiledHtml}
                    precompiledCss={precompiledCss}
                />
            </div>
        </div>
    );
}

// Client Component for rendering the actual viewer
import { PublicFileRenderer } from './PublicFileRenderer';
