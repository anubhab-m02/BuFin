import React from 'react';

// Shared page-title block, replacing the 8 copy-pasted `<h1 className="text-3xl...">` blocks
// across pages so title/subtitle sizing and spacing stay in one place.
const PageHeader = ({ title, subtitle, action }) => (
    <div className="flex justify-between items-end pb-2">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {action}
    </div>
);

export default PageHeader;
