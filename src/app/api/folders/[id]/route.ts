import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'


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

        const { name, is_deleted, parent_id } = await request.json()

        const updateData: any = {}
        if (name !== undefined) updateData.name = name
        if (is_deleted !== undefined) updateData.is_deleted = is_deleted
        if (parent_id !== undefined) updateData.parent_id = parent_id

        const { data, error } = await supabase
            .from('folders')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error updating folder:', error)
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
            const { error } = await supabase
                .from('folders')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id)

            if (error) throw error
        } else {
            // Soft delete
            const { error } = await supabase
                .from('folders')
                .update({ is_deleted: true })
                .eq('id', id)
                .eq('user_id', user.id)

            if (error) throw error
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting folder:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
