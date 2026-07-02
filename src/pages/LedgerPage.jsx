import React, { useState } from 'react';
import TransactionTable from '../components/TransactionTable';
import { Button } from '../components/ui/button';
import { Settings } from 'lucide-react';
import Dialog from '../components/ui/dialog';
import CategoryManager from '../components/CategoryManager';
import PageHeader from '../components/PageHeader';

const LedgerPage = () => {
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Ledger"
                subtitle="Complete history of all your transactions."
                action={
                    <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Categories
                    </Button>
                }
            />

            <TransactionTable />

            <Dialog
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title="Manage Categories"
            >
                <CategoryManager />
            </Dialog>
        </div>
    );
};

export default LedgerPage;
