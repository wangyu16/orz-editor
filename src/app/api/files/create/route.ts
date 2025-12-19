import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

import { s3Client, R2_BUCKET_NAME } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, type, folderId } = await request.json()

        if (!name || !type) {
            return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
        }

        const r2Uuid = uuidv4()

        // Create empty file in R2
        // Content type mapping
        let contentType = 'text/plain'
        if (type === 'md' || type === 'emd' || type === 'cmd' || type === 'smd') contentType = 'text/markdown'
        else if (type === 'html') contentType = 'text/html'
        else if (type === 'css') contentType = 'text/css'
        else if (type === 'js') contentType = 'text/javascript'
        else if (type === 'json') contentType = 'application/json'

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Uuid,
            Body: '', // Empty content
            ContentType: contentType,
        })

        await s3Client.send(command)

        // Check for duplicates and resolve name conflict
        let finalName = name
        const { data: existingFiles } = await supabase
            .from('files')
            .select('name')
            .eq('folder_id', folderId || null) // Handle root (null) explicitly if needed, but supabase treats eq null as IS NULL usually? No, eq('col', null) is risky.
        // Supabase .eq('folder_id', null) might not work as expected for IS NULL. 
        // Safer to use .is('folder_id', null) if folderId is null, or .eq otherwise.

        let query = supabase.from('files').select('name');
        if (folderId) {
            query = query.eq('folder_id', folderId);
        } else {
            query = query.is('folder_id', null);
        }

        const { data: filesInFolder } = await query;

        if (filesInFolder) {
            const existingNames = new Set(filesInFolder.map(f => f.name));
            if (existingNames.has(finalName)) {
                // Parse base and extension
                const extIndex = finalName.lastIndexOf('.');
                const base = extIndex !== -1 ? finalName.slice(0, extIndex) : finalName;
                const ext = extIndex !== -1 ? finalName.slice(extIndex) : '';

                let i = 1;
                while (existingNames.has(`${base} (${i})${ext}`)) {
                    i++;
                }
                finalName = `${base} (${i})${ext}`;
            }
        }

        // Create record in Supabase
        const { data, error } = await supabase
            .from('files')
            .insert({
                name: finalName,
                uuid_r2: r2Uuid,
                folder_id: folderId || null,
                user_id: user.id,
                type,
                size: 0,
            })
            .select()
            .single()

        if (error) {
            throw error
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error creating file:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
