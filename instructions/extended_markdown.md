# Future Development: Extended Markdown Formats (Exam, CV, Slides)

## Overview
The ORZ Editor currently supports standard Markdown editing with auto-save and version history.
Specialized formats like **Exam (`.emd`)**, **CV (`.cv.md`)**, and **Slides (`.slide.md` / `.smd`)** effectively use the same backend logic but require different **Frontend Rendering** and **Layouts**.

## Current State
- Extensions lie `.emd`, `.cmd`, `.smd` are treated as `markdown_split` category.
- They open in `MarkdownSplitEditor`.
- They share the same `Auto-Save` and `History` logic.

## How to Customize in the Future

### 1. Detect Format
In `src/components/editors/MarkdownSplitEditor.tsx`, detect the specific format via `file.name` extension.

```typescript
const isSlide = file.name.endsWith('.smd');
const isExam = file.name.endsWith('.emd');
```

### 2. Custom Previewer
The `MarkdownSplitEditor` uses a split pane with a previewer.
To change the layout (e.g., Slideshow view instead of scroll):

1. Create a specific renderer, e.g., `src/components/previewers/SlidePreview.tsx`.
2. In `MarkdownSplitEditor`, conditionally render it:

```tsx
<div className="preview-pane">
  {isSlide ? <SlidePreview content={content} /> : <MarkdownPreview content={content} />}
</div>
```

### 3. Custom Toolbar / Settings
If these formats need specific settings (e.g., "Presentation Mode" for slides):
1. Extend the Toolbar in `MarkdownSplitEditor`.
2. Add conditional buttons.

### 4. Styles
Use CSS Modules or Tailwind to apply distinct themes.
- Exams might need a print-friendly CSS.
- Slides need full-screen landscape styles.

## Implementation Steps (Example: Slides)
1. **Parser**: Add `remark-slide` or similar to the markdown parser pipeline if new syntax is needed.
2. **Review**: Ensure `src/lib/fileUtils.ts` maps `.smd` to `markdown_split`.
3. **Component**: Duplicate `MarkdownSplitEditor.tsx` to `SlidesEditor.tsx` if logic diverges significantly, OR keep unified if only the Preview changes.
