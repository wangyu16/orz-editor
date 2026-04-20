
import React, { useState, useEffect } from 'react';
import { MarkdownAPI } from '@/lib/markdown-api';
import { IsolatedPreview } from './IsolatedPreview';
import { Loader2 } from 'lucide-react';

interface MarkdownPreviewProps {
    content: string;
    themeName?: string;
    fileId?: string;
    resolveImage?: (path: string) => string | undefined | Promise<string | undefined>;
    onScroll?: (percentage: number) => void;
    scrollPercentage?: number | null;
}

const DEFAULT_THEME = 'dark-elegant-1';

export function MarkdownPreview({ content, themeName, fileId, resolveImage, onScroll, scrollPercentage }: MarkdownPreviewProps) {
    const [html, setHtml] = useState<string>('');
    const [css, setCss] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Parse Markdown
    useEffect(() => {
        let mounted = true;
        const parse = async () => {
            try {
                let result = await MarkdownAPI.parse(content);

                if (result) {
                    // Find all relative source attributes (not http/https/absolute/data URIs)
                    const regex = /src="((?!http:\/\/|https:\/\/|\/|data:).+?)"/g;

                    if (resolveImage) {
                        const matches = Array.from(result.matchAll(regex));
                        if (matches.length > 0) {
                            const replacements = await Promise.all(matches.map(async (m) => {
                                const original = m[0];
                                const path = m[1];
                                const resolved = await resolveImage(path);
                                return { original, replacement: resolved ? `src="${resolved}"` : original };
                            }));
                            replacements.forEach(({ original, replacement }) => {
                                result = result.replace(original, replacement);
                            });
                        }
                    } else if (fileId) {
                        result = result.replace(
                            regex,
                            `src="/api/files/${fileId}/resolve/$1"`
                        );
                    }
                }

                if (mounted) setHtml(result);
            } catch (err) {
                console.error('Parse error:', err);
            }
        };

        const timer = setTimeout(parse, 800);
        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, [content, fileId, resolveImage]);

    // Fetch Theme CSS
    useEffect(() => {
        let mounted = true;
        const loadTheme = async () => {
            try {
                const generatedCss = await MarkdownAPI.getThemeCSS(themeName || DEFAULT_THEME);
                if (mounted) {
                    setCss(generatedCss);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Theme load error:', err);
                if (mounted) setLoading(false);
            }
        };

        loadTheme();
        return () => { mounted = false; };
    }, [themeName]);

    const staticHead = `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.css">
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-typescript.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-css.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markup.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markdown.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/smiles-drawer@2/dist/smiles-drawer.min.js"></script>
        <script src="/api/markdown/runtime"></script>
        <script>if (typeof mermaid !== 'undefined') mermaid.initialize({ startOnLoad: false, theme: 'neutral' });</script>
    `;

    return (
        <div className="relative h-full w-full">
            {loading && !css && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10 text-white">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </div>
            )}
            <IsolatedPreview
                content={html || '<div class="p-4 text-zinc-500">Parsing...</div>'}
                initialHead={staticHead}
                styleContent={css}
                onScroll={onScroll}
                scrollPercentage={scrollPercentage}
            />
        </div>
    );
}
