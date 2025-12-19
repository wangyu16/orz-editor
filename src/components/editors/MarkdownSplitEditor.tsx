import React, { useState, useEffect } from 'react';
import { ExplorerItem } from '@/lib/types';
import { CodeEditor } from './CodeEditor';
import { IsolatedPreview } from './IsolatedPreview';
import { Save, Columns, Eye, FileCode } from 'lucide-react';

interface MarkdownSplitEditorProps {
    file: ExplorerItem;
    initialContent: string;
    onSave: (content: string) => void;
}

type Mode = 'editor' | 'split' | 'preview';

export function MarkdownSplitEditor({ file, initialContent, onSave }: MarkdownSplitEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [mode, setMode] = useState<Mode>('split');
    const [splitRatio, setSplitRatio] = useState(50);
    const [isDirty, setIsDirty] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        setContent(initialContent);
        setIsDirty(false);
    }, [initialContent]);

    const handleSave = () => {
        onSave(content);
        setIsDirty(false);
    };

    const handleChange = (val: string) => {
        setContent(val);
        setIsDirty(true);
    };

    return (
        <div className="flex flex-col h-full w-full">
            <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
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

                <div className="flex items-center space-x-4">
                    {isDirty && <span className="text-xs text-amber-500 font-medium">Unsaved Changes</span>}
                    <button
                        onClick={handleSave}
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
                        onSave={handleSave}
                    />
                </div>

                {mode === 'split' && (
                    <div
                        className={`w-1 bg-zinc-800 hover:bg-accent cursor-col-resize z-10 transition-colors ${isDragging ? 'bg-accent' : ''}`}
                        onMouseDown={(e) => {
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
                    className={`${mode === 'editor' ? 'hidden' : 'block'} h-full bg-zinc-950 border-l border-zinc-800`}
                    style={{
                        width: mode === 'split' ? `${100 - splitRatio}%` : '100%',
                        pointerEvents: isDragging ? 'none' : 'auto'
                    }}
                >
                    <IsolatedPreview content={content} />
                </div>
            </div>
        </div>
    );
}
