import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Plus, Tag } from 'lucide-react';

const CategoryManager = () => {
    const { categories, addCategory, deleteCategory } = useFinancial();
    const [newCategory, setNewCategory] = useState('');

    const handleAdd = (e) => {
        e.preventDefault();
        if (newCategory.trim()) {
            addCategory(newCategory.trim());
            setNewCategory('');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    placeholder="New Category Name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1"
                />
                <Button onClick={handleAdd} size="icon">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
                {categories.map((category) => (
                    <div
                        key={category}
                        className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm group"
                    >
                        <Tag className="h-3 w-3 opacity-50" />
                        <span>{category}</span>
                        {/* Prevent deleting default categories is handled in context, but we can visually hide the button or show it disabled if we wanted. 
                            For now, we'll show it and let the context logic handle the protection (or lack thereof for flexibility). 
                            Actually, context has protection for DEFAULT_CATEGORIES. */}
                        <button
                            onClick={() => deleteCategory(category)}
                            className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Category"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">
                * Default categories cannot be deleted.
            </p>
        </div>
    );
};

export default CategoryManager;
