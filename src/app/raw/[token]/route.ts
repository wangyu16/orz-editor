import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, R2_BUCKET_NAME } from '@/lib/r2';

export const runtime = 'edge';

// We use a direct Supabase client with Service Role Key here to bypass RLS
// because we are verifying access via the `share_token` manually.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;
    const searchParams = request.nextUrl.searchParams;
    const targetFileId = searchParams.get('fileId');

    try {
        // 1. Find item by token in Files
        let { data: file, error: fileError } = await supabaseAdmin
            .from('files')
            .select('*')
            .eq('share_token', token)
            .single();

        // 2. If not found, try Folders
        let folder = null;
        if (!file && !fileError) { // Logic check: fileError might be "PGRST116" (not found)
            // Actually Supabase returns error if not found.
        }

        if (!file) {
            const { data: folderData, error: folderError } = await supabaseAdmin
                .from('folders')
                .select('*')
                .eq('share_token', token)
                .single();
            folder = folderData;

            if (!folder) {
                return new NextResponse('Not Found or Invalid Token', { status: 404 });
            }
        }

        // --- CASE A: SHARED FILE ---
        if (file) {
            return serveFile(file);
        }

        // --- CASE B: SHARED FOLDER ---
        if (folder) {
            // If ?fileId is present, we are trying to download a child file
            if (targetFileId) {
                // Verify targetFileId is actually a child of this folder
                const isChild = await verifyDescendant(folder.id, targetFileId);
                if (isChild) {
                    const { data: childKw } = await supabaseAdmin.from('files').select('*').eq('id', targetFileId).single();
                    if (childKw) return serveFile(childKw);
                }
                return new NextResponse('File not found in this folder', { status: 403 });
            }

            // Otherwise, render Directory Listing
            const listingHtml = await generateDirectoryListing(folder);
            return new NextResponse(listingHtml, {
                headers: { 'Content-Type': 'text/html' }
            });
        }

        return new NextResponse('Not Found', { status: 404 });

    } catch (err: any) {
        console.error('Raw Route Error:', err);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

async function serveFile(file: any) {
    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: file.uuid_r2,
        });

        // Stream directly from R2
        // Note: s3Client.send returns a stream in .Body
        const s3Item = await s3Client.send(command);

        // Convert stream to Web Response
        // Node generic stream to Web ReadableStream conversion might be needed depending on Next.js setup
        // transformToString is easy but loads in memory. 
        // For efficiency/large files, passing the stream is better.
        // `s3Item.Body` is likely a generic IncomingMessage or Readable

        const body = await s3Item.Body?.transformToByteArray();

        return new NextResponse(body ? Buffer.from(body) : null, {
            headers: {
                'Content-Type': file.type || 'application/octet-stream',
                'Content-Disposition': `inline; filename="${file.name}"`,
            }
        });
    } catch (e) {
        console.error('S3 Error', e);
        return new NextResponse('Error fetching file content', { status: 500 });
    }
}

async function verifyDescendant(rootFolderId: string, targetFileId: string): Promise<boolean> {
    // Basic implementation: Walk up from targetFileId until we hit rootFolderId or null
    let currentId = targetFileId;

    // First get the file's parent
    const { data: file } = await supabaseAdmin.from('files').select('folder_id').eq('id', targetFileId).single();
    if (!file) return false;

    let currentFolderId = file.folder_id;
    if (currentFolderId === rootFolderId) return true;
    if (!currentFolderId) return false;

    // Traverse folder parents
    // Max depth safety to avoid infinite loops (though DAG shouldn't cycle)
    for (let i = 0; i < 50; i++) {
        const { data: folder } = await supabaseAdmin.from('folders').select('parent_id').eq('id', currentFolderId).single();
        if (!folder) return false;
        if (folder.parent_id === rootFolderId) return true;
        currentFolderId = folder.parent_id;
        if (!currentFolderId) return false;
    }

    return false;
}

async function generateDirectoryListing(rootFolder: any) {
    // 1. Fetch ALL folders and files for this user (inefficient but works for MVP)
    // Or optimized: recursive CTE.
    // Let's use a simpler approach: Fetch all items owned by the folder's owner ??
    // No, that leaks other folders.
    // We MUST use recursive fetch downstream.

    // For MVP: recursive fetch function in JS
    const allFiles: any[] = [];
    const allFolders: any[] = [];

    async function fetchChildren(parentId: string) {
        const { data: folders } = await supabaseAdmin.from('folders').select('*').eq('parent_id', parentId);
        const { data: files } = await supabaseAdmin.from('files').select('*').eq('folder_id', parentId);

        if (files) allFiles.push(...files);

        if (folders) {
            allFolders.push(...folders);
            for (const f of folders) {
                await fetchChildren(f.id);
            }
        }
    }

    await fetchChildren(rootFolder.id);

    // Generate HTML
    const rows = [
        ...allFolders.map(f => `<tr><td>📁 ${f.name}/</td><td>-</td></tr>`),
        ...allFiles.map(f => `<tr><td>📄 <a href="?fileId=${f.id}">${f.name}</a></td><td>${(f.size / 1024).toFixed(1)} KB</td></tr>`)
    ].join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Index of ${rootFolder.name}</title>
    <style>
        body { font-family: monospace; padding: 2rem; background: #fff; color: #000; }
        h1 { border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; }
        table { width: 100%; max-width: 800px; border-collapse: collapse; }
        td { padding: 4px 8px; }
        a { text-decoration: none; color: #0066cc; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>Index of /${rootFolder.name}</h1>
    <table>
        <tr><th style="text-align:left">Name</th><th style="text-align:left">Size</th></tr>
        ${rows}
    </table>
</body>
</html>
    `;
}
