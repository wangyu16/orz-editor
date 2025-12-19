'use client';

import React, { useState } from 'react';
import {
    Folder,
    File,
    ChevronRight,
    ChevronDown,
    FileText,
    Image as ImageIcon,
    Music,
    Video,
    FileCode,
    FileDigit,
    MoreVertical
} from 'lucide-react';
import { ExplorerItem as IExplorerItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ExplorerItemProps {
    item: IExplorerItem;
    level: number;
    isSelected?: boolean;
    onSelect: (item: IExplorerItem, multi: boolean, range: boolean) => void;
    onOpen?: (item: IExplorerItem) => void;
    onToggleExpand?: (item: IExplorerItem) => void;
    onContextMenu?: (e: React.MouseEvent, item: IExplorerItem) => void;
    onDragStart?: (e: React.DragEvent, item: IExplorerItem) => void;
    onDragOver?: (e: React.DragEvent, item: IExplorerItem) => void;
    onDrop?: (e: React.DragEvent, item: IExplorerItem) => void;
    // Controlled expansion state
    isExpanded?: boolean;
}

export function ExplorerItem({
    item,
    level,
    isSelected,
    onSelect,
    onOpen,
    onToggleExpand,
    onContextMenu,
    onDragStart,
    onDragOver,
    onDrop,
    isExpanded: propIsExpanded
}: ExplorerItemProps) {
    const [localIsExpanded, setLocalIsExpanded] = useState(false);
    const isExpanded = propIsExpanded ?? localIsExpanded;

    const getIcon = () => {
        if (item.kind === 'folder') {
            return <Folder className="w-4 h-4 text-accent fill-current opacity-70" />;
        }

        const ext = item.name.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'txt': case 'md': return <FileText className="w-4 h-4 text-blue-400" />;
            case 'png': case 'jpg': case 'jpeg': case 'gif': return <ImageIcon className="w-4 h-4 text-green-400" />;
            case 'mp3': case 'wav': return <Music className="w-4 h-4 text-purple-400" />;
            case 'mp4': case 'mov': return <Video className="w-4 h-4 text-red-400" />;
            case 'js': case 'ts': case 'py': case 'json': return <FileCode className="w-4 h-4 text-yellow-400" />;
            case 'pdf': return <FileDigit className="w-4 h-4 text-orange-400" />;
            default: return <File className="w-4 h-4 text-gray-400" />;
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const multi = e.ctrlKey || e.metaKey;
        const range = e.shiftKey;
        onSelect(item, multi, range);
    };

    const handleDoubleClick = () => {
        if (item.kind === 'folder') {
            if (propIsExpanded === undefined) {
                setLocalIsExpanded(!localIsExpanded);
            }
            onToggleExpand?.(item);
        } else {
            onOpen?.(item);
        }
    };

    const lastTouchTime = React.useRef<number>(0);

    const handleTouchEnd = (e: React.TouchEvent) => {
        // Allow default scrolling/interaction if not double tap
        // e.preventDefault() here might block scrolling, so be careful.

        const now = Date.now();
        if (now - lastTouchTime.current < 300) {
            // Double tap detected
            e.preventDefault(); // Prevent zoom or other default double-tap actions
            handleDoubleClick();
        }
        lastTouchTime.current = now;
    };

    return (
        <div
            className={cn(
                "group flex items-center px-2 py-1.5 cursor-pointer rounded-md transition-all-200 select-none",
                isSelected ? "bg-accent/20 text-accent" : "hover:bg-hover text-foreground/70 hover:text-foreground"
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onTouchEnd={handleTouchEnd}
            draggable
            onDragStart={(e) => onDragStart?.(e, item)}
            onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDragOver?.(e, item);
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDrop?.(e, item);
            }}
        >
            <div className="w-4 mr-1 flex-shrink-0">
                {item.kind === 'folder' && (
                    <div onClick={(e) => {
                        e.stopPropagation();
                        if (propIsExpanded === undefined) {
                            setLocalIsExpanded(!localIsExpanded);
                        }
                        onToggleExpand?.(item);
                    }}>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                )}
            </div>

            <div className="mr-2 flex-shrink-0">
                {getIcon()}
            </div>

            <span className="truncate text-sm font-medium flex-grow">
                {item.name}
            </span>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    // Just open the context menu here
                    onContextMenu?.(e, item);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
            >
                <MoreVertical className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
