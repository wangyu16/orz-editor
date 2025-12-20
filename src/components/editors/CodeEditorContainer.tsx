import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExplorerItem } from '@/lib/types';
import { CodeEditor } from './CodeEditor';
import { useFileVersions } from '@/hooks/useFileVersions';
import { HistoryModal } from './HistoryModal';
import { Loader2, History, Save } from 'lucide-react';
import { format } from 'date-fns';

interface CodeEditorContainerProps {
    file: ExplorerItem;
    initialContent: string;
    onSave: (content: string) => Promise<void>;
    isGuest: boolean;
}

export function CodeEditorContainer({ file, initialContent, onSave, isGuest }: CodeEditorContainerProps) {
    const [content, setContent] = useState(initialContent);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [showHistory, setShowHistory] = useState(false);

    const { versions, loading: loadingVersions, createVersion } = useFileVersions(file, isGuest);

    // Refs for safe access in timeouts/cleanup
    const contentRef = useRef(content);
    const lastSavedContentRef = useRef(initialContent);

    // Update ref when content changes
    useEffect(() => {
        contentRef.current = content;
    }, [content]);

    // Initial load
    useEffect(() => {
        setContent(initialContent);
        lastSavedContentRef.current = initialContent;
    }, [initialContent, file.id]);

    // File Close Versioning (Unmount)
    useEffect(() => {
        return () => {
            if (contentRef.current && contentRef.current !== lastSavedContentRef.current) {
                createVersion(contentRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file.id]); // Re-run if file changes (simulated unmount)

    // Auto-Save Effect
    useEffect(() => {
        if (content === lastSavedContentRef.current) return;

        const timeout = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                await onSave(content);
                setSaveStatus('saved');
                // Don't update lastSavedContentRef here if we want "Close" to trigger a version,
                // BUT for simple text editor it's often better to treat auto-save as "save".
                // However, per user request for "Version Control", we usually snapshot explicit saves or closes.
                // We'll mimic MarkdownSplitEditor strategy:
                // Auto-save persists to disk but doesn't create a "Version" entry.
            } catch (err) {
                console.error("Auto-save failed", err);
                setSaveStatus('error');
            }
        }, 2000);

        return () => clearTimeout(timeout);
    }, [content, onSave]);

    // Manual Save Handler
    const handleManualSave = async () => {
        setSaveStatus('saving');
        try {
            await onSave(content);
            await createVersion(content);
            lastSavedContentRef.current = content;
            setSaveStatus('saved');
        } catch (err) {
            console.error("Manual save failed:", err);
            setSaveStatus('error');
        }
    };

    const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';

    return (
        <div className="h-full w-full bg-zinc-950 flex flex-col">
            {/* Toolbar */}
            <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center space-x-2 text-xs text-zinc-400">
                    <span className="font-medium text-zinc-300">{file.name}</span>
                    {saveStatus === 'saving' && <span className="opacity-70 flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1" /> Saving...</span>}
                    {saveStatus === 'error' && <span className="text-red-400">Save Failed</span>}
                    {saveStatus === 'saved' && <span className="opacity-50">Saved</span>}
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowHistory(true)}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        title="Version History"
                    >
                        <History className="w-4 h-4" />
                    </button>

                    <button
                        onClick={handleManualSave}
                        className="flex items-center space-x-1.5 text-xs bg-accent hover:bg-accent/90 text-white px-3 py-1.5 rounded transition-colors"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save</span>
                    </button>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden relative">
                <CodeEditor
                    initialContent={content}
                    language={ext}
                    onChange={setContent}
                    onSave={handleManualSave}
                />
            </div>

            {/* History Modal */}
            {showHistory && (
                <HistoryModal
                    versions={versions}
                    loading={loadingVersions}
                    onClose={() => setShowHistory(false)}
                    onRestore={(v) => {
                        setContent(v.content);
                        // Optional: trigger immediate save
                        setShowHistory(false);
                    }}
                />
            )}
        </div>
    );
}
