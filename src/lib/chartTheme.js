// Shared Recharts styling, sourced from the CSS custom properties in src/index.css so charts
// stay on-brand and adapt automatically to light/dark mode instead of using literal hex values.
// The ramp is the data hue first (the main series), then ink and greys - never a rainbow.
export const CHART_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

// Shared Tooltip content styling (Recharts renders this as inline styles on a wrapper div,
// so it can reference the same CSS vars as the rest of the app). Flat: a border, no shadow.
export const chartTooltipStyle = {
    backgroundColor: 'var(--popover)',
    color: 'var(--popover-foreground)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '12px',
};
