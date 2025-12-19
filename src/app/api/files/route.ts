import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, r2Uuid, folderId, type, size } = await request.json()

        if (!name || !r2Uuid || !type || size === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('files')
            .insert({
                name,
                uuid_r2: r2Uuid,
                folder_id: folderId || null,
                user_id: user.id,
                type,
                size,
            })
            .select()
            .single()

        if (error) {
            throw error
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error creating file record:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const folderId = searchParams.get('folderId')

        let query = supabase
            .from('files')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_deleted', false)

        if (folderId === 'null' || !folderId) {
            query = query.is('folder_id', null)
        } else {
            query = query.eq('folder_id', folderId)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error fetching files:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
