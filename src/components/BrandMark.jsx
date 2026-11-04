import React from 'react';

// The product mark: a "b" whose bowl is a coin.
const BrandMark = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="4" y="2.5" width="3" height="19" rx="1.5" fill="currentColor" />
        <circle cx="14" cy="14.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
);

export default BrandMark;
