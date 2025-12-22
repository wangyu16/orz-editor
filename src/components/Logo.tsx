import React from 'react';

export function Logo({ className }: { className?: string }) {
    return (
        <svg
            width="170"
            height="90"
            viewBox="0 0 170 90"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <mask id="text-cutout-ancient">
                    <rect x="0" y="0" width="170" height="90" fill="white" />
                    <text
                        x="50%"
                        y="50%"
                        fill="black"
                        style={{
                            fontFamily: 'var(--font-indie-flower), cursive',
                            fontSize: '125px',
                            fontWeight: 'bold',
                            textAnchor: 'middle',
                            dominantBaseline: 'central'
                        }}
                    >
                        o<tspan dx="-5">r</tspan><tspan dx="-10">z</tspan>
                    </text>
                </mask>
            </defs>

            <rect
                x="0" y="0"
                width="170" height="90"
                rx="34"
                fill="#96d969"
                mask="url(#text-cutout-ancient)"
            />
        </svg>
    );
}
