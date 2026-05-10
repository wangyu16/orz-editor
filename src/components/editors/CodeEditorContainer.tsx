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
        <div className="flex h-full w-full flex-col bg-[var(--background)]">
            {/* Toolbar */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-[var(--surface-raised)] px-3 sm:px-4">
                <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{file.name}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                        <span className="app-status-pill">{ext} file</span>
                        {saveStatus === 'saving' && (
                            <span className="flex items-center gap-1 text-xs text-foreground/48">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Saving
                            </span>
                        )}
                        {saveStatus === 'error' && <span className="text-xs text-[color:var(--danger)]">Save failed</span>}
                        {saveStatus === 'saved' && <span className="text-xs text-foreground/48">Saved</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHistory(true)}
                        aria-label="Open version history"
                        className="app-icon-button h-10 w-10 min-h-10 min-w-10 rounded-xl"
                        title="Version History"
                    >
                        <History className="w-4 h-4" />
                    </button>

                    <button
                        onClick={handleManualSave}
                        className="app-button-primary px-4"
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
