import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { s3Client, R2_BUCKET_NAME } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'


import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: file, error: fetchError } = await supabase
            .from('files')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !file) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Fetch from R2
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: file.uuid_r2,
        });

        const s3Item = await s3Client.send(command);
        const bodyStr = await s3Item.Body?.transformToString();

        return new NextResponse(bodyStr, {
            status: 200,
            headers: {
                'Content-Type': file.type || 'text/plain',
            }
        });

    } catch (error: any) {
        console.error('Fetch Content Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(
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
        const bodyText = await request.text(); // Read raw text

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

        // 3. Update R2 Object
        await s3Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: file.uuid_r2,
            Body: bodyText,
            ContentType: file.type || 'text/plain',
        }));

        // 4. Update Database Metadata (size, updated_at)
        await supabase
            .from('files')
            .update({
                size: Buffer.byteLength(bodyText, 'utf8'),
                updated_at: new Date().toISOString()
            })
            .eq('id', fileId);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Save Content Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
