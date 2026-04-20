import React from 'react';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
    return (
        <Image
            src="/orz-logo.svg"
            width={170}
            height={90}
            alt="orz"
            className={className}
        />
    );
}
