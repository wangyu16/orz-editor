
import React, { useState, useEffect } from 'react';
import { X, Save, Disc, Check } from 'lucide-react';
import { MarkdownAPI, ThemeComposition, ThemeOptions, ParserOptions } from '@/lib/markdown-api';
import { SettingsAPI, MarkdownSettings } from '@/lib/settings-api';
import { MarkdownPreview } from './MarkdownPreview';

interface MarkdownSettingsModalProps {
    onClose: () => void;
    onApply: (settings: ThemeComposition) => void;
    currentSettings?: ThemeComposition;
}

const DEFAULT_THEME: ThemeComposition = {
    colors: 'dark-default',
    fonts: 'modern',
    sizing: 'default',
    elements: 'rounded',
    decorations: 'clean',
    layout: 'default',
    prism: 'tomorrow-night',
    includeLayout: true
};

export function MarkdownSettingsModal({ onClose, onApply, currentSettings }: MarkdownSettingsModalProps) {
    const [options, setOptions] = useState<ThemeOptions | null>(null);
    const [settings, setSettings] = useState<ThemeComposition>(currentSettings || DEFAULT_THEME);
    const [savedName, setSavedName] = useState('default');
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            const opts = await MarkdownAPI.getThemeOptions();
            if (mounted) {
                setOptions(opts);
                setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    const handleChange = (category: keyof ThemeComposition, value: string) => {
        setSettings(prev => ({ ...prev, [category]: value }));
    };

    const handleSave = async () => {
        if (!savedName) return;
        setSaveStatus('saving');
        try {
            await SettingsAPI.saveSettings(savedName, {
                name: savedName,
                theme: settings
            });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
            onApply(settings); // Apply on save
        } catch (err) {
            console.error(err);
            setSaveStatus('idle');
            alert('Failed to save settings');
        }
    };

    const handleLoad = async (e: React.FormEvent) => {
        // In a real app, we would list saved settings.
        // For MVP, allow typing a name to load? 
        // Or maybe just list generic options.
        // Let's implement basic loading if we have time, but sticking to "Save" and "Apply" is core.
    };

    // Preview Content: A sample to show off the theme
    const previewContent = `
# Sample Title
Here is some **bold** text and *italic* text.

## Code Block
\`\`\`javascript
function hello() {
  console.log("Hello World");
}
\`\`\`

> This is a quote.

- Item 1
- Item 2

$E = mc^2$
`;

    if (loading || !options) return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-zinc-900 p-8 rounded-lg text-white">Loading Options...</div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-zinc-900 w-[90vw] h-[90vh] max-w-6xl rounded-xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Disc className="w-5 h-5 text-accent" />
                        Markdown Settings
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Controls Panel */}
                    <div className="w-80 bg-zinc-950 border-r border-zinc-800 p-4 overflow-y-auto space-y-6">

                        {/* Theme Selectors */}
                        {(Object.keys(options) as Array<keyof ThemeOptions>).map(category => (
                            <div key={category} className="space-y-2">
                                <label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">{category}</label>
                                <select
                                    value={settings[category as keyof ThemeComposition] as string}
                                    onChange={(e) => handleChange(category as keyof ThemeComposition, e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                                >
                                    {options[category].map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        ))}

                        <hr className="border-zinc-800" />

                        {/* Save Controls */}
                        <div className="space-y-3">
                            <label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Save Preset</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={savedName}
                                    onChange={(e) => setSavedName(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white flex-1 focus:outline-none focus:border-accent"
                                    placeholder="Preset Name"
                                />
                                <button
                                    onClick={handleSave}
                                    className="bg-accent hover:bg-accent/90 text-white p-2 rounded flex items-center justify-center transition-colors disabled:opacity-50"
                                    disabled={saveStatus === 'saving'}
                                >
                                    {saveStatus === 'saved' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className="flex-1 bg-zinc-900 p-8 overflow-hidden flex flex-col">
                        <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-semibold">Live Preview</div>
                        <div className="flex-1 border border-zinc-800 rounded-lg overflow-hidden bg-black shadow-inner">
                            <MarkdownPreview content={previewContent} settings={settings} />
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { onApply(settings); onClose(); }}
                                className="bg-white text-black px-6 py-2 rounded font-semibold hover:bg-zinc-200 transition-colors"
                            >
                                Apply Theme
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
