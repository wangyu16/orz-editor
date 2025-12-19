import React, { useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
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
}

export function CodeEditor({ initialContent, language, onChange, onSave, readOnly = false }: CodeEditorProps) {
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

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            onSave();
        }
    }, [onSave]);

    return (
        <div className="h-full w-full overflow-hidden text-base" onKeyDown={handleKeyDown}>
            <CodeMirror
                value={initialContent}
                height="100%"
                theme={vscodeDark}
                extensions={[getExtension(), EditorView.lineWrapping]}
                onChange={onChange}
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
                }}
            />
        </div>
    );
}
