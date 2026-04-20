
export const ORZ_THEMES = [
    'dark-elegant-1',
    'dark-elegant-2',
    'light-academic-1',
    'light-academic-2',
    'light-neat-1',
    'light-neat-2',
    'light-playful-1',
    'light-playful-2',
    'beige-decent-1',
    'beige-decent-2',
] as const;

export type OrzTheme = typeof ORZ_THEMES[number];

export const MarkdownAPI = {
    async parse(markdown: string): Promise<string> {
        if (!markdown || !markdown.trim()) return '';
        try {
            const res = await fetch('/api/markdown/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markdown }),
            });
            if (!res.ok) throw new Error('Failed to parse markdown');
            const data = await res.json() as { html: string };
            return data.html;
        } catch (error) {
            console.error('MarkdownAPI Parse Error:', error);
            return '<p>Error parsing markdown</p>';
        }
    },

    async getThemeCSS(name: string): Promise<string> {
        const safeName = (ORZ_THEMES as readonly string[]).includes(name) ? name : 'dark-elegant-1';
        try {
            const res = await fetch(`/api/markdown/theme/${safeName}`);
            if (!res.ok) throw new Error('Failed to load theme CSS');
            return await res.text();
        } catch (error) {
            console.error('MarkdownAPI getThemeCSS Error:', error);
            return '';
        }
    }
};
