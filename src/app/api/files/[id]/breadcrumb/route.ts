import { createClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Fix for Next.js 15+
) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Get the file metadata first
    const { data: file, error: fileError } = await supabase
        .from('files')
        .select('id, name, folder_id, user_id')
        .eq('id', id)
        .single();

    if (fileError || !file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    let path = file.name;
    let currentFolderId = file.folder_id;

    if (!currentFolderId) {
        return NextResponse.json({ path });
    }

    // 2. Use Recursive CTE to get folder path
    // Supabase JS client doesn't support raw SQL easily without RPC, 
    // effectively we can loop or use a view. 
    // For simplicity and to avoid creating DB artifacts (RPC/View) via migration right now,
    // we will fetch parents iteratively (depth is usually small) OR fetch all folders for user (bad for scale).
    // Let's try iteratively for MVP safety, or use a known RPC if exists? No known RPC.

    // Iterative approach (capped at 10 levels for safety)
    const folderNames: string[] = [];
    let depth = 0;

    while (currentFolderId && depth < 10) {
        const { data: folder } = await supabase
            .from('folders')
            .select('id, name, parent_id')
            .eq('id', currentFolderId)
            .single();

        if (folder) {
            folderNames.unshift(folder.name); // Add to front
            currentFolderId = folder.parent_id;
            depth++;
        } else {
            break;
        }
    }

    if (folderNames.length > 0) {
        path = `${folderNames.join(' / ')} / ${file.name}`;
    }

    return NextResponse.json({ path });
}
