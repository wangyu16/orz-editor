import { NextRequest, NextResponse } from 'next/server';
import { getThemeCSS, ORZ_THEMES } from '@/lib/orz-parser';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ name: string }> }
) {
    const { name } = await params;
    if (!(ORZ_THEMES as readonly string[]).includes(name)) {
        return new NextResponse('Theme not found', { status: 404 });
    }
    const css = getThemeCSS(name);
    return new NextResponse(css, {
        headers: { 'Content-Type': 'text/css' },
    });
}
