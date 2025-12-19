import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

import { s3Client, R2_BUCKET_NAME } from '@/lib/r2'
import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: file, error: fetchError } = await supabase
            .from('files')
            .select('uuid_r2, name, type')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !file) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: file.uuid_r2,
            ResponseContentDisposition: `attachment; filename="${file.name}"`,
        })

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

        return NextResponse.json({ signedUrl, filename: file.name })
    } catch (error: any) {
        console.error('Error fetching file URL:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, is_deleted, folder_id } = await request.json()

        const updateData: any = {}
        if (name !== undefined) updateData.name = name
        if (is_deleted !== undefined) updateData.is_deleted = is_deleted
        if (folder_id !== undefined) updateData.folder_id = folder_id

        const { data, error } = await supabase
            .from('files')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error updating file:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const permanent = searchParams.get('permanent') === 'true'

        if (permanent) {
            // 1. Get the R2 UUID first
            const { data: file, error: fetchError } = await supabase
                .from('files')
                .select('uuid_r2')
                .eq('id', id)
                .eq('user_id', user.id)
                .single()

            if (fetchError || !file) throw fetchError || new Error('File not found')

            // 2. Delete from R2
            try {
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    Key: file.uuid_r2
                }))
            } catch (err) {
                console.error('Error deleting from R2:', err)
            }

            // 3. Delete from DB
            const { error: dbError } = await supabase
                .from('files')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id)

            if (dbError) throw dbError
        } else {
            // Soft delete
            const { error } = await supabase
                .from('files')
                .update({ is_deleted: true })
                .eq('id', id)
                .eq('user_id', user.id)

            if (error) throw error
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting file:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
