import { createClient } from '@/lib/supabase-server';

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if item exists and user owns it
        // We need to check both files and folders since we share both.
        // Let's assume the ID is unique across both or try both tables.
        // Actually, UUIDs are unique. We can try 'files' first.

        let type = 'file';
        let { data: item, error } = await supabase
            .from('files')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (error || !item) {
            // Try folder
            const { data: folder, error: folderError } = await supabase
                .from('folders')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (folderError || !folder) {
                return NextResponse.json({ error: 'Item not found' }, { status: 404 });
            }
            item = folder;
            type = 'folder';
        }

        // Generate Token if missing
        let share_token = item.share_token;
        if (!share_token) {
            share_token = uuidv4();
        }

        // Update verify - set is_public to true
        const tableName = type === 'file' ? 'files' : 'folders';
        const { error: updateError } = await supabase
            .from(tableName)
            .update({
                share_token: share_token,
                is_public: true
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // Construct URLs
        const origin = request.nextUrl.origin;
        const renderedUrl = `${origin}/s/${share_token}`;
        const rawUrl = `${origin}/raw/${share_token}`;

        return NextResponse.json({
            share_token,
            is_public: true,
            renderedUrl,
            rawUrl
        });

    } catch (err: any) {
        console.error('Share Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
