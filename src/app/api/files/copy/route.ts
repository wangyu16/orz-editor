import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'edge';
import { s3Client, R2_BUCKET_NAME } from '@/lib/r2'
import { CopyObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { sourceIds, targetFolderId } = await request.json()

        if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
            return NextResponse.json({ error: 'Source IDs are required' }, { status: 400 })
        }

        // Helper function to copy a file
        async function copyFile(fileId: string, targetFolder: string | null, userId: string) {
            // Fetch source file
            const { data: sourceFile, error: fetchError } = await supabase
                .from('files')
                .select('*')
                .eq('id', fileId)
                .single()

            if (fetchError || !sourceFile) return null;

            // Resolve name conflict
            let finalName = sourceFile.name

            // Check for potential conflicts in target folder
            let query = supabase.from('files').select('name');
            if (targetFolder) {
                query = query.eq('folder_id', targetFolder);
            } else {
                query = query.is('folder_id', null);
            }
            const { data: siblings } = await query;
            if (siblings) {
                const existingNames = new Set(siblings.map(f => f.name));
                if (existingNames.has(finalName)) {
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

            const newR2Uuid = uuidv4()

            // Copy in R2
            try {
                await s3Client.send(new CopyObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    CopySource: `${R2_BUCKET_NAME}/${sourceFile.uuid_r2}`,
                    Key: newR2Uuid,
                    ContentType: sourceFile.type === 'folder' ? undefined : (sourceFile.type || 'application/octet-stream'),
                }));
            } catch (err) {
                console.error("R2 Copy Error, attempting fallback", err);
                if (sourceFile.size === 0) {
                    await s3Client.send(new PutObjectCommand({
                        Bucket: R2_BUCKET_NAME,
                        Key: newR2Uuid,
                        Body: '',
                    }));
                } else {
                    throw err;
                }
            }

            // Insert new metadata
            const { data: newFile } = await supabase
                .from('files')
                .insert({
                    name: finalName,
                    uuid_r2: newR2Uuid,
                    folder_id: targetFolder,
                    user_id: userId,
                    type: sourceFile.type,
                    size: sourceFile.size,
                })
                .select()
                .single();

            return newFile;
        }

        // Helper to copy folder recursively
        async function copyFolder(folderId: string, targetParentId: string | null, userId: string) {
            // Fetch source folder
            const { data: sourceFolder } = await supabase.from('folders').select('*').eq('id', folderId).single();
            if (!sourceFolder) return null;

            // Resolve name conflict for the folder itself
            let finalName = sourceFolder.name
            let query = supabase.from('folders').select('name');
            if (targetParentId) query = query.eq('parent_id', targetParentId);
            else query = query.is('parent_id', null);

            const { data: siblings } = await query;
            if (siblings) {
                const existingNames = new Set(siblings.map(f => f.name));
                if (existingNames.has(finalName)) {
                    let i = 1;
                    while (existingNames.has(`${finalName} (${i})`)) i++;
                    finalName = `${finalName} (${i})`;
                }
            }

            // Create new folder
            const { data: newFolder } = await supabase
                .from('folders')
                .insert({
                    name: finalName,
                    parent_id: targetParentId,
                    user_id: userId
                })
                .select()
                .single();

            if (!newFolder) return null;

            // Fetch children
            const { data: childFiles } = await supabase.from('files').select('id').eq('folder_id', folderId);
            const { data: childFolders } = await supabase.from('folders').select('id').eq('parent_id', folderId);

            // Recursively copy children
            if (childFiles) {
                await Promise.all(childFiles.map(f => copyFile(f.id, newFolder.id, userId)));
            }
            if (childFolders) {
                await Promise.all(childFolders.map(f => copyFolder(f.id, newFolder.id, userId)));
            }

            return newFolder;
        }

        const results = [];

        for (const id of sourceIds) {
            // Try to find in files first
            const { data: file } = await supabase.from('files').select('id').eq('id', id).single();
            if (file) {
                results.push(await copyFile(id, targetFolderId, user.id));
                continue;
            }

            // Try folders
            const { data: folder } = await supabase.from('folders').select('id').eq('id', id).single();
            if (folder) {
                results.push(await copyFolder(id, targetFolderId, user.id));
            }
        }

        return NextResponse.json({ success: true, results })

    } catch (error: any) {
        console.error('Copy Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
