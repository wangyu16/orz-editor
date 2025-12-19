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
            className="fixed z-50 w-56 bg-sidebar/95 backdrop-blur-md border border-border shadow-2xl rounded-xl py-1.5 animate-in fade-in zoom-in-95"
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
                        "w-full flex items-center px-3 py-2 text-sm transition-colors",
                        option.destructive
                            ? "text-red-400 hover:bg-red-500/10"
                            : "text-foreground/80 hover:bg-hover hover:text-white",
                        option.disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <option.icon className="w-4 h-4 mr-3 opacity-70" />
                    <span className="flex-grow text-left">{option.label}</span>
                </button>
            ))}
        </div>
    );
}
