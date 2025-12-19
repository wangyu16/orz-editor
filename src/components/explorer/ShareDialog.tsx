import React, { useState, useEffect } from 'react';
import { Loader2, Copy, Check, ExternalLink, FileText, Code } from 'lucide-react';
import { ExplorerItem } from '@/lib/types';

interface ShareDialogProps {
    item: ExplorerItem;
    isOpen: boolean;
    onClose: () => void;
}

export function ShareDialog({ item, isOpen, onClose }: ShareDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
    const [rawUrl, setRawUrl] = useState<string | null>(null);
    const [copiedRendered, setCopiedRendered] = useState(false);
    const [copiedRaw, setCopiedRaw] = useState(false);

    useEffect(() => {
        if (isOpen && item) {
            generateShareLink();
        }
    }, [isOpen, item]);

    const generateShareLink = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/files/${item.id}/share`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to generate share link');
            const data = await res.json();
            setRenderedUrl(data.renderedUrl);
            setRawUrl(data.rawUrl);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string, isRaw: boolean) => {
        try {
            await navigator.clipboard.writeText(text);
            if (isRaw) {
                setCopiedRaw(true);
                setTimeout(() => setCopiedRaw(false), 2000);
            } else {
                setCopiedRendered(true);
                setTimeout(() => setCopiedRendered(false), 2000);
            }
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ExternalLink className="w-5 h-5 text-accent" />
                        Share "{item.name}"
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                {error ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                        {error}
                    </div>
                ) : loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">

                        {/* Rendered Link Section */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                Rendered Check
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={renderedUrl || ''}
                                    className="flex-1 bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono focus:outline-none focus:border-accent"
                                />
                                <button
                                    onClick={() => renderedUrl && copyToClipboard(renderedUrl, false)}
                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors text-zinc-300"
                                    title="Copy Rendered Link"
                                >
                                    {copiedRendered ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-zinc-500">
                                Rich preview for browser viewing.
                            </p>
                        </div>

                        {/* Raw Link Section */}
                        <div className="space-y-2 pt-2 border-t border-zinc-800">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Code className="w-3 h-3" />
                                Raw Content
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={rawUrl || ''}
                                    className="flex-1 bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono focus:outline-none focus:border-accent"
                                />
                                <button
                                    onClick={() => rawUrl && copyToClipboard(rawUrl, true)}
                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors text-zinc-300"
                                    title="Copy Raw Link"
                                >
                                    {copiedRaw ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-zinc-500">
                                Direct download or raw file access.
                            </p>
                        </div>

                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
