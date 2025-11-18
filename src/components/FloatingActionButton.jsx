import React from 'react';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';

const FloatingActionButton = ({ onClick }) => {
    return (
        <Button
            onClick={onClick}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-40"
            size="icon"
        >
            <Plus className="h-8 w-8" />
        </Button>
    );
};

export default FloatingActionButton;
