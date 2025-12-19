import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query) {
        return NextResponse.json([])
    }

    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Search files
        const { data: files, error: filesError } = await supabase
            .from('files')
            .select('*')
            .eq('user_id', user.id)
            .ilike('name', `%${query}%`)
            .eq('is_deleted', false)
            .limit(50)

        // Search folders
        const { data: folders, error: foldersError } = await supabase
            .from('folders')
            .select('*')
            .eq('user_id', user.id)
            .ilike('name', `%${query}%`)
            .eq('is_deleted', false)
            .limit(50)

        if (filesError) throw filesError
        if (foldersError) throw foldersError

        // Combine and optionally sort
        const results = [
            ...(folders || []),
            ...(files || [])
        ].sort((a, b) => a.name.localeCompare(b.name))

        return NextResponse.json(results)
    } catch (error: any) {
        console.error('Search error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
