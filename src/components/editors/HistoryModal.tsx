import React, { useState } from 'react';
import { FileVersion } from '@/lib/types';
import { X, Clock, RotateCcw, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface HistoryModalProps {
    versions: FileVersion[];
    onClose: () => void;
    onRestore: (version: FileVersion) => void;
    loading: boolean;
}

export function HistoryModal({ versions, onClose, onRestore, loading }: HistoryModalProps) {
    const [selectedVersion, setSelectedVersion] = useState<FileVersion | null>(null);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[800px] h-[600px] bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50">
                    <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-accent" />
                        <h2 className="font-semibold text-lg text-white">Version History</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar: List */}
                    <div className="w-64 border-r border-zinc-800 bg-zinc-950/50 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-zinc-500 text-sm">Loading history...</div>
                        ) : versions.length === 0 ? (
                            <div className="p-4 text-center text-zinc-500 text-sm">No history found.</div>
                        ) : (
                            <div className="flex flex-col p-2 space-y-1">
                                {versions.map((v, i) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setSelectedVersion(v)}
                                        className={`flex flex-col items-start p-3 rounded-lg text-left transition-all border ${selectedVersion?.id === v.id
                                                ? 'bg-accent/10 border-accent/20'
                                                : 'hover:bg-zinc-900 border-transparent hover:border-zinc-800'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between w-full mb-1">
                                            <span className={`text-sm font-medium ${selectedVersion?.id === v.id ? 'text-accent' : 'text-zinc-200'}`}>
                                                {i === 0 ? 'Latest' : `Version ${versions.length - i}`}
                                            </span>
                                        </div>
                                        <span className="text-xs text-zinc-500">
                                            {format(new Date(v.created_at), 'MMM d, h:mm a')}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main: Preview */}
                    <div className="flex-1 flex flex-col bg-zinc-950">
                        {selectedVersion ? (
                            <>
                                <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/30">
                                    <span className="text-xs text-zinc-500 font-mono">
                                        ID: {selectedVersion.id.substring(0, 8)}...
                                    </span>
                                    <button
                                        onClick={() => {
                                            if (confirm("Are you sure you want to restore this version? Current content will be overwritten.")) {
                                                onRestore(selectedVersion);
                                                onClose();
                                            }
                                        }}
                                        className="flex items-center space-x-2 px-3 py-1 bg-accent/10 hover:bg-accent/20 text-accent rounded text-xs transition-colors border border-accent/20"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Restore Version</span>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-auto p-6">
                                    <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                        {selectedVersion.content}
                                    </pre>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                                <FileText className="w-12 h-12 mb-4 opacity-20" />
                                <p>Select a version to preview</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
