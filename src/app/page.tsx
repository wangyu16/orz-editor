'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/explorer/Sidebar';
import { Auth } from '@/components/Auth';
import { ContextMenu } from '@/components/explorer/ContextMenu';
import { ExplorerItem as IExplorerItem } from '@/lib/types';
import { ExplorerItem } from '@/components/explorer/ExplorerItem';
import { useFileSystem } from '@/hooks/useFileSystem';
import { User } from '@supabase/supabase-js';
import { Loader2, Pencil, Trash2, Copy, Download, ExternalLink, RotateCcw, XCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Header } from '@/components/layout/Header';
import { EditorContainer } from '@/components/editors/EditorContainer';
import { ShareDialog } from '@/components/explorer/ShareDialog';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Breadcrumb Title Component
const BreadcrumbTitle = ({ item, isGuest, initialName }: { item: IExplorerItem, isGuest: boolean, initialName: string }) => {
  const { data } = useSWR<{ path: string }>(
    !isGuest && item.kind === 'file' ? `/api/files/${item.id}/breadcrumb` : null,
    fetcher
  );

  if (isGuest) return <span title={initialName}>{initialName}</span>;

  // Auth Mode
  const displayName = data?.path || initialName;
  return <span title={displayName}>{displayName}</span>;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [lastSelectedFolderId, setLastSelectedFolderId] = useState<string | null>(null);
  const [lastFocusedItem, setLastFocusedItem] = useState<IExplorerItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: IExplorerItem } | null>(null);
  const [draggedItems, setDraggedItems] = useState<IExplorerItem[]>([]);
  const [isTrashView, setIsTrashView] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IExplorerItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFile, setActiveFile] = useState<IExplorerItem | null>(null);
  const [shareItem, setShareItem] = useState<IExplorerItem | null>(null);

  const isMobile = useMediaQuery('(max-width: 768px)');

  // Auto-hide sidebar on mobile, show on desktop initially
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const supabase = createClient();
  const { cache } = useSWRConfig();
  const {
    createFolder, uploadFile, isUploading, deleteItems, renameItem,
    moveItems,
    restoreItems,
    permanentDeleteItems,
    downloadFile, guestTree, searchItems, createFile,
    clipboard, copyItems, cutItems, pasteItems, resolveLocalPath, findItem, saveFile
  } = useFileSystem(isGuest);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Ignore if typing in an input or contentEditable (like CodeMirror)
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        // Copy logic
        if (selectedIds.size > 0) {
          // For now, only copy items we can see in current context or guest tree used for both.
          // In auth mode, this selector logic is imperfect as discussed, but sufficient for MVP visible items.
          const itemsToCopy = isGuest || isTrashView ? guestTree.filter(i => selectedIds.has(i.id)) : [];
          // Ideally we need a way to get items by ID for Auth mode even if not in guestTree.
          // We can rely on contextMenu item for now, but for Shortcuts we need `selectedItems`.
          // We can reconstruct `selectedItems` from `guestTree` (if guest) or try to look in cache.
          // Actually `Sidebar` receives `guestItems` but `page.tsx` doesn't hold the full tree for Auth.
          // Let's implement robust 'copy' later for Auth Multi-select via shortcut if this fails.
          // But for now, try to find in current view if possible.
          // MVP: Support Guest Mode shortcuts fully. Auth shortcuts might need `useSWR` cache access or similar.

          // If `guestTree` is used for guest, great.
          if (isGuest) copyItems(guestTree.filter(i => selectedIds.has(i.id)));
          // For Auth, if we are in main view, we might not have the list easily accessible here.
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        if (selectedIds.size > 0 && isGuest) {
          cutItems(guestTree.filter(i => selectedIds.has(i.id)));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteItems(lastSelectedFolderId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, guestTree, isGuest, lastSelectedFolderId, copyItems, cutItems, pasteItems]);

  // Fetch trash items when in trash view (only for authenticated users)
  const { data: trashItems, mutate: mutateTrash } = useSWR<IExplorerItem[]>(
    isTrashView && !isGuest ? '/api/trash' : null,
    fetcher
  );

  // For guest trash, we filter guestTree
  const currentTrashItems = isGuest
    ? guestTree.filter(i => i.is_deleted)
    : trashItems;

  // Bug Fix: Sync activeFile with guestTree to avoid stale content (persistence issue)
  useEffect(() => {
    if (isGuest && activeFile) {
      const freshItem = guestTree.find(i => i.id === activeFile.id);
      if (freshItem && freshItem !== activeFile) {
        // Only update if reference changed (content updated)
        setActiveFile(freshItem);
      }
    }
  }, [guestTree, isGuest, activeFile]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setIsGuest(false);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSelect = (item: IExplorerItem, multi: boolean, range: boolean) => {
    const newSelected = new Set(selectedIds);

    if (range && lastSelectedId) {
      // Handle Range Selection (Shift+Click)
      // Determine parent ID of the clicked item to find siblings
      const parentId = item.kind === 'folder' ? item.parent_id : item.folder_id;
      const swrKey = `/api/tree?parentId=${parentId || 'null'}`;

      // Access SWR Cache directly to find siblings
      // SWR v2 cache .get returns { data, ... } or undefined
      // We must handle safe access
      let cachedSiblings: IExplorerItem[] = [];
      try {
        const cached = cache.get(swrKey);
        cachedSiblings = cached?.data || [];
      } catch (e) {
        console.warn('Failed to access SWR cache', e);
      }

      const visibleItems = isTrashView
        ? (currentTrashItems || [])
        : (isGuest ? guestTree : cachedSiblings);

      const currentList: IExplorerItem[] = visibleItems;

      if (currentList && currentList.length > 0) {
        const lastIndex = currentList.findIndex(i => i.id === lastSelectedId);
        const currentIndex = currentList.findIndex(i => i.id === item.id);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeItems = currentList.slice(start, end + 1);

          // Range select typically resets selection to just the range
          // However, to mimic Ctrl behavior for *other* disjoint ranges, we might keep them.
          // Standard behavior: Shift Click replaces selection but keeps anchor-based range.
          // If user wants to *add* a range to existing complex selection, it's usually Ctrl+Shift.
          // Let's implement simpler standard: Shift+Click replaces selection with the new range.
          // Wait, the user said "shift click behave the same as ctr click... it should be different".
          // If I clear `newSelected`, it clears previous non-range selections.
          // But if I want to maintain the "first to next" behavior, I should clear *unless* Ctrl is also held?
          // Let's stick to adding for now to avoid losing other context, or maybe clear everything?
          // "select from the first to the next not just the clicked ones" implies the Range is what matters.
          // Let's Add to set for safety, but maybe correct standard is replace.

          // Actually, if I shift-click, usually previous selection is cleared EXCEPT the anchor.
          // But my logic `newSelected = new Set(selectedIds)` keeps everything.
          // Let's try to be smart: if modifier is ONLY shift, maybe we should focus on the range.
          // But replacing `newSelected` might annoy if user wanted to add.
          // Safest "Fix": Just ensure the range is added.

          rangeItems.forEach(i => newSelected.add(i.id));
        }
      } else {
        // Fallback if list not available
        newSelected.add(item.id);
      }

    } else if (multi) {
      if (newSelected.has(item.id)) newSelected.delete(item.id);
      else newSelected.add(item.id);
    } else {
      newSelected.clear();
      newSelected.add(item.id);
    }
    setSelectedIds(newSelected);
    setLastSelectedId(item.id);
    setLastFocusedItem(item);

    // Auto-close sidebar on mobile when selecting a file
    if (isMobile && item.kind === 'file') {
      setIsSidebarOpen(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: IExplorerItem) => {
    e.preventDefault();
    if (!selectedIds.has(item.id)) setSelectedIds(new Set([item.id]));
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const currentFolderId = () => {
    if (selectedIds.size !== 1 || !lastFocusedItem) return null;
    if (lastFocusedItem.kind === 'folder') return lastFocusedItem.id;
    return lastFocusedItem.folder_id;
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="animate-spin text-accent" /></div>;
  if (!user && !isGuest) return <Auth onGuest={() => setIsGuest(true)} />;

  return (
    <main className="flex h-screen bg-background overflow-hidden" onClick={() => setContextMenu(null)}>
      <input type="file" className="hidden" ref={fileInputRef} onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) await uploadFile(file, currentFolderId());
      }} />

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Wrapper */}
      <div
        className={cn(
          "h-full bg-sidebar border-r border-border transition-all duration-300 ease-in-out overflow-hidden shrink-0",
          isMobile ? "fixed left-0 top-0 z-30 shadow-2xl" : "relative"
        )}
        style={{ width: isSidebarOpen ? '256px' : '0px' }}
      >
        <div className="w-64 h-full">
          <Sidebar
            className="w-full h-full border-none"
            selectedIds={selectedIds}
            isTrashView={isTrashView}
            isGuest={isGuest}
            guestItems={guestTree}
            user={user}
            onClearSelection={() => {
              setSelectedIds(new Set());
              setLastSelectedId(null);
              setLastSelectedFolderId(null);
            }}
            onSelect={handleSelect}
            onOpen={(item) => {
              if (item.kind === 'file') {
                setActiveFile(item);
              }
              console.log('Open:', item);
            }}
            onNewFolder={async () => {
              const name = prompt('Folder name:');
              if (name) await createFolder(name, lastSelectedFolderId);
            }}
            onUpload={() => fileInputRef.current?.click()}
            onContextMenu={handleContextMenu}
            onDragStart={(e, item) => {
              let itemsToDrag: IExplorerItem[] = [];

              if (selectedIds.has(item.id)) {
                // Multi-select dragging
                if (isGuest) {
                  itemsToDrag = guestTree.filter(i => selectedIds.has(i.id));
                } else if (isTrashView) {
                  itemsToDrag = (currentTrashItems || []).filter(i => selectedIds.has(i.id));
                } else {
                  // Authenticated: try to find in current view if possible, otherwise fallback
                  // We can use the cache strategy similar to Shift+Click
                  const parentId = item.kind === 'folder' ? item.parent_id : item.folder_id;
                  const swrKey = `/api/tree?parentId=${parentId || 'null'}`;
                  let cachedSiblings: IExplorerItem[] = [];
                  try {
                    const cached = cache.get(swrKey);
                    cachedSiblings = cached?.data || [];
                  } catch (err) { /* ignore */ }

                  if (cachedSiblings.length > 0) {
                    itemsToDrag = cachedSiblings.filter(i => selectedIds.has(i.id));
                  }
                }

                // Fallback if nothing found (shouldn't happen if selected)
                if (itemsToDrag.length === 0) itemsToDrag = [item];
              } else {
                // Single item dragging
                itemsToDrag = [item];
              }

              setDraggedItems(itemsToDrag);
              e.dataTransfer.setData('text/plain', item.id);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e, target) => {
              e.preventDefault();
              if (target.kind === 'folder') await moveItems(draggedItems, target.id);
            }}
            onRootDrop={async (e) => {
              e.preventDefault();
              await moveItems(draggedItems, null);
            }}
            onToggleTrash={() => {
              setIsTrashView(!isTrashView);
              setSelectedIds(new Set());
            }}
            onSignOut={async () => {
              await supabase.auth.signOut();
              setIsGuest(false);
              setSelectedIds(new Set());
            }}
            onCreateFile={async (name, type) => {
              // Determine target folder
              let targetFolderId: string | null = null;

              // Priority 1: Use selected item (if we have its context via lastFocusedItem)
              // This is more reliable than reverse-looking up selectedIds from partial data
              if (selectedIds.size > 0 && lastFocusedItem && selectedIds.has(lastFocusedItem.id)) {
                targetFolderId = lastFocusedItem.kind === 'folder'
                  ? lastFocusedItem.id
                  : lastFocusedItem.folder_id;
              }
              // Priority 2: Use currently open file's folder
              else if (activeFile) {
                targetFolderId = activeFile.folder_id;
              }
              // Fallback: Root (null)

              await createFile(name, type, targetFolderId);
            }}
            onSearch={async (query) => {
              setSearchQuery(query);
              if (!query.trim()) {
                setIsSearching(false);
                setSearchResults([]);
                return;
              }
              setIsSearching(true);
              // Debouncing could be added here or in Sidebar input, 
              // but direct call is acceptable for now given small scale.
              const results = await searchItems(query);
              setSearchResults(results);
            }}
            isSearching={isSearching}
            searchResults={searchResults}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-grow flex flex-col min-w-0 bg-background overflow-hidden relative">

        <Header
          title={(() => {
            if (!activeFile) return isTrashView ? 'Trash Bin' : '';


            // Helper to construct full path
            const getPath = (item: IExplorerItem): string => {
              if (isGuest) {
                let path = item.name;
                let current = item;
                const tree = guestTree;

                if (tree.length > 0) {
                  let parentId = current.kind === 'folder' ? current.parent_id : current.folder_id;
                  while (parentId) {
                    const parent = tree.find(i => i.id === parentId);
                    if (parent) {
                      path = `${parent.name} / ${path}`;
                      parentId = parent.kind === 'folder' ? parent.parent_id : null;
                    } else {
                      break;
                    }
                  }
                }
                return path;
              } else {
                // Auth Mode: We can't synchronously calculate without the tree.
                // We'll return the filename initially, but the component below should rely on SWR if possible.
                // HOWEVER: This `getPath` is inside the render function.
                // The cleaner way is to extract a sub-component or hook for the Title.
                // For now, let's optimize: The Header title prop expects a string.
                // We can't do async inside here.
                // We should move this logic OUTSIDE or use a separate component for the Title that handles fetching.
                return item.name; // Fallback for immediate render
              }
            };

            return <BreadcrumbTitle item={activeFile} isGuest={isGuest} initialName={getPath(activeFile)} />;
          })()}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {activeFile && (
            <button
              onClick={() => setActiveFile(null)}
              className="p-2 hover:bg-zinc-800 rounded-lg text-foreground/50 hover:text-white transition-colors"
              title="Close Editor"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </Header>

        <div className="flex-grow overflow-y-auto relative bg-background">
          {activeFile ? (
            <EditorContainer
              file={activeFile}
              onDownload={downloadFile}
              uploadFile={uploadFile}
              createFolder={createFolder}
              resolveLocalPath={resolveLocalPath}
              findItem={findItem}
              saveFile={saveFile}
              isGuest={isGuest}
            />
          ) : (
            /* Explorer / Grid View */
            <div className="px-8 py-6 h-full">
              {isTrashView ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                        <Trash2 className="w-6 h-6 text-red-400" />
                        <span>Trash Bin</span>
                      </h2>
                    </div>
                    {selectedIds.size > 0 && (
                      <div className="flex space-x-3 animate-in fade-in slide-in-from-right-4">
                        <button
                          onClick={() => {
                            const items = currentTrashItems?.filter(i => selectedIds.has(i.id)) || [];
                            restoreItems(items);
                            setSelectedIds(new Set());
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-accent/20 text-accent hover:bg-accent hover:text-white rounded-lg transition-all text-sm font-medium"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Restore Selected</span>
                        </button>
                        <button
                          onClick={() => {
                            const items = currentTrashItems?.filter(i => selectedIds.has(i.id)) || [];
                            permanentDeleteItems(items);
                            setSelectedIds(new Set());
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all text-sm font-medium"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Delete Permanently</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {currentTrashItems?.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-foreground/30">
                      <Trash2 className="w-16 h-16 mb-4 opacity-10" />
                      <p>Trash is empty</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {currentTrashItems?.map(item => (
                        <div key={item.id} onContextMenu={(e) => handleContextMenu(e, item)}>
                          <ExplorerItem
                            item={item}
                            level={0}
                            isSelected={selectedIds.has(item.id)}
                            onSelect={handleSelect}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex-grow flex flex-col items-center justify-center text-foreground/40">
                    <h2 className="text-xl mb-2">
                      {isGuest ? 'Guest Mode (Temporary Storage)' : 'Welcome to ORZ Editor'}
                    </h2>
                    <p className="text-sm">
                      {selectedIds.size > 0 ? `${selectedIds.size} items selected` : 'Select an item to view details'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}
          options={isTrashView ? [
            { label: 'Restore', icon: RotateCcw, onClick: () => restoreItems([contextMenu.item]) },
            { label: 'Delete Permanently', icon: XCircle, onClick: () => permanentDeleteItems([contextMenu.item]), destructive: true },
          ] : [
            {
              label: 'Rename', icon: Pencil, onClick: () => {
                const name = prompt('New name:', contextMenu.item.name);
                if (name) renameItem(contextMenu.item, name);
              }
            },
            { label: 'Cut', icon: ExternalLink, onClick: () => cutItems([contextMenu.item]) },
            { label: 'Copy', icon: Copy, onClick: () => copyItems([contextMenu.item]) },
            {
              label: 'Paste',
              icon: Copy,
              onClick: () => {
                // Paste INTO the target if folder, or SIBLING of target if file
                const target = contextMenu.item.kind === 'folder' ? contextMenu.item.id : contextMenu.item.folder_id;
                pasteItems(target);
              },
              disabled: !clipboard || clipboard.items.length === 0
            },
            { label: 'Delete', icon: Trash2, onClick: () => deleteItems([contextMenu.item]), destructive: true },
            {
              label: 'Download',
              icon: Download,
              onClick: () => downloadFile(contextMenu.item),
              disabled: contextMenu.item.kind === 'folder'
            },
            {
              label: 'Share', icon: ExternalLink, onClick: () => {
                // We need a ShareDialog component. 
                // For now, let's just alert strictly for MVP or better, create a state for showing dialog.
                setShareItem(contextMenu.item);
              }
            },
          ]}
        />
      )}

      {isUploading && (
        <div className="fixed bottom-8 right-8 bg-sidebar border border-border px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-4 animate-in slide-in-from-bottom-4">
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
          <div className="text-sm font-semibold text-white">
            {isGuest ? 'Processing file...' : 'Uploading to R2...'}
          </div>
        </div>
      )}

      {shareItem && (
        <ShareDialog
          item={shareItem}
          isOpen={true}
          onClose={() => setShareItem(null)}
        />
      )}
    </main>
  );
}
