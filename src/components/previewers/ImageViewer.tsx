import React from 'react';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageViewerProps {
    url: string;
    alt: string;
}

export function ImageViewer({ url, alt }: ImageViewerProps) {
    const [scale, setScale] = React.useState(1);
    const [rotation, setRotation] = React.useState(0);

    return (
        <div className="flex flex-col h-full w-full bg-black/90 relative overflow-hidden">
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex space-x-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm">
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-2 hover:bg-white/10 text-white rounded"><ZoomOut className="w-5 h-5" /></button>
                <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-2 hover:bg-white/10 text-white rounded"><ZoomIn className="w-5 h-5" /></button>
                <button onClick={() => setRotation(r => r + 90)} className="p-2 hover:bg-white/10 text-white rounded"><RotateCw className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 flex items-center justify-center overflow-auto p-8">
                <img
                    src={url}
                    alt={alt}
                    className="max-w-full max-h-full transition-transform duration-200"
                    style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
                />
            </div>
        </div>
    );
}
