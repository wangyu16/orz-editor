
// Helper to determine type category
export const getCategory = (name: string, type?: string): 'image' | 'video' | 'audio' | 'pdf' | 'text_code' | 'markdown_split' | 'unknown' => {
    const fileType = (type || '').toLowerCase();
    const ext = name.split('.').pop()?.toLowerCase() || '';

    if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (fileType.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) return 'video';
    if (fileType.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
    if (fileType === 'application/pdf' || ext === 'pdf') return 'pdf';

    // Text / Code
    if (ext === 'md') return 'markdown_split';
    if (fileType.startsWith('text/') || ['txt', 'py', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'xml'].includes(ext)) return 'text_code';

    return 'unknown';
};
