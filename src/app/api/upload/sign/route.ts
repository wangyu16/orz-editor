import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { s3Client, R2_BUCKET_NAME } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { filename, contentType, size, folderId } = await request.json()

        if (!filename || !contentType || !size) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Limit size to 20MB as per overview.md
        if (size > 20 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })
        }

        const r2Uuid = uuidv4()

        // Generate presigned URL for R2
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Uuid,
            ContentType: contentType,
            ContentLength: size,
        })

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

        return NextResponse.json({
            signedUrl,
            r2Uuid,
            filename,
            folderId,
        })
    } catch (error: any) {
        console.error('Error generating presigned URL:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
