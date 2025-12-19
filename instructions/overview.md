# Project Overview

A personal file management and editing system using Cloudflare pages for an integrated frontend and backend (using page functions), Supabase for database and authentication, and Cloudflare R2 for file storage.

## Project Architecture: Edge-Native Serverless Stack

This project utilizes a Metadata-First Architecture, leveraging Cloudflare for global edge performance (compute & storage) and Supabase for centralized state management (database & authentication).

1. Component Breakdown
Frontend (UI): Cloudflare Pages

Hosts the static assets (React/Vue/Next.js) distributed globally via Cloudflare’s CDN.

Ensures low-latency loading times (<50ms) for users worldwide.

Backend (API): Cloudflare Pages Functions

Serverless functions living alongside the frontend code (in the /functions directory).

Acts as the secure orchestrator: validating Supabase Auth tokens, enforcing permissions, and generating Pre-Signed URLs for storage.

Database & Auth ("The Brain"): Supabase (PostgreSQL)

Auth: Manages users (Sign-up, JWT issuance, OAuth).

Database: Stores relational data (user profiles, file metadata, application state) and enforces Row Level Security (RLS).

Object Storage ("The Body"): Cloudflare R2

Stores heavy binary data (images, videos, documents).

Zero Egress Fees: Eliminates bandwidth costs for retrieving content.

2. Data Flow & Logic
A. Authentication
Client logs in directly via Supabase Auth SDK.

Supabase returns a JWT (Session Token) to the Client.

Client includes this JWT in the Authorization header for all requests to the Backend.

B. File Upload (The "Signed URL" Pattern)
Request: Client requests permission to upload a file via a Pages Function API call.

Verification: Pages Function verifies the JWT with Supabase and checks storage quotas/permissions in the Postgres DB.

Signing: If authorized, the Function generates a Presigned PUT URL from Cloudflare R2.

Transfer: Client uploads the file directly to R2 using the signed URL (bypassing the server to maximize speed and reduce load).

C. Data Retrieval
Metadata: Client fetches file lists/data from Supabase (fast, small text data).

Content: Client downloads actual media directly from the Custom R2 Domain (e.g., cdn.your-site.com/image.png).

3. Key Architectural Advantages
Cost Efficiency: R2 has zero egress fees; Cloudflare Pages has a generous free tier; Supabase offers a fixed-cost Postgres instance.

Performance: Code runs on the Edge (closest to user); Heavy media bypasses the application server entirely.

Simplicity: A single repository handles Frontend and Backend (Monorepo-style deployment via Cloudflare Pages).

Scalability: The architecture automatically handles traffic spikes. R2 and Pages scale horizontally without manual intervention.


## Features

- Folders/subfolders and files are listed in a tree structure in the frontend in a togglable side pannel.
- Files can be uploaded, downloaded, deleted, renamed, moved, copied, and shared. 
    - All metadata of files and folders are stored in the Supabase database and the files are stored in the R2 storage with uuid in a plain structure. 
    - All files and folders have a context menu showing allowed operations. 
    - Selection: selected files and folders are highlighted in the tree panel. Allow multiple selection using shift and ctrl keys, or by click dragging to select a range. Select root folder by clicking on an empty space in the tree panel. 
    - Upload: allow any type of files to be uploaded with a limit of 20 MB for each file.
    - Create: allow user to create folders/subfolders and files. When create a file, provide a list of supported file types to let user select from. Extension names are added automatically.
    - Download: allow any type of files to be downloaded.
    - Export: Export the rendered html page of a file that is rendered in the same way as the preview. 
    - Delete: allow any type of files to be deleted into the trash. Files in trash can be restored or permanently deleted.
    - Rename: allow folders and any type of files to be renamed.
    - Move: allow folders and any type of files to be moved. Allow drag and drop to move files and folders. Move to root folder by dragging to an empty space in the tree panel. 
    - Copy: allow folders and any type of files to be copied and pasted to a different location.
    - Share: allow folders and any type of files to be shared. Each file and folder have two types of shared links: raw and rendered. 
        - Raw: For each file and folder, a public link with the uuid is generated at the time it is created pointing to the raw file in R2. User can set the expiration time for the link (the link always exists but when expired, it will not be accessible from a public page.) For a folder, the link points to a page listing all files in the folder and in its subfolders. If a folder is shared publicly, the expiration time for the subfolders and files are set to be at least as long as the expiration time of the folder. If they have longer expiration time, leave it unchanged. 
        - Rendered: For a file, it fetches the raw content and render into a webpage. For a folder, the link points to a two panel page, on the left is the folder tree, on the right is the rendered file content of the selected one. The rendering use the same mechanism as the preview as described below. 
        - Skip: Files or folders having names starting with "_" are not shared. 
    - Preview and edit: For each type of file, provide a dedicated parsing and preview mechanism. There are three categories. 
        - No preview and no editing: these types of files are not previewable and cannot be edited, when selected, just show a link for downloading. 
        - Preview only: these types of files are previewable but cannot be edited, when selected, show the preview page. This type includes images, audio, video, pdf.  
        - Preview and edit: these types of files are previewable and can be edited. There are three sub-categories. 
            - Plain Text: such as .txt, .py, .json, ... . For these files, use CodeMirror to read and edit. No need to provide a separate preview panel. 
            - Text with preview, such as markdown, customized markdown for exams, cv, slides (using .emd, .cmd, .smd as the extension names), use CodeMirror for edit and show a preview panel which has isolated layout and styling settings within a panel of the editor page. 
            - Graphic, such as chemical structure, diagram editor, the preview includes the editing functions. 
        - All editing processes have auto save, live preview update, and save upon closing, also allow manual save. 
        - All editing processes would provide a history of changes and allow undo/redo. 
        - Manually saved versions and saved upon closing versions are stored and can be restored. 
        - Insert an object to the editor: for example, insert an image to a markdown file means upload the image and save it in a folder, and create a internal src to insert the image to the specific location within the markdown file. 
    - Group operations: allow users to select multiple files and folders and perform operations on them. Allow group opperation in trash bin as well. 
    - Trash bin: allow users to move files and folders to trash bin, and restore or permanently delete them. 
    - Search: allow users to search files and folders by name. 
    - Name conflict resolution: when a file or folder is created, if the name already exists, automatically add a number suffix to the name. 
- Authentication: allow guest mode to access full editing/previewing/export functions but without saving/sharing. Anonymous users have to create new files/folders which are saved locally on client side and everything disappears when the browser is closed. 


## Editor Design

- When creating new files, provide a list of supported file types to let user select from. Extension names are added automatically. Supported file types included are 
    - plain text (including txt, py, js, css, html, json,etc.) If user select to create a text file, add .txt as the extension name by default, or the user can specify the extension name.
    - markdown. When a new markdown file is created, add .md as the extension name by default.
    - exam markdown. When a new exam markdown file is created, add .emd as the extension name by default.
    - cv markdown. When a new cv file is created, add .cmd as the extension name by default.
    - slide markdown. When a new slide markdown file is created, add .smd as the extension name by default.
- Click a file to open it in the editor
- For files do not have associated editors, simply show a download button.
- For image/audio/video/pdf files, only preview, no editing function. When opened, show the preview. 
- For text files. 
    - plain text: use CodeMirror to edit. 
    - markdown, exam, cv, slide: use CodeMirror to edit, and show a preview panel which has isolated layout and styling settings within a panel of the editor page. The preview panel is always on the right of the editor panel. Allow user to choose edit/preview/split modes. For each type of file, provide a dedicated parsing mechanism. For the preview panel, each type of file has its own style settings (a pop out card to show all allowed settings). Allow user to save style settings which are saved in invisible folders. Each type of file has its own style settings can be saved in dedicated folders. So if a user wants to load saved settings, just need to select the file in the invisible folder for that specific type of file. For each type of file allow to save one default style setting that will be used for all that type of files without specifying the style settings. 
- Make it easy for future registering new file types and their associtated editor/previewer.
- All editing allow history version control. 

## Export and Sharing Rendered Page

Use the same mechanism as the preview to render the file for export or sharing. 

## Notes:

- Authentication using Email and Google. Google OAuth has been added to Supabase authentication. 
- Test all file/folder management functions before implement editors. 
- Each editor has its own separate mechanism handle fetched file, parser into html elements, assemble into a specific layout, add style settings, and push the page to the container. Each editor is a standalone function component, the layout and style settings are standalone css files as well. All can be developed and revised independently. 
- Right panel (the editor and previewer container): a head bar for functional elements. Below it, a container that is isolated from the rest of the page. In the container if there is a preview panel, it is also isolated from the rest of the page including the parent container. Thus, the style inside the preview panel is not affected by the style outside the preview panel. 

## Sharing

I recommend creating one public link (ID) per file/folder, but using two different URL paths to deliver the content. This keeps your database simple (you only manage one expiration date/share status) while providing the two distinct views you need.

Proposed Design
1. Database / Logic:

Use the existing 
id
 (UUID) of the file/folder as the "Share ID".
The "switch" to enable/disable sharing is simply checking if public_link_expired_at is in the future (or null/unset means not shared, depending on your preference. Usually null = not shared, date = active until date).
2. URL Structure:

Rendered Link: https://app.com/s/view/[UUID]
File: Loads the full React app (or a lightweight version) to render the file content (Markdown, PDF viewer, etc.).
Folder: Loads the Two-Panel UI (Tree on left, Preview on right).
Raw Link: https://app.com/s/raw/[UUID]
File: Acts as a direct download or browser-native display (text/plain, image/png). It proxies the R2 content.
Folder: Renders a simple HTML page listing all files (recursively, as requested) with simple <a> tags to their own raw links.
Why this approach?
Consistency: You don't need to generate two different random tokens.
Flexibility: If a user has the "Rendered" link but wants the "Raw" version, they can easily switch (user interface can provide a button).
Security: Revoking sharing (by setting expiration to past) kills both links instantly.
One Question for "Raw" Folder View
You mentioned: "For a folder, the link points to a page listing all files... recursively".

Should this be a simple valid HTML page (like an Apache directory listing)? html page with a list of files and folders, each with a download link.
Or a JSON response for API consumption?
(I will assume HTML Page for now based on "points to a page")