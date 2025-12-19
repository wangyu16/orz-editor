import React from 'react';
import { ExplorerItem } from '@/lib/types';
import { Download, Loader2 } from 'lucide-react';
import { useFileUrl } from '@/hooks/useFileUrl';
import { useFileContent } from '@/hooks/useFileContent';
import { ImageViewer } from '@/components/previewers/ImageViewer';
import { MediaPlayer } from '@/components/previewers/MediaPlayer';
import { PDFViewer } from '@/components/previewers/PDFViewer';
import { CodeEditor } from './CodeEditor';
import { MarkdownSplitEditor } from './MarkdownSplitEditor';
import { useFileSystem } from '@/hooks/useFileSystem';
import { getCategory } from '@/lib/fileUtils';

interface EditorContainerProps {
    file: ExplorerItem;
    onDownload: (file: ExplorerItem) => void;
}

export function EditorContainer({ file, onDownload }: EditorContainerProps) {
    const { url, loading: urlLoading, error: urlError } = useFileUrl(file);
    const { content, loading: contentLoading, error: contentError } = useFileContent(file);
    const { saveFile } = useFileSystem();

    // State for tracking edits in CodeEditor mode (MarkdownSplitEditor manages its own)
    const [editorContent, setEditorContent] = React.useState<string | null>(null);

    // Reset editor content when file or fetched content changes
    React.useEffect(() => {
        if (content !== undefined) setEditorContent(content);
    }, [content, file.id]);





    const category = getCategory(file.name, file.kind === 'file' ? file.type : undefined);
    const loading = urlLoading || (['text_code', 'markdown_split'].includes(category) && contentLoading);
    const error = urlError || (['text_code', 'markdown_split'].includes(category) && contentError);

    const handleSave = async (newContent: string) => {
        if (!file) return;
        await saveFile(file.id, newContent);
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full w-full bg-background/50 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="mt-4 text-foreground/50">Loading editor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-full w-full bg-background/50 items-center justify-center">
                <p className="text-red-400 mb-4">Failed to load content</p>
                <button onClick={() => onDownload(file)} className="text-sm underline">Try Download</button>
            </div>
        );
    }

    if (url) {
        if (category === 'image') return <ImageViewer url={url} alt={file.name} />;
        if (category === 'video') return <MediaPlayer url={url} type="video" mimeType={file.kind === 'file' ? file.type : undefined} />;
        if (category === 'audio') return <MediaPlayer url={url} type="audio" mimeType={file.kind === 'file' ? file.type : undefined} />;
        // PDF Viewer needs robust header handling, assume url is correct
        if (category === 'pdf') return <PDFViewer url={url} />;
    }

    if (category === 'markdown_split') {
        return <MarkdownSplitEditor file={file} initialContent={content || ''} onSave={handleSave} />;
    }


    // Wait, I can't inject refs easily into the return logic above without valid hook usage.
    // I should create a small wrapper or just manage state here.
    // Using a wrapper inside Render is bad.
    // Let's use `useState` for content edits.

    // ... logic continues below ...




    if (category === 'text_code') {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
        return (
            <div className="h-full w-full bg-zinc-950 flex flex-col">
                <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-end px-4">
                    <button
                        onClick={() => editorContent !== null && handleSave(editorContent)}
                        className="flex items-center space-x-1.5 text-xs bg-accent hover:bg-accent/90 text-white px-3 py-1.5 rounded transition-colors"
                    >
                        {/* Import Save icon or use text */}
                        <span>Save</span>
                    </button>
                </div>
                <div className="flex-1 overflow-hidden">
                    <CodeEditor
                        initialContent={editorContent || ''}
                        language={ext}
                        onChange={(val) => setEditorContent(val)}
                        onSave={() => editorContent !== null && handleSave(editorContent)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-background/50 items-center justify-center p-8 text-center animate-in fade-in zoom-in-95">
            <div className="w-24 h-24 bg-accent/10 rounded-3xl flex items-center justify-center mb-6 ring-4 ring-accent/5">
                <Download className="w-10 h-10 text-accent" />
            </div>

            <h2 className="text-2xl font-semibold text-white mb-2">{file.name}</h2>
            <p className="text-foreground/50 mb-8 max-w-md">
                This file type is not supported for preview or editing yet.
            </p>

            <button
                onClick={() => onDownload(file)}
                className="flex items-center space-x-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl transition-all shadow-lg shadow-accent/20 font-medium"
            >
                <Download className="w-5 h-5" />
                <span>Download File</span>
            </button>
        </div>
    );
}


