import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'


export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const parentId = searchParams.get('parentId')

        let foldersQuery = supabase
            .from('folders')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_deleted', false)

        let filesQuery = supabase
            .from('files')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_deleted', false)

        if (parentId === 'null' || !parentId) {
            foldersQuery = foldersQuery.is('parent_id', null)
            filesQuery = filesQuery.is('folder_id', null)
        } else {
            foldersQuery = foldersQuery.eq('parent_id', parentId)
            filesQuery = filesQuery.eq('folder_id', parentId)
        }

        const [foldersResult, filesResult] = await Promise.all([
            foldersQuery,
            filesQuery
        ])

        if (foldersResult.error) throw foldersResult.error
        if (filesResult.error) throw filesResult.error

        const folders = foldersResult.data.map((f: any) => ({ ...f, kind: 'folder' }))
        const files = filesResult.data.map((f: any) => ({ ...f, kind: 'file' }))

        // Combine and sort (folders first, then alphabetically)
        const combined = [...folders, ...files].sort((a, b) => {
            if (a.kind !== b.kind) {
                return a.kind === 'folder' ? -1 : 1
            }
            return a.name.localeCompare(b.name)
        })

        return NextResponse.json(combined)
    } catch (error: any) {
        console.error('Error fetching tree:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
