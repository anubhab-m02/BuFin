import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Dialog from '../components/ui/dialog';
import { Select } from '../components/ui/select';
import { User, Shield, Calendar, LogOut, Edit2, Download, Wallet, Target, Brain, AlertTriangle, Moon, Sun, Laptop, Lock, Trash2 } from 'lucide-react';
import { api } from '../lib/api';

const ProfilePage = () => {
    const { isPrivacyMode, togglePrivacyMode } = useFinancial();
    const { user, logout, refreshUser } = useAuth();
    const { theme, setTheme } = useTheme();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Edit Form State
    const [formData, setFormData] = useState({
        full_name: '',
        monthly_income: '',
        currency: 'INR',
        savings_goal: '',
        financial_literacy: 'beginner',
        risk_tolerance: 'low'
    });

    // Password Form State
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordError, setPasswordError] = useState('');

    const openEditModal = () => {
        setFormData({
            full_name: user?.full_name || '',
            monthly_income: user?.monthly_income || '',
            currency: user?.currency || 'INR',
            savings_goal: user?.savings_goal || '',
            financial_literacy: user?.financial_literacy || 'beginner',
            risk_tolerance: user?.risk_tolerance || 'low'
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            await api.updateProfile({
                ...formData,
                monthly_income: parseFloat(formData.monthly_income),
                savings_goal: parseFloat(formData.savings_goal)
            });
            await refreshUser();
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Failed to update profile", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        setPasswordError('');
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError("New passwords do not match");
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            await api.changePassword(passwordData.oldPassword, passwordData.newPassword);
            setIsPasswordModalOpen(false);
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            alert("Password changed successfully");
        } catch (error) {
            setPasswordError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you absolutely sure? This action cannot be undone.")) return;

        setLoading(true);
        try {
            await api.deleteAccount();
            logout();
        } catch (error) {
            console.error("Failed to delete account", error);
            alert("Failed to delete account");
        } finally {
            setLoading(false);
        }
    };

    const handleExportData = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "bufin_data.json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Profile & Settings</h1>
                    <p className="text-muted-foreground">Manage your account, AI persona, and preferences</p>
                </div>
                <Button variant="destructive" size="sm" onClick={logout} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Identity Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4" /> Identity
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={openEditModal}>
                            <Edit2 className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4 pt-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary uppercase">
                            {user?.full_name?.[0] || user?.email?.[0] || 'U'}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{user?.full_name || 'User'}</h3>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Appearance Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Sun className="h-4 w-4" /> Appearance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Theme</label>
                                <p className="text-xs text-muted-foreground">Select your preferred theme</p>
                            </div>
                            <div className="flex items-center gap-2 bg-secondary p-1 rounded-md">
                                <Button
                                    variant={theme === 'light' ? 'default' : 'ghost'}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setTheme('light')}
                                >
                                    <Sun className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={theme === 'dark' ? 'default' : 'ghost'}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setTheme('dark')}
                                >
                                    <Moon className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={theme === 'system' ? 'default' : 'ghost'}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setTheme('system')}
                                >
                                    <Laptop className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Personalization Card */}
                <Card className="md:col-span-2 border-primary/20 bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                            <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                                <Brain className="h-4 w-4" /> AI Personalization
                            </CardTitle>
                            <CardDescription>
                                This data informs your AI Financial Coach's advice and persona.
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={openEditModal} className="gap-2">
                            <Edit2 className="h-3 w-3" /> Edit Persona
                        </Button>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-4 gap-4 pt-4">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Income</span>
                            <div className="font-semibold text-lg">
                                {user?.currency === 'USD' ? '$' : '₹'}{user?.monthly_income?.toLocaleString()}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Savings Goal</span>
                            <div className="font-semibold text-lg">
                                {user?.currency === 'USD' ? '$' : '₹'}{user?.savings_goal?.toLocaleString()}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Risk Tolerance</span>
                            <div className="capitalize px-2 py-1 rounded-full bg-background border w-fit text-sm font-medium">
                                {user?.risk_tolerance}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Financial Literacy</span>
                            <div className="capitalize px-2 py-1 rounded-full bg-background border w-fit text-sm font-medium">
                                {user?.financial_literacy}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Preferences Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
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
                            <div className="text-sm font-bold">{user?.currency || 'INR'} ({user?.currency === 'USD' ? '$' : '₹'})</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Account Settings Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Lock className="h-4 w-4" /> Account Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Change Password</label>
                                <p className="text-xs text-muted-foreground">Update your security credentials</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setIsPasswordModalOpen(true)}>
                                Change
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium text-destructive">Delete Account</label>
                                <p className="text-xs text-muted-foreground">Permanently remove all data</p>
                            </div>
                            <Button variant="destructive" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Management Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Download className="h-4 w-4" /> Data Management
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Export Data</label>
                                <p className="text-xs text-muted-foreground">Download your data as JSON</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleExportData}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Profile Dialog */}
            <Dialog
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Profile"
            >
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Monthly Income</Label>
                            <Input
                                type="number"
                                value={formData.monthly_income}
                                onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select
                                value={formData.currency}
                                onValueChange={(val) => setFormData({ ...formData, currency: val })}
                            >
                                <option value="INR">INR (₹)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Savings Goal</Label>
                        <Input
                            type="number"
                            value={formData.savings_goal}
                            onChange={(e) => setFormData({ ...formData, savings_goal: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Financial Literacy</Label>
                            <Select
                                value={formData.financial_literacy}
                                onValueChange={(val) => setFormData({ ...formData, financial_literacy: val })}
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Risk Tolerance</Label>
                            <Select
                                value={formData.risk_tolerance}
                                onValueChange={(val) => setFormData({ ...formData, risk_tolerance: val })}
                            >
                                <option value="low">Low</option>
                                <option value="moderate">Moderate</option>
                                <option value="high">High</option>
                            </Select>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateProfile} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Change Password Dialog */}
            <Dialog
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                title="Change Password"
            >
                <div className="space-y-4 py-2">
                    {passwordError && (
                        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {passwordError}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>Current Password</Label>
                        <Input
                            type="password"
                            value={passwordData.oldPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <Input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        />
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleChangePassword} disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Delete Account Dialog */}
            <Dialog
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Account"
            >
                <div className="space-y-4 py-2">
                    <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                        <div className="text-sm">
                            <p className="font-semibold">Warning: This action is irreversible!</p>
                            <p className="mt-1 opacity-90">
                                All your data, including transactions, plans, and settings, will be permanently deleted.
                            </p>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={loading}>
                            {loading ? 'Deleting...' : 'Yes, Delete My Account'}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default ProfilePage;
