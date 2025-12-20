
const PARSER_URL = 'https://mdparser-cf.yxw8611.workers.dev';
const THEMER_URL = 'https://theme-forger.yxw8611.workers.dev';

export interface ParserOptions {
    enableMath?: boolean;
    enablePlugins?: boolean;
}

export interface ParseResult {
    html: string;
    processingTime?: string;
}

export interface ThemeOptions {
    colors: string[];
    fonts: string[];
    sizing: string[];
    elements: string[];
    decorations: string[];
    layout: string[];
    prism: string[];
}

export interface ThemeComposition {
    colors: string;
    fonts: string;
    sizing: string;
    elements: string;
    decorations: string;
    layout: string;
    prism: string;
    includeLayout?: boolean;
}

export const MarkdownAPI = {
    async parse(markdown: string, options: ParserOptions = {}): Promise<string> {
        if (!markdown || !markdown.trim()) return '';
        try {
            // Merge defaults
            const finalOptions = {
                enableMath: true,
                enablePlugins: true,
                ...options
            };
            // Force math to be true as per requirement
            finalOptions.enableMath = true;

            const res = await fetch(`${PARSER_URL}/parse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markdown: markdown || '', options: finalOptions }),
            });

            if (!res.ok) throw new Error('Failed to parse markdown');

            const data = await res.json() as ParseResult;
            return data.html;
        } catch (error) {
            console.error('MarkdownAPI Parse Error:', error);
            return '<p>Error parsing markdown</p>';
        }
    },

    async getThemeOptions(): Promise<ThemeOptions> {
        try {
            const res = await fetch(`${THEMER_URL}/api/options`);
            if (!res.ok) throw new Error('Failed to fetch theme options');
            return await res.json() as ThemeOptions;
        } catch (error) {
            console.error('MarkdownAPI Theme Options Error:', error);
            return {
                colors: [], fonts: [], sizing: [], elements: [], decorations: [], layout: [], prism: []
            };
        }
    },

    async composeTheme(composition: ThemeComposition): Promise<string> {
        try {
            const res = await fetch(`${THEMER_URL}/api/compose`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(composition),
            });

            if (!res.ok) throw new Error('Failed to compose theme');
            return await res.text();
        } catch (error) {
            console.error('MarkdownAPI Compose Theme Error:', error);
            return '';
        }
    }
};
