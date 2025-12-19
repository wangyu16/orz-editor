'use client';

import { useState, useEffect } from 'react';
import { ExplorerItem, FileMetadata } from '@/lib/types';
import { mutate } from 'swr';
import { v4 as uuidv4 } from 'uuid';

export function useFileSystem(isGuest: boolean = false) {
    const [isUploading, setIsUploading] = useState(false);
    const [guestTree, setGuestTree] = useState<ExplorerItem[]>([]);

    // For guest mode, we'll use local state
    const createFolder = async (name: string, parentId: string | null = null) => {
        if (isGuest) {
            const newFolder: ExplorerItem = {
                id: uuidv4(),
                name,
                kind: 'folder',
                parent_id: parentId,
                user_id: 'guest',
                is_deleted: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setGuestTree(prev => [...prev, newFolder]);
            return newFolder;
        }

        try {
            const res = await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, parentId }),
            });
            if (!res.ok) throw new Error('Failed to create folder');
            const data = await res.json();
            mutate(`/api/tree?parentId=${parentId}`);
            return data;
        } catch (error) {
            console.error(error);
            alert('Error creating folder');
        }
    };

    const uploadFile = async (file: File, folderId: string | null = null) => {
        setIsUploading(true);
        try {
            if (file.size > 20 * 1024 * 1024) {
                alert(`File "${file.name}" is too large. Maximum size is 20MB.`);
                setIsUploading(false);
                return;
            }

            if (isGuest) {
                // In guest mode, we "upload" by creating a local reference
                // and using URL.createObjectURL for the actual file if needed
                const newFile: ExplorerItem = {
                    id: uuidv4(),
                    name: file.name,
                    kind: 'file',
                    folder_id: folderId,
                    user_id: 'guest',
                    type: file.type || file.name.split('.').pop() || 'unknown',
                    size: file.size,
                    uuid_r2: uuidv4(), // dummy
                    is_deleted: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    // We can attach the actual file object if we want to preview it later
                    _file: file,
                } as any;
                setGuestTree(prev => [...prev, newFile]);
                return newFile;
            }

            const signRes = await fetch('/api/upload/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    size: file.size,
                    folderId,
                }),
            });

            if (!signRes.ok) throw new Error('Failed to get upload URL');
            const { signedUrl, r2Uuid } = await signRes.json();

            const uploadRes = await fetch(signedUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });

            if (!uploadRes.ok) throw new Error('Failed to upload to storage');

            const metaRes = await fetch('/api/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: file.name,
                    r2Uuid,
                    folderId,
                    type: file.type || file.name.split('.').pop(),
                    size: file.size,
                }),
            });

            if (!metaRes.ok) throw new Error('Failed to save file metadata');
            mutate(`/api/tree?parentId=${folderId}`);
            return await metaRes.json();
        } catch (error) {
            console.error(error);
            alert('Error uploading file');
        } finally {
            setIsUploading(false);
        }
    };

    const deleteItems = async (items: ExplorerItem[]) => {
        if (!confirm(`Move ${items.length} items to Trash?`)) return;
        if (isGuest) {
            setGuestTree(prev => prev.map(i => items.find(item => item.id === i.id) ? { ...i, is_deleted: true } : i));
            return;
        }
        try {
            await Promise.all(items.map(item => {
                const table = item.kind === 'folder' ? 'folders' : 'files';
                return fetch(`/api/${table}/${item.id}`, { method: 'DELETE' });
            }));
            const uniqueParents = Array.from(new Set(items.map(i => i.kind === 'folder' ? i.parent_id : i.folder_id)));
            uniqueParents.forEach(p => mutate(`/api/tree?parentId=${p}`));
            mutate('/api/trash');
        } catch (error) {
            console.error(error);
            alert('Error deleting items');
        }
    };

    const renameItem = async (item: ExplorerItem, newName: string) => {
        if (isGuest) {
            setGuestTree(prev => prev.map(i => i.id === item.id ? { ...i, name: newName } : i));
            return;
        }
        try {
            const table = item.kind === 'folder' ? 'folders' : 'files';
            const res = await fetch(`/api/${table}/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName }),
            });
            if (!res.ok) throw new Error('Failed to rename item');
            const parentId = item.kind === 'folder' ? item.parent_id : item.folder_id;
            mutate(`/api/tree?parentId=${parentId}`);
        } catch (error) {
            console.error(error);
            alert('Error renaming item');
        }
    };

    const moveItems = async (items: ExplorerItem[], targetFolderId: string | null) => {
        if (isGuest) {
            setGuestTree(prev => prev.map(i => {
                if (items.find(item => item.id === i.id)) {
                    return i.kind === 'folder' ? { ...i, parent_id: targetFolderId } : { ...i, folder_id: targetFolderId };
                }
                return i;
            }));
            return;
        }
        try {
            await Promise.all(items.map(item => {
                const table = item.kind === 'folder' ? 'folders' : 'files';
                const body = item.kind === 'folder' ? { parent_id: targetFolderId } : { folder_id: targetFolderId };
                return fetch(`/api/${table}/${item.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            }));
            const uniqueSourceParents = Array.from(new Set(items.map(i => i.kind === 'folder' ? i.parent_id : i.folder_id)));
            uniqueSourceParents.forEach(p => mutate(`/api/tree?parentId=${p}`));
            mutate(`/api/tree?parentId=${targetFolderId}`);
        } catch (error) {
            console.error(error);
            alert('Error moving items');
        }
    };

    const restoreItems = async (items: ExplorerItem[]) => {
        if (isGuest) {
            setGuestTree(prev => prev.map(i => items.find(item => item.id === i.id) ? { ...i, is_deleted: false } : i));
            return;
        }
        try {
            await Promise.all(items.map(item => {
                const table = item.kind === 'folder' ? 'folders' : 'files';
                return fetch(`/api/${table}/${item.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_deleted: false }),
                });
            }));
            mutate('/api/trash');
            mutate(`/api/tree?parentId=null`);
        } catch (error) {
            console.error(error);
            alert('Error restoring items');
        }
    };

    const permanentDeleteItems = async (items: ExplorerItem[]) => {
        if (!confirm(`Permanently delete ${items.length} items? This cannot be undone.`)) return;
        if (isGuest) {
            setGuestTree(prev => prev.filter(i => !items.find(item => item.id === i.id)));
            return;
        }
        try {
            await Promise.all(items.map(item => {
                const table = item.kind === 'folder' ? 'folders' : 'files';
                return fetch(`/api/${table}/${item.id}?permanent=true`, { method: 'DELETE' });
            }));
            mutate('/api/trash');
        } catch (error) {
            console.error(error);
            alert('Error deleting items permanently');
        }
    };

    const downloadFile = async (item: ExplorerItem) => {
        if (item.kind === 'folder') return; // Cannot download folders yet

        let downloadUrl: string | null = null;
        let filename = item.name;

        if (isGuest) {
            // Check if we have the file object in memory
            const fileObj = (item as any)._file;
            if (fileObj) {
                downloadUrl = URL.createObjectURL(fileObj);
            } else {
                alert('File content not available in Guest session (reload lost data).');
                return;
            }
        } else {
            try {
                const res = await fetch(`/api/files/${item.id}`);
                if (!res.ok) throw new Error('Failed to get download URL');
                const data = await res.json();
                downloadUrl = data.signedUrl;
            } catch (error) {
                console.error(error);
                alert('Error downloading file');
                return;
            }
        }

        if (downloadUrl) {
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (isGuest) URL.revokeObjectURL(downloadUrl);
        }
    };


    const createFile = async (name: string, type: string, folderId: string | null) => {
        const fileExtension = name.endsWith(`.${type}`) ? name : `${name}.${type}`;

        let finalName = fileExtension;

        if (isGuest) {
            // Check for duplicates in guestTree
            // Check for duplicates in guestTree
            const siblings = guestTree.filter(item => {
                const itemParentId = item.kind === 'folder' ? item.parent_id : item.folder_id;
                return itemParentId === folderId;
            });

            const existingNames = new Set(siblings.map(i => i.name));
            if (existingNames.has(finalName)) {
                const extIndex = finalName.lastIndexOf('.');
                const base = extIndex !== -1 ? finalName.slice(0, extIndex) : finalName;
                const ext = extIndex !== -1 ? finalName.slice(extIndex) : '';

                let i = 1;
                while (existingNames.has(`${base} (${i})${ext}`)) {
                    i++;
                }
                finalName = `${base} (${i})${ext}`;
            }

            const newFile: FileMetadata = {
                id: uuidv4(),
                name: finalName,
                folder_id: folderId,
                user_id: 'guest',
                type: type,
                size: 0,
                uuid_r2: '',
                is_deleted: false,
                public_link_expired_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                kind: 'file'
            };
            setGuestTree(prev => [...prev, newFile]);
            return;
        }

        try {
            const res = await fetch('/api/files/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: fileExtension,
                    type,
                    folderId
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create file');
            }

            mutate(`/api/tree?parentId=${folderId || 'null'}`);
        } catch (error) {
            console.error(error);
            alert('Error creating file');
        }
    };

    const searchItems = async (query: string): Promise<ExplorerItem[]> => {
        if (!query.trim()) return [];

        if (isGuest) {
            const lowerQuery = query.toLowerCase();
            return guestTree.filter(item =>
                !item.is_deleted && item.name.toLowerCase().includes(lowerQuery)
            ).sort((a, b) => a.name.localeCompare(b.name));
        }

        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error('Search failed');
            return await res.json();
        } catch (error) {
            console.error(error);
            alert('Error searching items');
            return [];
        }
    };

    const [clipboard, setClipboard] = useState<{ items: ExplorerItem[], operation: 'copy' | 'cut' } | null>(null);

    const copyItems = (items: ExplorerItem[]) => {
        setClipboard({ items, operation: 'copy' });
    };

    const cutItems = (items: ExplorerItem[]) => {
        setClipboard({ items, operation: 'cut' });
    };

    const pasteItems = async (targetFolderId: string | null) => {
        if (!clipboard || clipboard.items.length === 0) return;

        if (clipboard.operation === 'cut') {
            await moveItems(clipboard.items, targetFolderId);
            setClipboard(null);
            return;
        }

        // Handle Copy Operation
        if (isGuest) {
            const newItems: ExplorerItem[] = [];

            // Helper to recursively copy for guest mode
            const copyGuestItem = (item: ExplorerItem, targetId: string | null): ExplorerItem => {
                let finalName = item.name;

                // Check name conflict in target
                const siblings = guestTree.filter(i => {
                    const pId = i.kind === 'folder' ? i.parent_id : i.folder_id;
                    return pId === targetId;
                }).concat(newItems.filter(i => { // Also check against newly created items in this paste batch
                    const pId = i.kind === 'folder' ? i.parent_id : i.folder_id;
                    return pId === targetId;
                }));

                const existingNames = new Set(siblings.map(i => i.name));
                if (existingNames.has(finalName)) {
                    // Deduplicate logic similar to create
                    const extIndex = finalName.lastIndexOf('.');
                    const base = extIndex !== -1 && item.kind === 'file' ? finalName.slice(0, extIndex) : finalName;
                    const ext = extIndex !== -1 && item.kind === 'file' ? finalName.slice(extIndex) : '';
                    let i = 1;
                    while (existingNames.has(`${base} (${i})${ext}`)) i++;
                    finalName = `${base} (${i})${ext}`;
                }

                const newItemId = uuidv4();
                const newItem = {
                    ...item,
                    id: newItemId,
                    name: finalName,
                    // Reset timestamps
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                if (item.kind === 'folder') {
                    (newItem as any).parent_id = targetId;
                } else {
                    (newItem as any).folder_id = targetId;
                    (newItem as any).uuid_r2 = uuidv4(); // Dummy
                }

                newItems.push(newItem);

                // Recursive copy for children if folder
                if (item.kind === 'folder') {
                    const children = guestTree.filter(child => {
                        const pId = child.kind === 'folder' ? child.parent_id : child.folder_id;
                        return pId === item.id;
                    });
                    children.forEach(child => copyGuestItem(child, newItemId));
                }

                return newItem;
            };

            clipboard.items.forEach(item => copyGuestItem(item, targetFolderId));
            setGuestTree(prev => [...prev, ...newItems]);
            // Keep clipboard for multiple copies
        } else {
            // Authenticated Copy
            try {
                const res = await fetch('/api/files/copy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sourceIds: clipboard.items.map(i => i.id),
                        targetFolderId
                    })
                });

                if (!res.ok) throw new Error('Failed to copy items');

                // Refresh target folder
                mutate(`/api/tree?parentId=${targetFolderId || 'null'}`);

            } catch (error) {
                console.error(error);
                alert('Error copying items');
            }
        }
    };

    const saveFile = async (fileId: string, content: string) => {
        if (isGuest) {
            // Guest mode: Update local tree (mock content storage needed?)
            // Currently we don't store file content in guest mode properly for persistence.
            // Be explicit: "Guest mode doesn't support persistent content saving yet" or mock efficiently.
            // For now, let's just log it or alert.
            console.log('Guest save:', fileId, content);
            // Ideally we'd update a 'content' field in the tree item.
        } else {
            try {
                const res = await fetch(`/api/files/${fileId}/content`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: content
                });
                if (!res.ok) throw new Error('Failed to save file');
                mutate(`/api/tree?parentId=null`); // Refresh to update size/time?
            } catch (error) {
                console.error(error);
                throw error;
            }
        }
    };

    return {
        isUploading,
        guestTree,
        createFolder,
        uploadFile,
        deleteItems,
        renameItem,
        moveItems,
        restoreItems,
        permanentDeleteItems,
        downloadFile,
        searchItems,
        createFile,
        clipboard,
        copyItems,
        cutItems,
        pasteItems,
        saveFile
    };
}
