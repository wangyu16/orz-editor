import React from 'react';

interface PDFViewerProps {
    url: string;
}

export function PDFViewer({ url }: PDFViewerProps) {
    return (
        <div className="h-full w-full bg-zinc-900">
            <iframe
                src={url}
                className="w-full h-full border-none"
                title="PDF Preview"
            />
        </div>
    );
}
