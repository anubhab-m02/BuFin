import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import Dialog from '../components/ui/dialog';
import JarVisualization from '../components/JarVisualization';
import JarCreationForm from '../components/JarCreationForm';
import ImpulseControl from '../components/ImpulseControl';

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
            <div className="flex justify-between items-end pb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Goals & Jars</h1>
                    <p className="text-muted-foreground mt-1">Your path to guilt-free spending.</p>
                </div>
                <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Jar
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-12 h-[calc(100vh-12rem)]">
                {/* Savings Jars Section */}
                <div className="md:col-span-8 space-y-4 overflow-y-auto pr-2 pb-10">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-semibold text-foreground/80">Your Savings Jars</h2>
                        <span className="text-xs text-muted-foreground">{savingsGoals.length} Active</span>
                    </div>
                    {savingsGoals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-primary/30 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10">
                            <div className="p-4 bg-primary/10 rounded-full mb-4">
                                <Plus className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Start Your First Savings Jar!</h3>
                            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                                AI Suggestion: Create an "Emergency Fund" jar to build financial security.
                            </p>
                            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90">
                                Create Emergency Fund Jar
                            </Button>
                        </div>
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
