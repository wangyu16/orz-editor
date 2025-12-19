import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

import { s3Client, R2_BUCKET_NAME } from '@/lib/r2'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient()

        // 1. Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const fileId = id;
        if (!fileId) return NextResponse.json({ error: 'File ID required' }, { status: 400 });

        // 2. Fetch file metadata
        const { data: file, error: fetchError } = await supabase
            .from('files')
            .select('*')
            .eq('id', fileId)
            .single();

        if (fetchError || !file) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // 3. Generate Presigned URL
        // We set ResponseContentDisposition to inline to allow browser preview
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: file.uuid_r2,
            ResponseContentDisposition: 'inline',
            ResponseContentType: file.type || 'application/octet-stream' // Ensure correct mime type
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

        return NextResponse.json({ url });

    } catch (error: any) {
        console.error('Preview URL Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
