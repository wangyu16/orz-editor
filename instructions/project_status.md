# Project Status: ORZ Editor

**Last Updated:** December 20, 2025

## 1. Deployment & Infrastructure
*   **Live URL:** `https://editor.orz.how`
*   **Repository:** `https://github.com/wangyu16/orz-editor`
*   **Deployment Platform:** Vercel (Node.js Serverless Functions)
    *   *Note:* Switched from Cloudflare Pages to Vercel to bypass the 3MB Worker size limit imposed by AWS SDK dependencies.
*   **Database & Auth:** Supabase (PostgreSQL + GoTrue)
*   **Storage:** Cloudflare R2 (S3-compatible object storage)

## 2. Implemented Features

### Authentication
*   **Methods:** Email/Password and Google OAuth.
*   **Guest Mode:** Fully functional local-only mode (Ephemeral storage).
*   **Security:** RLS (Row Level Security) policies enforced on Database; Backend verifies ownership before R2 operations.

### File Management
*   **Structure:** Recursive folder/file tree sidebar.
*   **Operations:** Create, Read, Update, Delete (CRUD) for files and folders.
    *   **Move:** Drag-and-drop support (Files into folders, folders into folders).
    *   **Copy/Paste:** Recursive copying of folders supported.
    *   **Rename:** Supported with name conflict resolution (auto-appending `(n)`).
*   **Uploads:** Direct-to-R2 uploads using Presigned URLs (bypassing server bandwidth).

### Viewer & Editors
*   **Text/Code:** CodeMirror integration with syntax highlighting for various languages.
*   **Markdown:** Split-view editor (Left: Code, Right: Preview).
*   **Media:** Native previewers for Images, Video, and Audio.
*   **Docs:** PDF Viewer integration.

### Sharing Functionality
*   **Mechanism:** Share Tokens (UUID) generated per file/folder.
*   **Dual Modes:**
    1.  **Rendered View** (`/s/[token]`): Public page showing the file preview or folder grid.
    2.  **Raw View** (`/raw/[token]`): Direct content stream or HTML directory listing for folders.
*   **Access:** Public access allowed via specific RLS policies and backend token verification.

## 3. Pending / Future Work
*   **Advanced Editing:**
    *   Auto-save functionality.
    *   Version history and restoration.
*   **Specialized Markdown Extensions:**
    *   Full implementation of `.emd` (Exam), `.cmd` (CV), and `.smd` (Slide) specific rendering logic and styles.
*   **UI Polish:**
    *   Switching Folder Shared View to a Split View (currently Grid).
    *   Inserting images directly into Markdown documents via drag-and-drop.

## 4. Configuration Notes
*   **DNS:** Managed via Cloudflare, pointing to Vercel via CNAME (`cname.vercel-dns.com`).
*   **Supabase Config:**
    *   Site URL: `https://editor.orz.how`
    *   Redirect URLs: `https://editor.orz.how/**`
