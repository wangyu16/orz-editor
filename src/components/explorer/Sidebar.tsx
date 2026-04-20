'use client';

import React, { useState } from 'react';
import { Plus, Upload, Trash2, Search, Settings, ArrowLeft, FolderPlus, FilePlus } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { FileTree } from './FileTree';
import { ExplorerItem } from './ExplorerItem';
import { ExplorerItem as IExplorerItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SidebarProps {
    selectedIds: Set<string>;
    isTrashView: boolean;
    onSelect: (item: IExplorerItem, multi: boolean, range: boolean) => void;
    onOpen: (item: IExplorerItem) => void;
    onNewFolder: () => void;
    onCreateFile: (name: string, type: string) => void;
    onUpload: () => void;
    onContextMenu: (e: React.MouseEvent, item: IExplorerItem) => void;
    onDragStart: (e: React.DragEvent, item: IExplorerItem) => void;
    onDragOver: (e: React.DragEvent, item: IExplorerItem) => void;
    onDrop: (e: React.DragEvent, item: IExplorerItem) => void;
    onRootDrop: (e: React.DragEvent) => void;
    onToggleTrash: () => void;
    onSignOut: () => void;
    onClearSelection: () => void;
    onSearch: (query: string) => void;
    isSearching?: boolean;
    searchResults?: IExplorerItem[];
    searchQuery?: string;
    // Guest mode support
    isGuest?: boolean;
    guestItems?: IExplorerItem[];
    user?: any;
}

export function Sidebar({
    selectedIds,
    isTrashView,
    onSelect,
    onOpen,
    onNewFolder,
    onCreateFile,
    onUpload,
    onContextMenu,
    onDragStart,
    onDragOver,
    onDrop,
    onRootDrop,
    onToggleTrash,
    onSignOut,
    onClearSelection,
    onSearch,
    isSearching,
    searchResults,
    searchQuery,
    isGuest,
    guestItems,
    user,
    className
}: SidebarProps & { className?: string }) {
    const [showFileMenu, setShowFileMenu] = useState(false);

    return (
        <div className={cn("bg-sidebar border-r border-border flex flex-col pt-4 transition-all duration-300", className)}>
            <div className="px-4 mb-6 flex items-center justify-between">
                <div className="flex items-center">
                    <Logo className="h-8 w-auto mr-2" />
                    <span className="text-xl font-bold tracking-tight text-white/90">Editor</span>
                </div>
            </div>

            <div className="px-4 mb-4 space-y-2">
                {isTrashView ? (
                    <button
                        onClick={onToggleTrash}
                        className="w-full flex items-center justify-center space-x-2 py-2 bg-hover hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Explorer</span>
                    </button>
                ) : (
                    <>
                        {showFileMenu && (
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowFileMenu(false)}
                            />
                        )}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={onNewFolder}
                                className="flex-1 flex items-center justify-center py-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-md transition-all"
                                title="New Folder"
                            >
                                <FolderPlus className="w-4 h-4" />
                            </button>
                            <div className="relative flex-1">
                                <button
                                    onClick={() => setShowFileMenu(!showFileMenu)}
                                    className={cn(
                                        "w-full flex items-center justify-center py-2 bg-accent hover:bg-accent/90 text-white rounded-md transition-all",
                                        showFileMenu && "bg-accent/90 ring-2 ring-accent/20"
                                    )}
                                    title="New File"
                                >
                                    <FilePlus className="w-4 h-4" />
                                </button>
                                {/* Click-triggered dropdown */}
                                {showFileMenu && (
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="px-3 py-2 border-b border-border mb-1">
                                            <span className="text-[10px] font-bold uppercase text-foreground/40 tracking-wider">Create New File</span>
                                        </div>
                                        {['txt', 'md'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    const promptMsg = type === 'txt'
                                                        ? 'Enter filename (e.g. notes.txt or script.py):'
                                                        : `Enter filename for .${type} file:`;
                                                    const name = prompt(promptMsg);
                                                    if (name) {
                                                        if (type === 'txt') {
                                                            const parts = name.split('.');
                                                            const ext = parts.length > 1 ? parts.pop() : 'txt';
                                                            onCreateFile(name, ext || 'txt');
                                                        } else {
                                                            onCreateFile(name, type);
                                                        }
                                                        setShowFileMenu(false);
                                                    }
                                                }}
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 hover:text-accent transition-colors flex items-center space-x-2 text-foreground"
                                            >
                                                <span className="w-8 font-mono text-accent/70 text-[10px] text-right">.{type}</span>
                                                <span className="font-medium">
                                                    {type === 'txt' ? 'Text / Code' : 'Markdown'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={onUpload}
                                className="flex-1 flex items-center justify-center py-2 bg-hover hover:bg-white/10 text-foreground/70 hover:text-white rounded-md transition-all"
                                title="Upload File"
                            >
                                <Upload className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40 group-focus-within:text-accent transition-colors" />
                            <input
                                type="text"
                                placeholder="Search items..."
                                onChange={(e) => onSearch(e.target.value)}
                                className="w-full bg-background/50 border border-border focus:border-accent/50 focus:ring-1 focus:ring-accent/50 rounded-lg py-1.5 pl-9 pr-3 text-xs outline-none transition-all"
                            />
                        </div>
                    </>
                )}
            </div>

            <div
                className={cn(
                    "flex-grow overflow-y-auto scrollbar-hide px-2",
                    isTrashView && "opacity-50 pointer-events-none"
                )}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!isTrashView) e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                    if (e.target === e.currentTarget) {
                        onRootDrop(e);
                    }
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        onClearSelection();
                    }
                }}
            >
                <div
                    className="mb-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/30 hover:bg-white/5 hover:text-foreground/70 rounded cursor-pointer transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClearSelection();
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onRootDrop}
                    title="Click to select Root / Drop to move to Root"
                >
                    Files & Folders {isGuest && '(Guest)'}
                </div>
                {!isTrashView && (
                    isSearching ? (
                        <div className="flex flex-col">
                            {searchResults?.length === 0 ? (
                                <div className="px-4 py-8 text-center text-xs text-foreground/40">
                                    No results found
                                </div>
                            ) : (
                                searchResults?.map((item) => (
                                    <div key={item.id} onContextMenu={(e) => onContextMenu(e, item)}>
                                        <ExplorerItem
                                            item={item}
                                            level={0}
                                            isSelected={selectedIds.has(item.id)}
                                            onSelect={onSelect}
                                            onOpen={onOpen}
                                            onContextMenu={onContextMenu}
                                            onDragStart={onDragStart}
                                            onDragOver={onDragOver}
                                            onDrop={onDrop}
                                            isExpanded={false}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <FileTree
                            selectedIds={selectedIds}
                            onSelect={onSelect}
                            onOpen={onOpen}
                            onContextMenu={onContextMenu}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            items={isGuest ? guestItems : undefined}
                        />
                    )
                )}
            </div>

            <div className="p-4 border-t border-border flex flex-col space-y-2">
                <button
                    onClick={onToggleTrash}
                    className={cn(
                        "flex items-center space-x-3 w-full p-2 rounded-lg transition-all",
                        isTrashView ? "bg-red-500/20 text-red-400" : "hover:bg-red-500/10 text-foreground/50 hover:text-red-400"
                    )}
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Trash bin</span>
                </button>

                {!isGuest && user && (
                    <div className="pt-2 flex items-center justify-between group">
                        <div className="flex items-center space-x-2 truncate">
                            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <span className="text-xs text-foreground/60 truncate">{user.email}</span>
                        </div>
                        <button
                            onClick={onSignOut}
                            className="p-1.5 hover:bg-white/5 rounded text-foreground/30 hover:text-white transition-all"
                            title="Sign Out"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
