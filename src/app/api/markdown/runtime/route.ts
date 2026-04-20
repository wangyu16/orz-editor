import { NextResponse } from 'next/server';
import { getBrowserRuntimeScript } from 'orz-markdown/runtime';

export async function GET() {
    const script = getBrowserRuntimeScript();
    return new NextResponse(script, {
        headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
