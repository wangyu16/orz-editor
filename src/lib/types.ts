export type ItemKind = 'file' | 'folder';

export interface Folder {
    id: string;
    name: string;
    parent_id: string | null;
    user_id: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    kind: 'folder';
}

export interface FileMetadata {
    id: string;
    name: string;
    folder_id: string | null;
    user_id: string;
    type: string;
    size: number;
    uuid_r2: string;
    is_deleted: boolean;
    public_link_expired_at: string | null;
    created_at: string;
    updated_at: string;
    kind: 'file';
}

export type ExplorerItem = Folder | FileMetadata;
