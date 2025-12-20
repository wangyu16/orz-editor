## Markdown Editor

### Parser

Use a cloud markdown parser to parse the markdown content to html. The parser url:

https://mdparser-cf.yxw8611.workers.dev/

#### Endpoints

POST /parse
Parse markdown and return HTML

Request:
```
{
  "markdown": "# Hello World\n\nThis is **bold**.",
  "options": {
    "enableMath": true,
    "enablePlugins": true
  }
}
```

Response:
```
{
  "html": "<h1>Hello World</h1>\n<p>This is <strong>bold</strong>.</p>",
  "processingTime": "2ms"
}
```

POST /ast
Parse markdown and return AST (Abstract Syntax Tree)

Request:
```
{
  "markdown": "# Title\n\nParagraph text.",
  "options": {
    "enableMath": true,
    "enablePlugins": true
  }
}
```

Response:
```
{
  "ast": {
    "type": "document",
    "children": [...]
  },
  "processingTime": "1ms"
}
```

GET /health
Health check endpoint

Response:
```
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-11-06T..."
}
```

## Markdown Theme Forger

Use a cloud markdown theme forger to generate the css for the markdown content. The theme forger url:

https://theme-forger.yxw8611.workers.dev/

### GET /api/options

Returns available theme options for each category.

```bash
curl https://theme-forger.yxw8611.workers.dev/api/options
```

### POST /api/compose

Returns composed CSS from theme selections.

```bash
curl -X POST https://theme-forger.yxw8611.workers.dev/api/compose \
  -H "Content-Type: application/json" \
  -d '{
    "colors": "dark-default",
    "fonts": "modern",
    "sizing": "default",
    "elements": "rounded",
    "decorations": "clean",
    "layout": "default",
    "prism": "tomorrow-night",
    "includeLayout": true
  }'
```

Set `"includeLayout": false` to exclude layout CSS from the output.

### GET /api/theme/:category/:name

Returns a single theme CSS file.

```bash
curl https://theme-forger.yxw8611.workers.dev/api/theme/colors/dark-default
```

## 🎨 Available Themes

### Colors (`themes/colors/`)

| Theme           | Description                              |
| --------------- | ---------------------------------------- |
| `light-default` | Clean white background with blue accents |
| `light-soft`    | Soft gray background, gentle on eyes     |
| `dark-default`  | Dark gray background with cyan accents   |
| `dark-midnight` | Deep navy background with gold accents   |
| `sepia-classic` | Warm sepia tones for comfortable reading |
| `sepia-warm`    | Warmer cream tones with orange accents   |

### Fonts (`themes/fonts/`)

| Theme                | Body Font            | Header Font                   | Style              |
| -------------------- | -------------------- | ----------------------------- | ------------------ |
| `default`            | Roboto (sans)        | Playfair Display (serif)      | Clean modern       |
| `modern`             | Inter (sans)         | DM Serif Display (serif)      | Contemporary       |
| `classic`            | Merriweather (serif) | Oswald (sans)                 | Traditional        |
| `elegant`            | Lora (serif)         | Raleway (sans)                | Sophisticated      |
| `literary`           | Crimson Text (serif) | Montserrat (sans)             | Book-like          |
| `typewriter`         | Courier Prime (mono) | Bebas Neue (sans)             | Typewriter feel    |
| `typewriter-classic` | Cutive Mono (mono)   | Libre Baskerville (serif)     | Vintage typewriter |
| `handwritten`        | Kalam (cursive)      | Architects Daughter (cursive) | Personal touch     |
| `handwritten-neat`   | Caveat (cursive)     | Nunito (rounded sans)         | Clean handwriting  |
| `notebook`           | Neucha (cursive)     | Permanent Marker (marker)     | School notebook    |

#### Chinese Fonts (`themes/fonts/chinese-*.css`)

| Theme               | Body Font             | Header Font                     | Style             |
| ------------------- | --------------------- | ------------------------------- | ----------------- |
| `chinese-modern`    | Noto Sans SC (sans)   | Noto Serif SC (serif)           | Contemporary 现代 |
| `chinese-classic`   | Noto Serif SC (serif) | ZCOOL XiaoWei (brush)           | Traditional 经典  |
| `chinese-editorial` | Noto Sans SC (sans)   | Noto Sans SC (sans)             | Publishing 排版   |
| `chinese-artistic`  | Noto Sans SC (sans)   | ZCOOL QingKe HuangYou (display) | Creative 艺术     |
| `chinese-tech`      | Noto Sans SC (sans)   | Noto Sans SC (light)            | Technical 技术    |

### Sizing (`themes/sizing/`)

| Theme      | Base Size | Line Height | Best For                  |
| ---------- | --------- | ----------- | ------------------------- |
| `compact`  | 0.9rem    | 1.5         | Dense content, dashboards |
| `default`  | 1rem      | 1.6         | General purpose           |
| `spacious` | 1.1rem    | 1.8         | Long-form reading         |

### Elements (`themes/elements/`)

| Theme     | Description                                        | Style    |
| --------- | -------------------------------------------------- | -------- |
| `default` | Standard styled badges, containers, alerts         | Balanced |
| `minimal` | Subtle, understated element styling                | Simple   |
| `vibrant` | Bold colors and prominent styling                  | Bold     |
| `rounded` | Soft corners, emoji icons, pill-shaped badges      | Friendly |
| `flat`    | Material design inspired, no shadows, solid colors | Modern   |
| `outline` | Border-only styling, no fills                      | Clean    |
| `glass`   | Glassmorphism with backdrop blur effects           | Trendy   |
| `neon`    | Glowing borders, cyberpunk aesthetic               | Dramatic |

### Decorations (`themes/decorations/`)

| Theme       | Description                                   | Style     |
| ----------- | --------------------------------------------- | --------- |
| `default`   | Balanced decorative elements                  | Versatile |
| `clean`     | Minimal decorations, focus on content         | Simple    |
| `fancy`     | Elaborate styling with flourishes, drop caps  | Elegant   |
| `playful`   | Colorful with emojis, animated hovers         | Fun       |
| `retro`     | Vintage computing, double borders, ASCII      | Nostalgic |
| `brutalist` | Raw, stark, uppercase headings                | Bold      |
| `zen`       | Japanese-inspired minimal, lots of whitespace | Calm      |
| `academic`  | Scholarly, small-caps, justified text         | Formal    |

### Layout (`themes/layout/`)

| Theme     | Max Width | Best For                |
| --------- | --------- | ----------------------- |
| `narrow`  | 600px     | Mobile, focused reading |
| `default` | 800px     | General purpose         |
| `wide`    | 1100px    | Technical docs, tables  |

### Prism Code Highlighting (`themes/prism/`)

| Theme            | Description                       |
| ---------------- | --------------------------------- |
| `default`        | Light theme with soft colors      |
| `one-light`      | Atom One Light inspired           |
| `tomorrow-night` | Dark theme for dark color schemes |

## 🔧 CSS Variables Reference

All themes use CSS custom properties for easy customization:

### Color Variables

```css
--bg-color           /* Main background */
--bg-secondary       /* Secondary background (code blocks, etc.) */
--text-color         /* Primary text color */
--text-secondary     /* Secondary text color */
--text-muted         /* Muted/disabled text */
--decoration-color   /* Accent color for headings, links */
--highlight-color    /* Highlight/mark background */
--success-color      /* Success states */
--note-color         /* Info/note states */
--warning-color      /* Warning states */
--link-color         /* Link color */
--link-hover         /* Link hover color */
--border-color       /* Border color */
--code-bg            /* Code background */
--code-border        /* Code border */
```

### Font Variables

```css
--font-main          /* Body text font family */
--font-header        /* Heading font family */
--font-mono          /* Monospace font family */
--font-decoration    /* Decorative font (quotes, etc.) */
--font-weight-normal /* Normal weight (400) */
--font-weight-medium /* Medium weight (500) */
--font-weight-bold   /* Bold weight (700) */
```

### Sizing Variables

```css
--font-size-base     /* Base font size */
--line-height        /* Base line height */
--h1-size through --h6-size  /* Heading sizes */
--spacing-sm         /* Small spacing */
--spacing-md         /* Medium spacing */
--spacing-lg         /* Large spacing */
--spacing-xl         /* Extra large spacing */
```

## 📝 Usage in Your Project

### Method 1: Use Exported CSS

1. Use Theme Forger to customize your theme
2. Click "Export CSS" and download the file
3. Include it in your HTML:

```html
<link rel="stylesheet" href="path/to/theme-forger-style.css" />
```

### Method 2: Import Individual Components

```html
<link rel="stylesheet" href="themes/colors/dark-default.css" />
<link rel="stylesheet" href="themes/fonts/modern.css" />
<link rel="stylesheet" href="themes/sizing/default.css" />
<link rel="stylesheet" href="themes/decorations/clean.css" />
<link rel="stylesheet" href="themes/elements/default.css" />
<link rel="stylesheet" href="themes/layout/default.css" />
<link rel="stylesheet" href="themes/prism/tomorrow-night.css" />
```

### Method 3: CSS @import

```css
@import url("themes/colors/dark-default.css");
@import url("themes/fonts/modern.css");
/* ... other imports */
```

## 💡 Enabling Prism.js Syntax Highlighting

The Prism theme CSS files (`themes/prism/*.css`) provide the color styles for syntax highlighting, but you need to include the Prism.js library to tokenize and highlight code blocks.

### Step 1: Include Prism.js

Add Prism.js core and language components to your HTML (before closing `</body>` tag):

```html
<!-- Prism.js Core -->
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>

<!-- Language Components (add the ones you need) -->
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-typescript.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-css.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markup.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-java.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-c.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-cpp.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-csharp.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-go.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-rust.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-sql.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-yaml.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markdown.min.js"></script>
```

### Step 2: Include Theme CSS

Include your chosen Prism theme CSS (in `<head>` or via the exported combined CSS):

```html
<link rel="stylesheet" href="themes/prism/tomorrow-night.css" />
```

### Step 3: Mark Up Code Blocks

Code blocks should have the `language-*` class:

```html
<pre><code class="language-javascript">
function hello() {
    console.log("Hello, World!");
}
</code></pre>
```

### Step 4: Initialize Prism

If code is loaded dynamically, call Prism after content is ready:

```javascript
// Highlight all code blocks on the page
Prism.highlightAll();

// Or highlight a specific element
Prism.highlightElement(document.querySelector("code"));
```

### Available Language Components

Here are commonly used Prism language components:

| Language   | Component URL             |
| ---------- | ------------------------- |
| JavaScript | `prism-javascript.min.js` |
| TypeScript | `prism-typescript.min.js` |
| Python     | `prism-python.min.js`     |
| Java       | `prism-java.min.js`       |
| C          | `prism-c.min.js`          |
| C++        | `prism-cpp.min.js`        |
| C#         | `prism-csharp.min.js`     |
| Go         | `prism-go.min.js`         |
| Rust       | `prism-rust.min.js`       |
| Ruby       | `prism-ruby.min.js`       |
| PHP        | `prism-php.min.js`        |
| Swift      | `prism-swift.min.js`      |
| Kotlin     | `prism-kotlin.min.js`     |
| SQL        | `prism-sql.min.js`        |
| Bash/Shell | `prism-bash.min.js`       |
| HTML/XML   | `prism-markup.min.js`     |
| CSS        | `prism-css.min.js`        |
| JSON       | `prism-json.min.js`       |
| YAML       | `prism-yaml.min.js`       |
| Markdown   | `prism-markdown.min.js`   |

For more languages, visit: https://prismjs.com/#supported-languages
