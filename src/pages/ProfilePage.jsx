import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, Shield, Calendar } from 'lucide-react';
import SegmentedControl from '../components/ui/segmented-control';

const ProfilePage = () => {
    const { isPrivacyMode, togglePrivacyMode } = useFinancial();

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Profile & Settings</h1>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Identity Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <User className="h-4 w-4" /> Identity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                            G
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Guddu</h3>
                            <p className="text-sm text-muted-foreground">BuFin Pro User</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Settings Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Shield className="h-4 w-4" /> Privacy & Preferences
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Privacy Mode</label>
                                <p className="text-xs text-muted-foreground">Hide sensitive amounts</p>
                            </div>
                            <Button
                                variant={isPrivacyMode ? "default" : "outline"}
                                size="sm"
                                onClick={togglePrivacyMode}
                            >
                                {isPrivacyMode ? 'On' : 'Off'}
                            </Button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Currency</label>
                                <p className="text-xs text-muted-foreground">Display currency</p>
                            </div>
                            <div className="text-sm font-bold">INR (₹)</div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Reset Date</label>
                                <p className="text-xs text-muted-foreground">Monthly cycle start</p>
                            </div>
                            <div className="text-sm font-bold">1st</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProfilePage;
