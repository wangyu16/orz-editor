
import React, { useState, useEffect } from 'react';
import { X, Pin, Check } from 'lucide-react';
import { ORZ_THEMES } from '@/lib/markdown-api';
import { SettingsAPI } from '@/lib/settings-api';
import { MarkdownPreview } from './MarkdownPreview';

interface ThemeSelectorModalProps {
    onClose: () => void;
    onApply: (themeName: string) => void;
    currentTheme?: string;
    fileId?: string;
}

const THEME_LABELS: Record<string, string> = {
    'dark-elegant-1': 'Dark Elegant I',
    'dark-elegant-2': 'Dark Elegant II',
    'light-academic-1': 'Light Academic I',
    'light-academic-2': 'Light Academic II',
    'light-neat-1': 'Light Neat I',
    'light-neat-2': 'Light Neat II',
    'light-playful-1': 'Light Playful I',
    'light-playful-2': 'Light Playful II',
    'beige-decent-1': 'Beige Decent I',
    'beige-decent-2': 'Beige Decent II',
};

const PREVIEW_CONTENT = `# Sample Title

Here is some **bold** text and *italic* text with a [link](#).

## Code Block

\`\`\`javascript
function hello() {
  console.log("Hello World");
}
\`\`\`

> This is a blockquote.

- Item 1
- Item 2

$E = mc^2$
`;

export function MarkdownSettingsModal({ onClose, onApply, currentTheme, fileId }: ThemeSelectorModalProps) {
    const [selected, setSelected] = useState<string>(currentTheme || 'dark-elegant-1');
    const [pinStatus, setPinStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Sync if currentTheme changes
    useEffect(() => {
        if (currentTheme) setSelected(currentTheme);
    }, [currentTheme]);

    const handlePin = async () => {
        setPinStatus('saving');
        try {
            await SettingsAPI.setDefaultTheme(selected);
            setPinStatus('saved');
            setTimeout(() => setPinStatus('idle'), 2000);
        } catch (err) {
            console.error('Failed to pin default theme', err);
            setPinStatus('idle');
        }
    };

    const handleApply = () => {
        onApply(selected);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-zinc-900 w-[90vw] h-[90vh] max-w-6xl rounded-xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
                    <h2 className="text-xl font-bold text-white">Theme</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Theme List */}
                    <div className="w-72 bg-zinc-950 border-r border-zinc-800 p-4 overflow-y-auto flex flex-col gap-3">
                        <p className="text-xs uppercase text-zinc-500 font-bold tracking-wider mb-1">Built-in Themes</p>
                        {ORZ_THEMES.map((theme) => (
                            <button
                                key={theme}
                                onClick={() => setSelected(theme)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors border ${
                                    selected === theme
                                        ? 'bg-accent/10 border-accent text-white'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                                }`}
                            >
                                {THEME_LABELS[theme] || theme}
                            </button>
                        ))}

                        <div className="mt-auto pt-4 border-t border-zinc-800">
                            <button
                                onClick={handlePin}
                                disabled={pinStatus === 'saving'}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
                                title="Set as default theme for new files"
                            >
                                {pinStatus === 'saved'
                                    ? <><Check className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Pinned as Default</span></>
                                    : <><Pin className="w-4 h-4" /><span>Pin as Default</span></>
                                }
                            </button>
                            <p className="text-[10px] text-zinc-600 mt-1.5 text-center">
                                Applies to files without a specific theme
                            </p>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="flex-1 bg-zinc-900 p-6 flex flex-col overflow-hidden">
                        <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-semibold">Preview</div>
                        <div className="flex-1 border border-zinc-800 rounded-lg overflow-hidden bg-black shadow-inner">
                            <MarkdownPreview content={PREVIEW_CONTENT} themeName={selected} />
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApply}
                                className="bg-white text-black px-6 py-2 rounded font-semibold hover:bg-zinc-200 transition-colors"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
