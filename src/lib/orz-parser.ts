
import { readFileSync } from 'fs';
import { join } from 'path';

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

export function parseMarkdown(content: string): string {
    // Dynamic import to avoid issues during module initialization
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const md = require('orz-markdown').md;
    const html = md.render(content || '');
    return `<div class="markdown-body">${html}</div>`;
}

export function getThemeCSS(themeName: string): string {
    const safe = (ORZ_THEMES as readonly string[]).includes(themeName) ? themeName : 'dark-elegant-1';
    const themesDir = join(process.cwd(), 'node_modules', 'orz-markdown', 'themes');
    const themeCss = readFileSync(join(themesDir, `${safe}.css`), 'utf-8');
    const commonCss = readFileSync(join(themesDir, 'common.css'), 'utf-8');
    // Inline common.css so the string is self-contained (iframe can't resolve relative imports)
    return themeCss.replace("@import './common.css';", commonCss);
}
