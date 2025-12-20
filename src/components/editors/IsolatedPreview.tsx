import React, { useEffect, useRef, useState } from 'react';

// Add onScroll prop to communicate back to parent
interface IsolatedPreviewProps {
    content: string;
    initialHead?: string;   // Static head content (scripts) baked into srcDoc
    styleContent?: string;  // Dynamic CSS content
    onScroll?: (percentage: number) => void;
    scrollPercentage?: number | null; // Receive scroll from parent
}

export function IsolatedPreview({ content, initialHead = '', styleContent = '', onScroll, scrollPercentage }: IsolatedPreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [initialized, setInitialized] = useState(false);

    // Track if we are currently scrolling programmatically to avoid loops
    const [isScrolling, setIsScrolling] = useState(false);

    // Initial "Skeleton" srcDoc with the updater script
    // We inject initialHead here so scripts execute immediately on load
    const [initialSrcDoc] = useState(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            ${initialHead}
            <style id="dynamic-styles"></style>
            <script>
                let isProgrammaticScroll = false;
                let scrollTimeout;

                window.addEventListener('message', (event) => {
                    const { type, body, styles, percent } = event.data;
                    
                    if (type === 'update') {
                        // Preserve scroll logic (same as before)
                        const scrollY = window.scrollY;
                        const scrollX = window.scrollX;
                        
                        // Update Body
                        if (body !== undefined) document.body.innerHTML = body;
                        
                        // Update Styles
                        if (styles !== undefined) {
                            const styleEl = document.getElementById('dynamic-styles');
                            if (styleEl) styleEl.textContent = styles;
                        }

                        // Re-highlight Code
                        if (window.Prism) {
                             setTimeout(() => window.Prism.highlightAll(), 0);
                        }
                        
                        window.scrollTo(scrollX, scrollY);
                    }
                    
                    if (type === 'scroll') {
                        // Sync Scroll
                        isProgrammaticScroll = true;
                        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                        const targetY = percent * maxScroll;
                        
                        window.scrollTo(0, targetY);
                        
                        // Reset flag after a delay
                        clearTimeout(scrollTimeout);
                        scrollTimeout = setTimeout(() => {
                            isProgrammaticScroll = false;
                        }, 50);
                    }
                });

                // Broadcast Scroll
                window.addEventListener('scroll', () => {
                    if (isProgrammaticScroll) return;
                    
                    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                    if (maxScroll <= 0) return;
                    
                    const percent = window.scrollY / maxScroll;
                    
                    // Throttle/Post
                    window.parent.postMessage({ type: 'preview-scroll', percent }, '*');
                });
            </script>
        </head>
        <body>
            <div id="root"></div>
        </body>
        </html>
    `);

    // Listen for messages FROM iframe (scroll events)
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data?.type === 'preview-scroll' && onScroll) {
                onScroll(e.data.percent);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [onScroll]);

    // Send scroll updates TO iframe
    useEffect(() => {
        if (scrollPercentage !== null && scrollPercentage !== undefined && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'scroll',
                percent: scrollPercentage
            }, '*');
        }
    }, [scrollPercentage]);

    // On mount/update, send the new content
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const sendMessage = () => {
            iframe.contentWindow?.postMessage({
                type: 'update',
                body: content,
                styles: `
                    body { margin: 0; }
                    ::-webkit-scrollbar { width: 8px; height: 8px; }
                    ::-webkit-scrollbar-track { background: transparent; }
                    ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
                    ${styleContent}
                `
            }, '*');
        };

        if (initialized) {
            sendMessage();
        }

    }, [content, styleContent, initialized]);

    const handleLoad = () => {
        setInitialized(true);
        // Initial send handled by effect if needed, but let's ensure it runs once loaded
    };

    return (
        <div className="h-full w-full bg-zinc-950">
            <iframe
                ref={iframeRef}
                srcDoc={initialSrcDoc}
                className="w-full h-full border-none"
                title="Preview"
                sandbox="allow-scripts allow-same-origin"
                onLoad={handleLoad}
            />
        </div>
    );
}
