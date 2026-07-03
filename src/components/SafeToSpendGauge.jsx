import React from 'react';

// 180-degree arc gauge showing how much of today's safe-spend budget has been used.
// Green -> amber -> red at 80%/100% thresholds, matching ThresholdProgress's semantics.
// role="meter" + a text alternative so the value isn't color-only.
const SafeToSpendGauge = ({ pct = 0, size = 220, strokeWidth = 16, color: colorOverride, label }) => {
    const clamped = Math.max(0, Math.min(100, pct));
    const radius = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size / 2;

    // Half-circle arc path from left (180deg) to right (0deg).
    const describeArc = (startAngle, endAngle) => {
        const toRad = (deg) => (deg * Math.PI) / 180;
        const start = { x: cx + radius * Math.cos(toRad(startAngle)), y: cy + radius * Math.sin(toRad(startAngle)) };
        const end = { x: cx + radius * Math.cos(toRad(endAngle)), y: cy + radius * Math.sin(toRad(endAngle)) };
        const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
    };

    const trackPath = describeArc(180, 360);
    // Threshold coloring (green/amber/red) is specific to "% of a budget used" semantics.
    // Callers with different meanings (e.g. a countdown ring) pass an explicit `color`.
    const color = colorOverride || (clamped >= 100 ? 'var(--destructive)' : clamped >= 80 ? 'var(--warning)' : 'var(--success)');
    // Both paths are the full half-circle; the fill's visible length is controlled via
    // strokeDasharray below, which animates smoothly with CSS (path `d` morphing does not).
    const circumference = Math.PI * radius;
    const filledLength = (clamped / 100) * circumference;

    return (
        <svg
            width={size}
            height={size / 2 + strokeWidth}
            viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
            role="meter"
            aria-valuenow={Math.round(clamped)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label || `${Math.round(clamped)}% of today's safe-to-spend budget used`}
        >
            <path
                d={trackPath}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                style={{ stroke: 'var(--border)' }}
            />
            <path
                d={trackPath}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${filledLength} ${circumference}`}
                style={{
                    stroke: color,
                    transition: 'stroke-dasharray var(--motion-slow) ease-out, stroke var(--motion-normal)',
                }}
            />
        </svg>
    );
};

export default SafeToSpendGauge;
