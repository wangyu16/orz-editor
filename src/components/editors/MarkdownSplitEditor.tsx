import React, { useState, useEffect } from 'react';
import { ExplorerItem } from '@/lib/types';
import { CodeEditor } from './CodeEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { MarkdownSettingsModal } from './MarkdownSettingsModal';
import { MarkdownAPI, ThemeComposition } from '@/lib/markdown-api';
import { SettingsAPI } from '@/lib/settings-api';
import { Save, Columns, Eye, FileCode, Settings, Image as ImageIcon, Loader2, History, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { EditorView } from '@codemirror/view';
import { useFileVersions } from '@/hooks/useFileVersions';
import { HistoryModal } from './HistoryModal';


interface MarkdownSplitEditorProps {
    file: ExplorerItem;
    initialContent: string;
    onSave: (content: string) => Promise<void> | void;
    onUpload?: (file: File, folderId: string | null) => Promise<any>;
    onCreateFolder?: (name: string, parentId: string | null) => Promise<any>;
    onResolveImage?: (path: string) => Promise<string | undefined>;
    onFindItem?: (name: string, parentId: string | null, kind: 'folder' | 'file') => Promise<any>;
    isGuest?: boolean;
}

type Mode = 'editor' | 'split' | 'preview';
type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export function MarkdownSplitEditor({ file, initialContent, onSave, onUpload, onCreateFolder, onResolveImage, onFindItem, isGuest }: MarkdownSplitEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [mode, setMode] = useState<Mode>('split');
    const [splitRatio, setSplitRatio] = useState(50);
    // Combine isDirty logic into saveStatus maybe? kept simple for now
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [isDragging, setIsDragging] = useState(false);
    const [settings, setSettings] = useState<ThemeComposition | undefined>(undefined);
    const [showSettings, setShowSettings] = useState(false);
    const [editorView, setEditorView] = useState<EditorView | null>(null);
    const [uploadingImg, setUploadingImg] = useState(false);
    const [syncScroll, setSyncScroll] = useState(true);
    const [previewScrollPct, setPreviewScrollPct] = useState<number | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Versions Hook
    const { createVersion, versions, loading: loadingVersions } = useFileVersions(file, isGuest || false);

    // Refs for loop protection
    const isScrollingEditor = React.useRef(false);
    const isScrollingPreview = React.useRef(false);

    // Ref for content to access in cleanup
    const contentRef = React.useRef(content);
    const lastSavedContentRef = React.useRef(initialContent);

    useEffect(() => {
        contentRef.current = content;
    }, [content]);

    // Load Settings (Persistence)
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    useEffect(() => {
        if (!file || isGuest) {
            setSettingsLoaded(true);
            return;
        }

        let mounted = true;
        const initSettings = async () => {
            try {
                // 1. Check for specific association
                const presetName = await SettingsAPI.getAssociation(file.id);
                if (presetName) {
                    const preset = await SettingsAPI.loadSettings(presetName);
                    if (preset && mounted) {
                        setSettings(preset.theme);
                        setSettingsLoaded(true);
                        return;
                    }
                }

                // 2. Fallback to default
                const defaultPreset = await SettingsAPI.loadSettings('default');
                if (defaultPreset && mounted) {
                    setSettings(defaultPreset.theme);
                }
            } catch (err) {
                console.error("Failed to init settings", err);
            } finally {
                if (mounted) setSettingsLoaded(true);
            }
        };
        initSettings();
        return () => { mounted = false; };
    }, [file.id, isGuest]);

    // File Close Versioning (Unmount)
    useEffect(() => {
        return () => {
            if (contentRef.current && contentRef.current !== lastSavedContentRef.current) {
                // Only create version if content changed since last save/open
                createVersion(contentRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleApplySettings = async (newSettings: ThemeComposition, presetName?: string) => {
        setSettings(newSettings);
        if (presetName && !isGuest) {
            // Save association
            try {
                await SettingsAPI.saveAssociation(file.id, presetName);
            } catch (e) {
                console.error("Failed to save association", e);
            }
        }
    };

    // Auto-Save Effect
    useEffect(() => {
        if (!onSave) return;
        const timeout = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                // Auto-save: Update file content but DO NOT create a version history
                // and do NOT update lastSavedContentRef (because we want "Last Closed" to capture this state as a version if we close now)
                await onSave(content);
                setSaveStatus('saved');
            } catch (err) {
                console.error("Auto-save failed", err);
                setSaveStatus('error');
            }
        }, 2000); // 2s debounce

        return () => clearTimeout(timeout);
    }, [content, onSave]);

    // Handlers
    const handleEditorScroll = React.useCallback((pct: number) => {
        if (!syncScroll) return;
        if (isScrollingEditor.current) {
            isScrollingEditor.current = false;
            return;
        }

        isScrollingPreview.current = true;
        setPreviewScrollPct(pct);
    }, [syncScroll]);

    const handlePreviewScroll = React.useCallback((pct: number) => {
        if (!syncScroll || !editorView) return;

        // Prevent loop if we just scrolled the preview from editor
        if (isScrollingPreview.current) {
            isScrollingPreview.current = false;
            return;
        }

        isScrollingEditor.current = true;

        const scrollDOM = editorView.scrollDOM;
        const maxScroll = scrollDOM.scrollHeight - scrollDOM.clientHeight;
        scrollDOM.scrollTop = pct * maxScroll;
    }, [syncScroll, editorView]);

    const handleChange = (val: string) => {
        setContent(val);
        // Status updates in useEffect
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !editorView || !onUpload) {
            if (!onUpload) alert("Upload functionality not available.");
            return;
        }
        const fileObj = e.target.files[0];
        setUploadingImg(true);

        try {
            const supabase = createClient();

            // 1. Ensure `_img` folder exists
            const parentId = file.kind === 'file' ? file.folder_id : file.parent_id;
            let imgFolderId: string | null = null;

            // Try to find existing folder
            if (onFindItem) {
                const existing = await onFindItem('_img', parentId, 'folder');
                if (existing) imgFolderId = existing.id;
            } else if (!isGuest) {
                // Fallback for Auth without onFindItem (legacy safety)
                let query = supabase.from('folders').select('id').eq('name', '_img').eq('is_deleted', false);
                if (parentId) query = query.eq('parent_id', parentId);
                else query = query.is('parent_id', null);
                const { data: existing } = await query.single();
                imgFolderId = existing?.id || null;
            }

            if (!imgFolderId && onCreateFolder) {
                const newDesc = await onCreateFolder('_img', parentId);
                if (newDesc) imgFolderId = newDesc.id;
            }

            if (!imgFolderId) throw new Error("Failed to resolve _img folder");

            // 2. Upload using delegated method
            const uploadedFile = await onUpload(fileObj, imgFolderId!);
            if (!uploadedFile) throw new Error("Upload failed");

            const finalName = uploadedFile.name; // Logic might rename it

            // 4. Insert Markdown
            const relPath = `_img/${finalName}`;
            const md = `![${finalName}](${relPath})`;

            const tr = editorView.state.update({
                changes: { from: editorView.state.selection.main.head, insert: md }
            });
            editorView.dispatch(tr);

        } catch (error: any) {
            console.error(error);
            alert('Failed to upload image: ' + error.message);
        } finally {
            setUploadingImg(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleManualSave = async () => {
        setSaveStatus('saving');
        try {
            await onSave(content);
            // Create version on manual save
            await createVersion(content);
            lastSavedContentRef.current = content; // Update reference so we don't save duplicate on close
            setSaveStatus('saved');
        } catch (err) {
            console.error("Manual save failed:", err);
            setSaveStatus('error');
            alert("Failed to save. Check your connection or login status.");
        }
    };

    const handleExport = async () => {
        try {
            // 1. Compile Markdown
            let html = await MarkdownAPI.parse(content, { enableMath: true });

            // 2. Resolve Images (Best Effort)
            const regex = /src="((?!http:\/\/|https:\/\/|\/|data:).+?)"/g;
            if (html && (onResolveImage || !isGuest)) {
                const matches = Array.from(html.matchAll(regex));
                if (matches.length > 0) {
                    const replacements = await Promise.all(matches.map(async (m: RegExpMatchArray) => {
                        const original = m[0];
                        const path = m[1];
                        let resolved = undefined;
                        if (onResolveImage) resolved = await onResolveImage(path);
                        else if (file) resolved = `/api/files/${file.id}/resolve/${path}`;
                        return { original, replacement: resolved ? `src="${resolved}"` : original };
                    }));
                    replacements.forEach(({ original, replacement }) => {
                        html = html.replace(original, replacement);
                    });
                }
            }

            // 3. Generate CSS
            const themeToLoad = settings || {
                colors: 'dark-default',
                fonts: 'modern',
                sizing: 'default',
                elements: 'rounded',
                decorations: 'clean',
                layout: 'default',
                prism: 'tomorrow-night',
                includeLayout: true
            } as ThemeComposition; // Cast as we constructed a default
            const css = await MarkdownAPI.composeTheme(themeToLoad);

            // 4. Bundle HTML
            const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${file.name}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
    <style>
        body { margin: 0; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        ${css}
        /* Override Heading Colors to use the Theme's Accent/Decoration Color */
        h1, h2, h3, h4, h5, h6 {
            color: var(--decoration-color, var(--text-color));
        }
        /* Make links use the link color */
        a { color: var(--link-color); text-decoration: none; }
        a:hover { color: var(--link-hover); text-decoration: underline; }
    </style>
</head>
<body>
    <div id="root">
        ${html}
    </div>
    <!-- Prism Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-typescript.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-css.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markup.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markdown.min.js"></script>
    <script>
        // Trigger Highlight
        document.addEventListener('DOMContentLoaded', () => {
             if (window.Prism) window.Prism.highlightAll();
        });
    </script>
</body>
</html>`;

            // 5. Download
            const blob = new Blob([fullHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name.endsWith('.md') ? file.name.replace('.md', '.html') : `${file.name}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (e) {
            console.error("Export failed", e);
            alert("Export failed: " + (e as any).message);
        }
    };

    // ...

    return (
        <div className="flex flex-col h-full w-full">
            <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
                <div className="flex items-center space-x-3">
                    {/* Settings */}
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        title="Markdown Settings"
                    >
                        <Settings className="w-4 h-4" />
                    </button>

                    <div className="w-px h-4 bg-zinc-800" />

                    {/* Mode Buttons */}
                    <div className="flex items-center space-x-1">
                        <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mr-2">Mode</span>
                        <button
                            onClick={() => setMode('editor')}
                            className={`p-1.5 rounded hover:bg-zinc-800 ${mode === 'editor' ? 'text-accent bg-zinc-800' : 'text-zinc-400'}`}
                            title="Editor Only"
                        >
                            <FileCode className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setMode('split')}
                            className={`p-1.5 rounded hover:bg-zinc-800 ${mode === 'split' ? 'text-accent bg-zinc-800' : 'text-zinc-400'}`}
                            title="Split View"
                        >
                            <Columns className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setMode('preview')}
                            className={`p-1.5 rounded hover:bg-zinc-800 ${mode === 'preview' ? 'text-accent bg-zinc-800' : 'text-zinc-400'}`}
                            title="Preview Only"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="w-px h-4 bg-zinc-800" />

                    {/* Insert Image */}
                    {(mode === 'editor' || mode === 'split') && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                                accept="image/*"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                title="Insert Image"
                                disabled={uploadingImg}
                            >
                                {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            </button>
                        </>
                    )}

                    {/* History Button (Before Sync) */}
                    <button
                        onClick={() => setShowHistory(true)}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors ml-1"
                        title="Version History"
                    >
                        <History className="w-4 h-4" />
                    </button>

                    {/* Sync Scroll Toggle */}
                    {(mode === 'split') && (
                        <div className="flex items-center space-x-2 pl-2 group cursor-pointer" onClick={() => setSyncScroll(!syncScroll)} title="Sync Scrolling">
                            <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ease-in-out ${syncScroll ? 'bg-emerald-500' : 'bg-zinc-600'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 shadow-sm ${syncScroll ? 'left-[calc(100%-14px)]' : 'left-0.5'}`} />
                            </div>
                            <span className={`text-xs ${syncScroll ? 'text-zinc-300' : 'text-zinc-500'} transition-colors`}>Sync</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-3">
                    {/* ... (Save Status) */}
                    <div className="flex items-center space-x-1.5 min-w-[80px] justify-end">
                        {saveStatus === 'saving' && (
                            <>
                                <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />
                                <span className="text-xs text-zinc-500">Saving...</span>
                            </>
                        )}
                        {saveStatus === 'unsaved' && (
                            <span className="text-xs text-zinc-500">Unsaved</span>
                        )}
                        {saveStatus === 'saved' && (
                            <span className="text-xs text-emerald-500 flex items-center">
                                Saved
                            </span>
                        )}
                        {saveStatus === 'error' && (
                            <span className="text-xs text-red-500 flex items-center" title="Failed to save. Check console.">
                                Save Failed
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center space-x-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition-colors mr-2"
                        title="Export as HTML"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export</span>
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

            <div className="flex-1 flex overflow-hidden relative">
                <div
                    className={`${mode === 'preview' ? 'hidden' : 'block'} h-full bg-zinc-950`}
                    style={{
                        width: mode === 'split' ? `${splitRatio}%` : '100%',
                        pointerEvents: isDragging ? 'none' : 'auto'
                    }}
                >
                    <CodeEditor
                        initialContent={content}
                        language="markdown"
                        onChange={handleChange}
                        onSave={handleManualSave}
                        onEditorCreate={setEditorView}
                        onScroll={handleEditorScroll}
                    />
                </div>

                {/* ... (Split Dragger) */}
                {mode === 'split' && (
                    <div
                        className={`w-1 bg-zinc-800 hover:bg-accent cursor-col-resize z-10 transition-colors ${isDragging ? 'bg-accent' : ''}`}
                        onMouseDown={(e) => {
                            // ... (drag logic)
                            e.preventDefault();
                            setIsDragging(true);
                            const startX = e.clientX;
                            const parent = e.currentTarget.parentElement;
                            if (!parent) return;
                            const startWidth = parent.offsetWidth * (splitRatio / 100);
                            const totalWidth = parent.offsetWidth;

                            const onMouseMove = (moveEvent: MouseEvent) => {
                                const delta = moveEvent.clientX - startX;
                                const newRatio = ((startWidth + delta) / totalWidth) * 100;
                                setSplitRatio(Math.max(10, Math.min(90, newRatio)));
                            };

                            const onMouseUp = () => {
                                setIsDragging(false);
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUp);
                            };

                            document.addEventListener('mousemove', onMouseMove);
                            document.addEventListener('mouseup', onMouseUp);
                        }}
                    />
                )}


                <div
                    className={`${mode === 'editor' ? 'hidden' : 'block'} h-full bg-zinc-950 border-l border-zinc-800 relative`}
                    style={{
                        width: mode === 'split' ? `${100 - splitRatio}%` : '100%',
                        pointerEvents: isDragging ? 'none' : 'auto'
                    }}
                >
                    {!settingsLoaded ? (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            <span className="text-xs">Loading styles...</span>
                        </div>
                    ) : (
                        <MarkdownPreview
                            content={content}
                            settings={settings}
                            fileId={file.id}
                            resolveImage={onResolveImage}
                            onScroll={handlePreviewScroll}
                            scrollPercentage={previewScrollPct}
                        />
                    )}
                </div>
            </div>


            {showHistory && (
                <HistoryModal
                    versions={versions}
                    loading={loadingVersions}
                    onClose={() => setShowHistory(false)}
                    onRestore={(v) => {
                        setContent(v.content);
                        // Maybe auto-save the restored version as current?
                        // For now, it just loads into editor.
                    }}
                />
            )}

            {showSettings && (
                <MarkdownSettingsModal
                    currentSettings={settings}
                    onClose={() => setShowSettings(false)}
                    onApply={handleApplySettings}
                />
            )}
        </div>
    );
}
