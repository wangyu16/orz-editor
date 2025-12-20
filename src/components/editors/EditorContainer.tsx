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
import { CodeEditorContainer } from './CodeEditorContainer';
import { getCategory } from '@/lib/fileUtils';

interface EditorContainerProps {
    file: ExplorerItem;
    onDownload: (file: ExplorerItem) => void;
    uploadFile?: (file: File, folderId: string | null) => Promise<any>;
    createFolder?: (name: string, parentId: string | null) => Promise<any>;
    resolveLocalPath?: (path: string, contextFileId: string) => Promise<string | undefined>;
    findItem?: (name: string, parentId: string | null, kind: 'folder' | 'file') => Promise<any>;
    saveFile?: (fileId: string, content: string) => Promise<any>;
    isGuest?: boolean;
}

export function EditorContainer({ file, onDownload, uploadFile, createFolder, resolveLocalPath, findItem, saveFile, isGuest }: EditorContainerProps) {
    const { url, loading: urlLoading, error: urlError } = useFileUrl(file);
    const { content, loading: contentLoading, error: contentError } = useFileContent(file);
    // Remove internal useFileSystem hook logic which caused the guest mode bug

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
        if (!file || !saveFile) {
            console.warn("Save functionality not available");
            return;
        }
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
        return (
            <MarkdownSplitEditor
                key={file.id}
                file={file}
                initialContent={content || ''}
                onSave={handleSave}
                onUpload={uploadFile}
                onCreateFolder={createFolder}
                onResolveImage={resolveLocalPath ? async (path) => resolveLocalPath(path, file.id) : undefined}
                onFindItem={findItem}
                isGuest={isGuest}
            />
        );
    }


    // Wait, I can't inject refs easily into the return logic above without valid hook usage.
    // I should create a small wrapper or just manage state here.
    // Using a wrapper inside Render is bad.
    // Let's use `useState` for content edits.

    // ... logic continues below ...




    if (category === 'text_code') {
        return (
            <CodeEditorContainer
                key={file.id}
                file={file}
                initialContent={content || ''}
                onSave={async (val) => handleSave(val)}
                isGuest={!!isGuest}
            />
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


