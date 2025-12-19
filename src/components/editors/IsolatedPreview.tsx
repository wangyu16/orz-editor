import React from 'react';

interface IsolatedPreviewProps {
    content: string;
}

export function IsolatedPreview({ content }: IsolatedPreviewProps) {
    const srcDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { 
                    margin: 0; 
                    padding: 20px; 
                    font-family: system-ui, -apple-system, sans-serif;
                    color: #e4e4e7;
                    background: #18181b; 
                }
            </style>
        </head>
        <body>
            ${content}
        </body>
        </html>
    `;

    return (
        <div className="h-full w-full bg-zinc-950">
            <iframe
                srcDoc={srcDoc}
                className="w-full h-full border-none"
                title="Preview"
                sandbox="allow-scripts"
            />
        </div>
    );
}
