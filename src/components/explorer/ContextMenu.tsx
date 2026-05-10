'use client';

import React, { useEffect, useRef } from 'react';
import {
    Pencil,
    Trash2,
    Copy,
    ArrowRight,
    ExternalLink,
    Download,
    FolderPlus,
    FilePlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    options: {
        label: string;
        icon: React.ElementType;
        onClick: () => void;
        destructive?: boolean;
        disabled?: boolean;
    }[];
}

export function ContextMenu({ x, y, onClose, options }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            role="menu"
            className="app-panel fixed z-50 w-60 overflow-hidden rounded-2xl py-1.5 animate-in fade-in zoom-in-95"
            style={{ left: x, top: y }}
        >
            {options.map((option, index) => (
                <button
                    key={index}
                    onClick={(e) => {
                        e.stopPropagation();
                        option.onClick();
                        onClose();
                    }}
                    disabled={option.disabled}
                    className={cn(
                        "flex min-h-11 w-full items-center gap-3 px-3 py-2 text-sm transition-colors",
                        option.destructive
                            ? "text-[color:var(--danger)] hover:bg-[var(--danger-soft)]"
                            : "text-foreground/80 hover:bg-[var(--hover)] hover:text-foreground",
                        option.disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <option.icon className="h-4 w-4 opacity-70" />
                    <span className="flex-grow text-left">{option.label}</span>
                </button>
            ))}
        </div>
    );
}
