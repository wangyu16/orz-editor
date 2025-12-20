import React from 'react';
import { createClient } from '@supabase/supabase-js';

import { notFound } from 'next/navigation';
import { CodeEditor } from '@/components/editors/CodeEditor'; // We will need to Client Wrapper this if it's not "use client"
import { PDFViewer } from '@/components/previewers/PDFViewer';
import { ImageViewer } from '@/components/previewers/ImageViewer';
import { MediaPlayer } from '@/components/previewers/MediaPlayer';
import { ExplorerItem, FileMetadata } from '@/lib/types';
import { FileIcon, Folder, Download } from 'lucide-react';
import { getCategory } from '@/lib/fileUtils';

// Service Role Client for public access lookup
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getItemByToken(token: string) {
    // 1. Try File
    let { data: file } = await supabaseAdmin.from('files').select('*').eq('share_token', token).single();
    if (file) return { item: file as ExplorerItem, type: 'file' };

    // 2. Try Folder
    let { data: folder } = await supabaseAdmin.from('folders').select('*').eq('share_token', token).single();
    if (folder) return { item: folder as ExplorerItem, type: 'folder' };

    return null;
}

// For Folders: Fetch children
async function getFolderContents(folderId: string) {
    const { data: files } = await supabaseAdmin.from('files').select('*').eq('folder_id', folderId);
    const { data: folders } = await supabaseAdmin.from('folders').select('*').eq('parent_id', folderId);
    return [...(folders || []), ...(files || [])] as ExplorerItem[];
}

async function getOwnerSettings(userId: string, fileId: string) {
    console.log(`[PublicView] Getting settings for user ${userId}, file ${fileId}`);
    try {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { s3Client, R2_BUCKET_NAME } = await import('@/lib/r2');

        // 1. Find .settings folder
        const { data: rootSettings } = await supabaseAdmin.from('folders')
            .select('id')
            .eq('user_id', userId)
            .eq('name', '.settings')
            .is('parent_id', null)
            .eq('is_deleted', false)
            .single();

        if (!rootSettings) {
            console.log('[PublicView] .settings folder not found');
            return null;
        }

        // 2. Find markdown folder
        const { data: mdFolder } = await supabaseAdmin.from('folders')
            .select('id')
            .eq('parent_id', rootSettings.id)
            .eq('name', 'markdown')
            .eq('is_deleted', false)
            .single();

        if (!mdFolder) {
            console.log('[PublicView] markdown settings folder not found');
            return null;
        }

        // Helper to fetch JSON from R2 via Supabase File record
        const loadJsonFile = async (fileName: string) => {
            const { data: file } = await supabaseAdmin.from('files')
                .select('*')
                .eq('folder_id', mdFolder.id)
                .eq('name', fileName)
                .eq('is_deleted', false)
                .single();

            if (!file) {
                console.log(`[PublicView] Settings file ${fileName} not found`);
                return null;
            }

            const command = new GetObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: file.uuid_r2
            });
            const s3Item = await s3Client.send(command);
            const str = await s3Item.Body?.transformToString();
            return str ? JSON.parse(str) : null;
        };

        // 3. Try associations.json
        let presetName = 'default';
        try {
            const { data: assocFile } = await supabaseAdmin.from('files')
                .select('*')
                .eq('folder_id', rootSettings.id)
                .eq('name', 'associations.json')
                .eq('is_deleted', false)
                .single();

            if (assocFile) {
                const command = new GetObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    Key: assocFile.uuid_r2
                });
                const s3Item = await s3Client.send(command);
                const str = await s3Item.Body?.transformToString();
                const associations = str ? JSON.parse(str) : {};
                console.log('[PublicView] Associations loaded:', associations);

                if (associations[fileId]) {
                    presetName = associations[fileId];
                    console.log(`[PublicView] Found association for ${fileId}: ${presetName}`);
                } else {
                    console.log(`[PublicView] No association found for ${fileId}`);
                }
            } else {
                console.log('[PublicView] associations.json not found');
            }
        } catch (e) {
            console.error('[PublicView] Error reading associations:', e);
        }

        // 4. Load the preset (default or associated)
        const targetFile = presetName.endsWith('.json') ? presetName : `${presetName}.json`;
        console.log(`[PublicView] Loading preset file: ${targetFile}`);

        const settings = await loadJsonFile(targetFile);
        if (settings && settings.theme) return settings.theme;

        // Fallback if specific preset failed but default might exist (if we tried a custom one first)
        if (presetName !== 'default') {
            console.log('[PublicView] Falling back to default.json');
            const def = await loadJsonFile('default.json');
            return def?.theme;
        }

    } catch (err) {
        console.error('[PublicView] Critical error in getOwnerSettings:', err);
        return null;
    }
    return null;
}

// Client Component Wrapper for CodeEditor (since it uses hooks/interactive)
// We'll define it in a separate file or inline if simple? 
// Next.js Server Components can't import Client Components directly if they aren't marked 'use client'.
// `CodeEditor` likely isn't marked 'use client' yet explicitly? 
// Let's assume we need to handle "use client" boundary.

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
    // We need to fetch content if it's text/code
    const category = getCategory(item.name);
    let content = '';

    // Construct URLs
    // Using the raw route as the source for the viewer!
    // But we need absolute URL for server side fetch? Or relative?
    // In Server Component, fetch needs absolute. 
    // Actually, we can use `supabaseAdmin` to get signed URL or just use the `/raw` endpoint.
    // However, for Text content, we want to server-render it if possible or fetch it in client.
    // Let's fetch it here on server to pass to Editor.

    if (category === 'text_code' || category === 'markdown_split') {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/why-use-functions-when-we-have-api?`, {
                // Just kidding. We need to fetch from R2.
                // We can reuse the logic from `raw` route or just call it?
                // Calling localhost API from Server Component is flaky in Vercel/Next sometimes (needs full URL).
                // Better to use the S3 client directly.
            });
            // ... Copy-paste S3 fetch logic logic?
            // Easier: Just fetch the public raw URL if we can't share logic?
            // But Authentication? Raw URL is public!
            // We need the absolute URL. `https://...?`

            // Let's use the S3 client directly like in `raw` route.
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

    // Fetch owner settings (if markdown)
    let settings = undefined;
    let precompiledHtml = undefined;
    let precompiledCss = undefined;

    if (category === 'markdown_split') {
        settings = await getOwnerSettings(item.user_id, item.id);

        // Server-Side Pre-compilation
        // 1. Parse Markdown
        // We need to import the API dynamically or ensure it's available.
        // MarkdownAPI in lib is standard TS, should work if fetch is polyfilled (Next.js 13+ has native fetch).
        const { MarkdownAPI } = await import('@/lib/markdown-api');

        precompiledHtml = await MarkdownAPI.parse(content, { enableMath: true });

        // 2. Resolve Images for Shared View
        // Replace src="UUID" with /raw/UUID if possible?
        // Or leave as is? The MarkdownPreview logic handles parsing. 
        // But IsolatedPreview won't have the parsing logic.
        // So we strictly need to resolve images HERE on server or inject a resolver script.
        // Server side resolution is best:
        // Replace relative paths with /api/files/[id]/resolve/... OR 
        // Since we are public, we likely need a public resolution endpoint?
        // /raw/TOKEN is for the FILE itself.
        // Images linked in markdown need to be resolveable.
        // For now, let's assume standard resolution or keep as is (browser might fail to load relative images without logic).
        // Let's defer image resolution for a moment and focus on styles, as that is the user complaint.

        // 3. Compose Theme
        const themeToLoad = settings || {
            colors: 'dark-default',
            fonts: 'modern',
            sizing: 'default',
            elements: 'rounded',
            decorations: 'clean',
            layout: 'default',
            prism: 'tomorrow-night',
            includeLayout: true
        };
        precompiledCss = await MarkdownAPI.composeTheme(themeToLoad);
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
                    settings={settings}
                    precompiledHtml={precompiledHtml}
                    precompiledCss={precompiledCss}
                />
            </div>
        </div>
    );
}

// Client Component for rendering the actual viewer
import { PublicFileRenderer } from './PublicFileRenderer';
