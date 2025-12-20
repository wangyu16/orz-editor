import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { s3Client, R2_BUCKET_NAME } from '@/lib/r2'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; path: string[] }> }
) {
    try {
        const { id, path } = await params;
        const supabase = await createClient();

        // 1. Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!id || !path || path.length === 0) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        // 2. Get Context File to find starting folder
        const { data: contextFile, error: contextError } = await supabase
            .from('files')
            .select('folder_id')
            .eq('id', id)
            .single();

        if (contextError || !contextFile) {
            return NextResponse.json({ error: 'Context file not found' }, { status: 404 });
        }

        let currentFolderId = contextFile.folder_id;

        // 3. Traverse path
        // Last segment is filename, others are folders
        const filename = path[path.length - 1];
        const folderSegments = path.slice(0, path.length - 1);

        for (const segment of folderSegments) {
            let query = supabase
                .from('folders')
                .select('id')
                .eq('name', segment)
                .eq('is_deleted', false);

            if (currentFolderId) {
                query = query.eq('parent_id', currentFolderId);
            } else {
                query = query.is('parent_id', null);
            }

            const { data: folder } = await query.single();

            if (!folder) {
                return NextResponse.json({ error: `Folder ${segment} not found` }, { status: 404 });
            }
            currentFolderId = folder.id;
        }

        // 4. Find the file
        let fileQuery = supabase
            .from('files')
            .select('*')
            .eq('name', filename)
            .eq('is_deleted', false);

        if (currentFolderId) {
            fileQuery = fileQuery.eq('folder_id', currentFolderId);
        } else {
            fileQuery = fileQuery.is('folder_id', null);
        }

        const { data: targetFile } = await fileQuery.single();

        if (!targetFile) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // 5. Generate Signed URL and Redirect
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: targetFile.uuid_r2,
            ResponseContentDisposition: 'inline',
            ResponseContentType: targetFile.type || 'application/octet-stream'
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        return NextResponse.redirect(url);

    } catch (error: any) {
        console.error('Resolve Path Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
