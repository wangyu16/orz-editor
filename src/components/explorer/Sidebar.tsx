'use client';

import React, { useState } from 'react';
import { Upload, Trash2, Search, ArrowLeft, FolderPlus, FilePlus } from 'lucide-react';
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
        <div className={cn("flex flex-col bg-sidebar pt-4 transition-all duration-300", className)}>
            <div className="px-4 pb-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-[var(--surface-raised)]">
                            <Logo className="h-7 w-auto" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-foreground/45">
                                {isGuest ? 'Local session' : 'Cloud workspace'}
                            </p>
                            <h2 className="truncate text-base font-semibold text-foreground">ORZ Editor</h2>
                        </div>
                    </div>

                    <span className="app-badge shrink-0">{isGuest ? 'Guest' : 'Signed in'}</span>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-foreground/62">
                    Markdown, code, and media previews collected into one focused editing workspace.
                </p>
            </div>

            <div className="border-y border-border/70 px-4 py-4">
                {isTrashView ? (
                    <button
                        onClick={onToggleTrash}
                        className="app-button-secondary w-full"
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

                        <div className="mb-4">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/42">
                                    Quick actions
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={onNewFolder}
                                    className="app-button-secondary flex-col gap-1 px-0 py-2.5"
                                    title="New Folder"
                                >
                                    <FolderPlus className="w-4 h-4" />
                                    <span className="text-[11px] font-semibold">Folder</span>
                                </button>

                                <div className="relative">
                                    <button
                                        onClick={() => setShowFileMenu(!showFileMenu)}
                                        className={cn(
                                            "app-button-primary w-full flex-col gap-1 px-0 py-2.5",
                                            showFileMenu && "brightness-105"
                                        )}
                                        title="New File"
                                    >
                                        <FilePlus className="w-4 h-4" />
                                        <span className="text-[11px] font-semibold">File</span>
                                    </button>
                                    {showFileMenu && (
                                        <div className="app-panel absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl py-1">
                                            <div className="px-3 pb-2 pt-3">
                                                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/42">
                                                    Create file
                                                </span>
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
                                                    className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm text-foreground/78 transition-colors hover:bg-[var(--hover)] hover:text-foreground"
                                                >
                                                    <span className="w-8 text-right font-mono text-[11px] font-semibold text-accent/80">.{type}</span>
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
                                    className="app-button-secondary flex-col gap-1 px-0 py-2.5"
                                    title="Upload File"
                                >
                                    <Upload className="w-4 h-4" />
                                    <span className="text-[11px] font-semibold">Upload</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/42">
                                    Search library
                                </span>
                                {searchQuery?.trim() && (
                                    <span className="text-xs text-foreground/45">
                                        {searchResults?.length ?? 0} result{searchResults?.length === 1 ? '' : 's'}
                                    </span>
                                )}
                            </div>

                            <div className="group relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/38 transition-colors group-focus-within:text-accent" />
                                <input
                                    type="text"
                                    placeholder="Search files and folders"
                                    onChange={(e) => onSearch(e.target.value)}
                                    className="app-input pl-10 pr-3 text-sm"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div
                className={cn(
                    "flex-grow overflow-y-auto scrollbar-hide px-2 py-3",
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
                    className="mb-3 cursor-pointer rounded-xl border border-transparent px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/36 transition-colors hover:border-border hover:bg-[var(--surface-muted)] hover:text-foreground/70"
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
                                <div className="px-4 py-10 text-center text-sm text-foreground/40">
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

            <div className="border-t border-border/70 p-4">
                <button
                    onClick={onToggleTrash}
                    className={cn(
                        "w-full justify-between",
                        "app-button-ghost",
                        isTrashView && "!border !border-[color:var(--danger)]/35 !bg-[var(--danger-soft)] !text-[color:var(--danger)]"
                    )}
                >
                    <span className="flex items-center gap-3">
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Trash bin</span>
                    </span>
                    <ArrowLeft className={cn("h-4 w-4 transition-transform", isTrashView && "rotate-180")} />
                </button>

                {!isGuest && user && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-[var(--surface-muted)] px-3 py-3">
                        <div className="flex min-w-0 items-center gap-3 truncate">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-[oklch(23%_0.03_145)]">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/40">Account</p>
                                <p className="truncate text-sm text-foreground/72">{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={onSignOut}
                            aria-label="Sign out"
                            className="app-icon-button h-10 w-10 min-h-10 min-w-10 rounded-xl"
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
