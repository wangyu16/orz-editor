import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id: fileId } = await params;

    const { data: versions, error } = await supabase
        .from('file_versions')
        .select('*')
        .eq('file_id', fileId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(versions);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id: fileId } = await params;
    const json = await request.json();
    const content = json.content;

    if (content === undefined) {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Insert new version
    const { data: newVersion, error: insertError } = await supabase
        .from('file_versions')
        .insert({
            file_id: fileId,
            content: content,
            is_auto_save: false // Default to false as per requirement (manual/close)
        })
        .select()
        .single();

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Cleanup old versions (keep top 20)
    // We can do this asynchronously or simply fire and forget, but for consistency let's await.
    // Ideally, this should be a trigger or stored proc, but app-level is fine for now.
    const { count } = await supabase
        .from('file_versions')
        .select('*', { count: 'exact', head: true })
        .eq('file_id', fileId);

    if (count && count > 20) {
        const { data: oldVersions } = await supabase
            .from('file_versions')
            .select('id')
            .eq('file_id', fileId)
            .order('created_at', { ascending: false })
            .range(20, count);

        if (oldVersions && oldVersions.length > 0) {
            await supabase
                .from('file_versions')
                .delete()
                .in('id', oldVersions.map(v => v.id));
        }
    }

    return NextResponse.json(newVersion);
}
