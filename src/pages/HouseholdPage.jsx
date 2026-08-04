import React, { useState, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Users, Plus, Crown, UserMinus, Copy, LogOut, Trash2 } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';

// One household's member list + invite/role/leave/delete management. Fetches its own
// member list locally (not via FinancialContext) since it's page-specific, transient
// data - only the households list itself (needed by the nav persona switcher) lives in
// the global context.
const HouseholdCard = ({ household, currentUserId, isActive, onSwitch }) => {
    const { leaveHousehold, deleteHousehold } = useFinancial();
    const { toast } = useToast();
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inviteCode, setInviteCode] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const loadMembers = async () => {
        try {
            const list = await api.getHouseholdMembers(household.id);
            setMembers(list);
        } catch (error) {
            console.error('Failed to load members:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadMembers(); }, [household.id]);

    const isOwner = household.role === 'owner';

    const handleGenerateInvite = async () => {
        setIsGenerating(true);
        try {
            const invite = await api.createHouseholdInvite(household.id);
            setInviteCode(invite.code);
        } catch (error) {
            toast({ title: 'Could not create invite', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(inviteCode);
        toast({ title: 'Invite code copied' });
    };

    const handlePromote = async (userId) => {
        try {
            await api.updateHouseholdMemberRole(household.id, userId, 'owner');
            loadMembers();
        } catch (error) {
            toast({ title: 'Could not update role', variant: 'destructive' });
        }
    };

    const handleRemove = async (userId) => {
        try {
            await api.removeHouseholdMember(household.id, userId);
            loadMembers();
        } catch (error) {
            toast({ title: error.message || 'Could not remove member', variant: 'destructive' });
        }
    };

    const handleLeave = async () => {
        try {
            await leaveHousehold(household.id);
        } catch (error) {
            // FinancialContext already surfaces a toast for this
        }
    };

    const handleDelete = async () => {
        try {
            await deleteHousehold(household.id);
        } catch (error) {
            // FinancialContext already surfaces a toast for this
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <CardTitle className="text-base truncate">{household.name}</CardTitle>
                            <CardDescription className="capitalize">{household.role}</CardDescription>
                        </div>
                    </div>
                    {isActive ? (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full shrink-0">Active</span>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => onSwitch(household.id)} className="shrink-0">
                            Switch to this view
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading members...</p>
                    ) : members.map((m) => (
                        <div key={m.user_id} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-7 w-7 shrink-0">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${m.full_name}`} />
                                    <AvatarFallback className="text-[10px]">{m.full_name?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{m.full_name}{m.user_id === currentUserId ? ' (You)' : ''}</p>
                                    <p className="text-xs text-muted-foreground truncate capitalize">{m.role}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {isOwner && m.role !== 'owner' && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Promote to owner" onClick={() => handlePromote(m.user_id)}>
                                        <Crown className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                                {isOwner && m.user_id !== currentUserId && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Remove member" onClick={() => handleRemove(m.user_id)}>
                                        <UserMinus className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {isOwner && (
                    <div className="pt-2 border-t border-border/40">
                        {inviteCode ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-sm font-mono bg-secondary rounded-lg px-3 py-2 tracking-wider">{inviteCode}</code>
                                    <Button variant="outline" size="icon" onClick={handleCopyCode} title="Copy code">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5">Expires in 7 days. Share this code with whoever you want to invite.</p>
                            </>
                        ) : (
                            <Button variant="outline" size="sm" onClick={handleGenerateInvite} disabled={isGenerating}>
                                <Plus className="mr-2 h-4 w-4" />
                                {isGenerating ? 'Generating...' : 'Generate Invite Code'}
                            </Button>
                        )}
                    </div>
                )}

                <div className="pt-2 border-t border-border/40 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleLeave}>
                        <LogOut className="mr-2 h-3.5 w-3.5" />
                        Leave
                    </Button>
                    {isOwner && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete Household
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const HouseholdPage = () => {
    const { households, activeHouseholdId, switchPersona, createHousehold, joinHousehold } = useFinancial();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsCreating(true);
        try {
            await createHousehold(name.trim());
            setName('');
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!code.trim()) return;
        setIsJoining(true);
        try {
            await joinHousehold(code.trim());
            setCode('');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Households" subtitle="Share transactions and goals with the people you live with." />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Create a Household</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="flex gap-3">
                            <Input placeholder="e.g. The Smiths" value={name} onChange={(e) => setName(e.target.value)} />
                            <Button type="submit" disabled={!name.trim() || isCreating}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Join with an Invite Code</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleJoin} className="flex gap-3">
                            <Input placeholder="8-character code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="uppercase tracking-wider" />
                            <Button type="submit" variant="outline" disabled={!code.trim() || isJoining}>
                                Join
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {households.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="No households yet"
                    description="Create one above, or ask someone for an invite code to join theirs."
                />
            ) : (
                <div className="space-y-4">
                    {households.map((h) => (
                        <HouseholdCard
                            key={h.id}
                            household={h}
                            currentUserId={user?.id}
                            isActive={activeHouseholdId === h.id}
                            onSwitch={switchPersona}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default HouseholdPage;
