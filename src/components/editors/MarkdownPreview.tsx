
import React, { useState, useEffect } from 'react';
import { MarkdownAPI, ThemeComposition } from '@/lib/markdown-api';
import { IsolatedPreview } from './IsolatedPreview';
import { Loader2 } from 'lucide-react';

interface MarkdownPreviewProps {
    content: string;
    settings?: ThemeComposition;
    fileId?: string;
    resolveImage?: (path: string) => string | undefined | Promise<string | undefined>;
    onScroll?: (percentage: number) => void;
    scrollPercentage?: number | null;
}

// ... (DEFAULT_THEME remains same)
const DEFAULT_THEME: ThemeComposition = {
    colors: 'dark-default',
    fonts: 'modern',
    sizing: 'default',
    elements: 'rounded',
    decorations: 'clean',
    layout: 'default',
    prism: 'tomorrow-night',
    includeLayout: true
};

export function MarkdownPreview({ content, settings, fileId, resolveImage, onScroll, scrollPercentage }: MarkdownPreviewProps) {
    const [html, setHtml] = useState<string>('');
    const [css, setCss] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Parse Markdown
    useEffect(() => {
        let mounted = true;
        const parse = async () => {
            try {
                const result = await MarkdownAPI.parse(content, { enableMath: true });

                let finalHtml = result;

                if (result) {
                    // Find all relative source attributes
                    const regex = /src="((?!http:\/\/|https:\/\/|\/|data:).+?)"/g;

                    if (resolveImage) {
                        // Custom resolution (Guest Mode)
                        // We need to replace async, so we gather matches first
                        const matches = Array.from(result.matchAll(regex));

                        if (matches.length > 0) {
                            // Replace one by one or create a map
                            // Since replace doesn't support async, we do it in two passes
                            const replacements = await Promise.all(matches.map(async (m) => {
                                const original = m[0]; // src="path"
                                const path = m[1];     // path
                                const resolved = await resolveImage(path);
                                return { original, replacement: resolved ? `src="${resolved}"` : original };
                            }));

                            replacements.forEach(({ original, replacement }) => {
                                finalHtml = finalHtml.replace(original, replacement);
                            });
                        }
                    } else if (fileId) {
                        // Standard API resolution (Auth Mode)
                        finalHtml = result.replace(
                            regex,
                            `src="/api/files/${fileId}/resolve/$1"`
                        );
                    }
                }

                if (mounted) setHtml(finalHtml);
            } catch (err) {
                console.error('Parse error:', err);
            }
        };

        // Debounce parse
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
            // Only set loading true if it's the initial load or a drastic change?
            // Actually, CSS fetching is fast. 
            const themeToLoad = settings || DEFAULT_THEME;

            try {
                const generatedCss = await MarkdownAPI.composeTheme(themeToLoad);
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
    }, [settings]);

    const staticHead = `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
        <!-- Prism Core -->
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
        <!-- Prism Languages -->
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-typescript.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-css.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markup.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markdown.min.js"></script>
    `;

    const dynamicStyles = `
        ${css}
        /* Override Heading Colors to use the Theme's Accent/Decoration Color */
        /* h1, h2, h3, h4, h5, h6 {
            color: var(--decoration-color, var(--text-color));
        } */
        /* Make links use the link color */
        /* a { color: var(--link-color); text-decoration: none; }
        a:hover { color: var(--link-hover); text-decoration: underline; } */
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
                styleContent={dynamicStyles}
                onScroll={onScroll}
                scrollPercentage={scrollPercentage}
            />
        </div>
    );
}
