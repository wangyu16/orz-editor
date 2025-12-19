import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const [foldersResult, filesResult] = await Promise.all([
            supabase.from('folders').select('*').eq('user_id', user.id).eq('is_deleted', true).order('name'),
            supabase.from('files').select('*').eq('user_id', user.id).eq('is_deleted', true).order('name')
        ])

        if (foldersResult.error) throw foldersResult.error
        if (filesResult.error) throw filesResult.error

        const folders = foldersResult.data.map((f: any) => ({ ...f, kind: 'folder' }))
        const files = filesResult.data.map((f: any) => ({ ...f, kind: 'file' }))

        return NextResponse.json([...folders, ...files])
    } catch (error: any) {
        console.error('Error fetching trash:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
