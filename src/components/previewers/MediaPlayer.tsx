import React from 'react';

interface MediaPlayerProps {
    url: string;
    type: 'video' | 'audio';
    mimeType?: string;
}

export function MediaPlayer({ url, type, mimeType }: MediaPlayerProps) {
    return (
        <div className="flex flex-col h-full w-full bg-black items-center justify-center p-8">
            {type === 'video' ? (
                <video
                    src={url}
                    controls
                    className="max-w-full max-h-full rounded shadow-lg"
                >
                    Your browser does not support the video tag.
                </video>
            ) : (
                <div className="w-full max-w-md bg-zinc-900 p-8 rounded-xl shadow-xl flex flex-col items-center">
                    <div className="w-32 h-32 bg-accent/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <svg className="w-16 h-16 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                    </div>
                    <audio
                        src={url}
                        controls
                        className="w-full"
                    >
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}
        </div>
    );
}
