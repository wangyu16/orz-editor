'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { ExplorerItem as IExplorerItem } from '@/lib/types';
import { ExplorerItem } from './ExplorerItem';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface FileTreeProps {
    parentId?: string | null;
    level?: number;
    selectedIds: Set<string>;
    onSelect: (item: IExplorerItem, multi: boolean, range: boolean) => void;
    onOpen: (item: IExplorerItem) => void;
    onContextMenu: (e: React.MouseEvent, item: IExplorerItem) => void;
    onDragStart: (e: React.DragEvent, item: IExplorerItem) => void;
    onDragOver: (e: React.DragEvent, item: IExplorerItem) => void;
    onDrop: (e: React.DragEvent, item: IExplorerItem) => void;
    // Guest mode support
    items?: IExplorerItem[];
}

export function FileTree({
    parentId = null,
    level = 0,
    selectedIds,
    onSelect,
    onOpen,
    onContextMenu,
    onDragStart,
    onDragOver,
    onDrop,
    items: propItems
}: FileTreeProps) {
    const { data: fetchedItems, error } = useSWR<IExplorerItem[]>(
        !propItems ? `/api/tree?parentId=${parentId}` : null,
        fetcher
    );

    const items = propItems
        ? propItems.filter(i => (i.kind === 'folder' ? i.parent_id : i.folder_id) === parentId && !i.is_deleted)
        : fetchedItems;

    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    const toggleFolder = (item: IExplorerItem) => {
        if (item.kind === 'folder') {
            setExpandedFolders(prev => ({
                ...prev,
                [item.id]: !prev[item.id]
            }));
        }
    };

    if (!propItems && error) return <div className="px-4 py-2 text-xs text-red-500">Error loading files</div>;
    if (!items) return null;

    return (
        <div className="flex flex-col">
            {items.map((item) => (
                <React.Fragment key={item.id}>
                    <ExplorerItem
                        item={item}
                        level={level}
                        isSelected={selectedIds.has(item.id)}
                        onSelect={onSelect}
                        onOpen={onOpen}
                        onToggleExpand={toggleFolder}
                        isExpanded={!!expandedFolders[item.id]}
                        onContextMenu={onContextMenu}
                        onDragStart={onDragStart}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                    />
                    {item.kind === 'folder' && expandedFolders[item.id] && (
                        <FileTree
                            parentId={item.id}
                            level={level + 1}
                            selectedIds={selectedIds}
                            onSelect={onSelect}
                            onOpen={onOpen}
                            onContextMenu={onContextMenu}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            items={propItems}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}
