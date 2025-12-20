import React, { useCallback } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { standardKeymap, historyKeymap, defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

interface CodeEditorProps {
    initialContent: string;
    language: string;
    onChange: (value: string) => void;
    onSave: () => void;
    readOnly?: boolean;
    onEditorCreate?: (view: EditorView) => void;
    onScroll?: (percentage: number) => void;
}

export function CodeEditor({ initialContent, language, onChange, onSave, readOnly = false, onEditorCreate, onScroll }: CodeEditorProps) {
    const getExtension = () => {
        switch (language) {
            case 'javascript':
            case 'js':
            case '__js__':
            case 'jsx':
            case 'ts':
            case 'tsx':
                return javascript({ jsx: true, typescript: true });
            case 'python':
            case 'py':
                return python();
            case 'markdown':
            case 'md':
            case 'emd':
            case 'cmd':
            case 'smd':
                return markdown();
            case 'json':
                return json();
            case 'html':
                return html();
            default:
                return markdown(); // Default fallback
        }
    };

    // Scroll Handler Extension
    const scrollExtension = React.useMemo(() => {
        if (!onScroll) return [];
        return EditorView.domEventHandlers({
            scroll: (event: Event) => {
                const target = event.target as HTMLElement;
                if (!target) return;
                const maxScroll = target.scrollHeight - target.clientHeight;
                if (maxScroll <= 0) return;
                const percentage = target.scrollTop / maxScroll;
                onScroll(percentage);
            }
        });
    }, [onScroll]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            onSave();
        }
    }, [onSave]);

    return (
        <div className="h-full w-full text-base" onKeyDown={handleKeyDown}>
            <CodeMirror
                className="h-full"
                value={initialContent}
                height="100%"
                theme={vscodeDark}
                extensions={[
                    getExtension(),
                    EditorView.lineWrapping,
                    scrollExtension,
                    keymap.of([...standardKeymap, ...historyKeymap, ...defaultKeymap])
                ]}
                onChange={onChange}
                onCreateEditor={onEditorCreate}
                readOnly={readOnly}
                basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: true,
                    allowMultipleSelections: true,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    highlightActiveLine: true,
                    highlightSelectionMatches: true,
                    history: true,
                }}
            />
        </div>
    );
}
