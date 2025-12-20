'use client';

import React from 'react';
import { ExplorerItem } from '@/lib/types';
import { CodeEditor } from '@/components/editors/CodeEditor';
import { PDFViewer } from '@/components/previewers/PDFViewer';
import { ImageViewer } from '@/components/previewers/ImageViewer';
import { MediaPlayer } from '@/components/previewers/MediaPlayer';

import { MarkdownPreview } from '@/components/editors/MarkdownPreview';

interface Props {
    item: ExplorerItem;
    category: string;
    content: string; // Only for text/code
    rawUrl: string;
    settings?: any;
}

export function PublicFileRenderer({ item, category, content, rawUrl, settings }: Props) {
    if (category === 'markdown_split') {
        return (
            <MarkdownPreview content={content} settings={settings} fileId={item.id} />
        );
    }

    if (category === 'text_code' || category === 'json' || category === 'html') {
        return (
            <CodeEditor
                initialContent={content}
                language={item.kind === 'file' ? (item.type || 'markdown') : 'markdown'}
                onChange={() => { }}
                onSave={() => { }}
                readOnly={true}
            />
        );
    }

    const fileType = item.kind === 'file' ? item.type : undefined;

    if (category === 'image') return <ImageViewer url={rawUrl} alt={item.name} />;
    if (category === 'video') return <MediaPlayer url={rawUrl} type="video" mimeType={fileType} />;
    if (category === 'audio') return <MediaPlayer url={rawUrl} type="audio" mimeType={fileType} />;
    if (category === 'pdf') return <PDFViewer url={rawUrl} />;

    return (
        <div className="flex items-center justify-center h-full text-zinc-500">
            Preview not available for this file type.
        </div>
    );
}
