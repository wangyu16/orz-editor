'use client';

import React from 'react';
import { ExplorerItem } from '@/lib/types';
import { CodeEditor } from '@/components/editors/CodeEditor';
import { PDFViewer } from '@/components/previewers/PDFViewer';
import { ImageViewer } from '@/components/previewers/ImageViewer';
import { MediaPlayer } from '@/components/previewers/MediaPlayer';

import { IsolatedPreview } from '@/components/editors/IsolatedPreview';
import { MarkdownPreview } from '@/components/editors/MarkdownPreview';

interface Props {
    item: ExplorerItem;
    category: string;
    content: string; // Only for text/code
    rawUrl: string;
    precompiledHtml?: string;
    precompiledCss?: string;
}

export function PublicFileRenderer({ item, category, content, rawUrl, precompiledHtml, precompiledCss }: Props) {
    if (category === 'markdown_split') {
        if (precompiledHtml && precompiledCss) {
            const staticHead = `
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
                <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-typescript.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-css.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markup.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markdown.min.js"></script>
            `;
            return (
                <div className="h-full w-full">
                    <IsolatedPreview
                        content={precompiledHtml}
                        initialHead={staticHead}
                        styleContent={precompiledCss}
                    />
                </div>
            );
        }
        return (
            <MarkdownPreview content={content} fileId={item.id} />
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

