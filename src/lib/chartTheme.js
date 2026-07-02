// Shared Recharts styling, sourced from the CSS custom properties in src/index.css so charts
// stay on-brand and adapt automatically to light/dark mode instead of using literal hex values.
export const CHART_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

// Shared Tooltip content styling (Recharts renders this as inline styles on a wrapper div,
// so it can reference the same CSS vars as the rest of the app).
export const chartTooltipStyle = {
    backgroundColor: 'var(--popover)',
    color: 'var(--popover-foreground)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    fontSize: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
};
