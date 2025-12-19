# ORZ Editor Development Plan

This document outlines the step-by-step implementation plan for the ORZ Editor.

## Phase 1: Infrastructure & Initial Setup
1. [ ] **Initialize Project Repository**
   - Create a Next.js project.
   - Setup project structure: `/app`, `/functions`, `/components`, `/lib`.
   - *Verification*: `npm run dev` starts successfully.
2. [ ] **Setup Supabase**
   - Configure Authentication and initial database schema.
   - *Verification*: Successfully log in/sign up from the frontend.
3. [ ] **Setup Cloudflare R2**
   - Create bucket and configure CORS.
   - *Verification*: Test R2 connectivity.
4. [ ] **Environment Configuration**
   - Add keys to `.env`.
   - *Verification*: `process.env` contains all required variables.

## Phase 2: Database Schema & RLS
1. [ ] **Define Tables**
   - Create `folders` and `files` tables.
   - *Verification*: Tables visible in Supabase dashboard.
2. [ ] **Implement RLS**
   - Set up policies for user isolation.
   - *Verification*: Test cross-user access (should be denied).

## Phase 3: File Storage Integration
1. [ ] **Presigned URLs**
   - Implement CF Pages Function for R2 PUT URLs.
   - *Verification*: API returns valid signed URL.
2. [ ] **Direct Upload**
   - Frontend implementation of R2 upload.
   - *Verification*: Uploaded file appears in R2 bucket.

## Phase 4: Core UI - File Explorer
1. [ ] **File Tree Component**
   - Recursive sidebar for navigation.
   - *Verification*: Tree renders correctly.
2. [ ] **Navigation & Selection**
   - Implement single/multi-select and highlighting.
   - *Verification*: Items are selectable.

## Phase 5: File Operations
1. [ ] **Basic CRUD**
   - Create, Rename, Delete (Trash).
   - *Verification*: Actions reflect in DB and UI.
2. [ ] **Drag and Drop**
   - Move files/folders by dragging.
   - *Verification*: `parent_id` updates correctly.
3. [ ] **Trash Management**
   - Restore and permanent delete.
   - *Verification*: Items can be recovered from trash.

## Phase 6: Sharing
1. [ ] **Share Link Generation**
   - Raw and Rendered shared links.
   - *Verification*: Shared link is accessible via public URL.

## Phase 7: Editing & Preview
1. [ ] **Editor (CodeMirror)**
   - Text editing with auto-save.
   - *Verification*: Edits persist after reload.
2. [ ] **Specialized Previews**
   - Markdown, Images, PDF, etc.
   - *Verification*: Previews show correct content.

## Phase 8: Final Polish
1. [ ] **Search & Batch Ops**
   - Search by name, bulk move/delete.
   - *Verification*: Search works; multiple items can be deleted.
