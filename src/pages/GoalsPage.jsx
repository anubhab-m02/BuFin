import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import Dialog from '../components/ui/dialog';
import JarVisualization from '../components/JarVisualization';
import JarCreationForm from '../components/JarCreationForm';
import ImpulseControl from '../components/ImpulseControl';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { PiggyBank } from 'lucide-react';

const GoalsPage = () => {
    const { savingsGoals } = useFinancial();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);

    const handleCreate = () => {
        setEditingGoal(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (goal) => {
        setEditingGoal(goal);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Goals & Jars"
                subtitle="Your path to guilt-free spending."
                action={
                    <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 shadow-sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New Jar
                    </Button>
                }
            />

            <div className="grid gap-6 md:grid-cols-12 h-[calc(100vh-12rem)]">
                {/* Savings Jars Section */}
                <div className="md:col-span-8 space-y-4 overflow-y-auto pr-2 pb-10">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-semibold text-foreground/80">Your Savings Jars</h2>
                        <span className="text-xs text-muted-foreground">{savingsGoals.length} Active</span>
                    </div>
                    {savingsGoals.length === 0 ? (
                        <EmptyState
                            variant="hero"
                            icon={PiggyBank}
                            title="Start your first savings jar"
                            description='AI Suggestion: create an "Emergency Fund" jar to build financial security.'
                            actionLabel="Create Emergency Fund Jar"
                            onAction={handleCreate}
                        />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {savingsGoals.map(goal => (
                                <JarVisualization
                                    key={goal.id}
                                    goal={goal}
                                    onEdit={() => handleEdit(goal)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar: Impulse Control */}
                <div className="md:col-span-4 h-full">
                    <ImpulseControl />
                </div>
            </div>

            <Dialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                title={editingGoal ? "Edit Savings Jar" : "Create Savings Jar"}
            >
                <JarCreationForm
                    initialData={editingGoal}
                    onSuccess={() => setIsDialogOpen(false)}
                />
            </Dialog>
        </div>
    );
};

export default GoalsPage;
