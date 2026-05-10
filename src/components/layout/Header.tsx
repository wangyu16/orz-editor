import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
    title: React.ReactNode;
    isSidebarOpen: boolean;
    onToggleSidebar: () => void;
    children?: React.ReactNode;
    className?: string;
}

export function Header({ title, isSidebarOpen, onToggleSidebar, children, className }: HeaderProps) {
    return (
        <header
            className={cn(
                "h-16 shrink-0 border-b border-border/80 bg-[var(--surface-raised)] px-3 sm:px-5",
                "flex items-center gap-3",
                className
            )}
        >
            <button
                onClick={onToggleSidebar}
                aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                className="app-icon-button"
            >
                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>

            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-foreground/45">Workspace</p>
                <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
                    {title ?? 'ORZ Editor'}
                </h1>
            </div>

            <div className="flex items-center gap-2">
                {children}
            </div>
        </header>
    );
}
