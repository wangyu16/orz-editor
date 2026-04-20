import { NextRequest, NextResponse } from 'next/server';
import { parseMarkdown } from '@/lib/orz-parser';

export async function POST(req: NextRequest) {
    try {
        const { markdown } = await req.json();
        const html = parseMarkdown(markdown || '');
        return NextResponse.json({ html });
    } catch (err) {
        console.error('Parse error:', err);
        return NextResponse.json({ html: '<p>Error parsing markdown</p>' }, { status: 500 });
    }
}
