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
        <header className={cn("h-14 border-b border-border flex items-center px-4 bg-background shrink-0", className)}>
            <button
                onClick={onToggleSidebar}
                className="p-2 hover:bg-zinc-800 rounded-lg text-foreground/50 hover:text-white transition-colors mr-3"
            >
                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>

            <h1 className="text-lg font-medium text-foreground truncate flex-1">
                {title}
            </h1>

            <div className="flex items-center space-x-2">
                {children}
            </div>
        </header>
    );
}
