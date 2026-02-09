/**
 * @module Feed
 * @description Displays the chronological list of bird sightings with auto-refresh capabilities.
 */

import React, { useState, useEffect } from 'react';
import SightingCard from './SightingCard';
import { Bell, RefreshCw, LogOut, Bird } from 'lucide-react';
import { IconButton } from './ui/IconButton';
import { Dialog } from './ui/Dialog';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

const Feed = ({ onLogout, onSubscribe }) => {
    const [sightings, setSightings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [editingSighting, setEditingSighting] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Form state for editing
    const [editForm, setEditForm] = useState({ species: '', reason: '' });

    const fetchSightings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sightings?limit=20');
            if (res.ok) {
                const data = await res.json();
                setSightings(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSightings();
        const interval = setInterval(fetchSightings, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleEditClick = (sighting) => {
        setEditForm({ species: sighting.species || '', reason: sighting.reason || '' });
        setEditingSighting(sighting);
    };

    const handleUpdate = async () => {
        if (!editingSighting) return;
        try {
            const res = await fetch(`/api/sightings/${editingSighting.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            if (res.ok) {
                setSightings(sightings.map(s =>
                    s.id === editingSighting.id ? { ...s, ...editForm } : s
                ));
                setEditingSighting(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await fetch(`/api/sightings/${deletingId}`, { method: 'DELETE' });
            setSightings(sightings.filter(s => s.id !== deletingId));
            setDeletingId(null);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 transition-colors relative overflow-hidden">
            {/* Background Decorations */}
            <div className="fixed top-0 left-[-5%] w-96 h-96 bg-tertiary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed top-[20%] right-[10%] w-32 h-32 bg-accent/20 rounded-full blur-xl pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b-2 border-slate-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="p-2 bg-accent text-white rounded-xl shadow-pop border-2 border-foreground transition-transform group-hover:rotate-12 group-hover:scale-110">
                        <Bird size={24} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">
                        Smart Feeder
                    </h1>
                </div>
                <div className="flex gap-2">
                    <IconButton
                        variant="ghost"
                        onClick={onSubscribe}
                        aria-label="Enable Notifications"
                    >
                        <Bell size={24} />
                    </IconButton>
                    <IconButton
                        variant="ghost"
                        onClick={fetchSightings}
                        className={loading ? 'animate-spin' : ''}
                        aria-label="Refresh Feed"
                    >
                        <RefreshCw size={24} />
                    </IconButton>
                    <IconButton
                        variant="ghost"
                        onClick={onLogout}
                        aria-label="Log Out"
                    >
                        <LogOut size={24} />
                    </IconButton>
                </div>
            </header>

            {/* Feed Container */}
            <main className="max-w-xl mx-auto p-6 space-y-10 relative z-10">
                {sightings.length === 0 && !loading ? (
                    <div className="text-center py-20 px-6">
                        <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-foreground border-2 border-foreground shadow-pop">
                            <Bell size={32} />
                        </div>
                        <h3 className="text-xl font-bold font-display text-foreground mb-2">No birds seen yet</h3>
                        <p className="text-muted-foreground text-base text-balance">
                            Your smart camera is watching. New sightings will pop up here!
                        </p>
                    </div>
                ) : (
                    sightings.map(sighting => (
                        <SightingCard
                            key={sighting.id}
                            sighting={sighting}
                            onRefresh={fetchSightings}
                            onDelete={(id) => setDeletingId(id)}
                            onEdit={handleEditClick}
                        />
                    ))
                )}
            </main>

            {/* 1. Edit Dialog */}
            <Dialog
                isOpen={!!editingSighting}
                onClose={() => setEditingSighting(null)}
                title="Edit Sighting"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setEditingSighting(null)}>Cancel</Button>
                        <Button variant="primary" onClick={handleUpdate}>Save Changes</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Species Name</label>
                        <Input
                            value={editForm.species}
                            onChange={(e) => setEditForm({ ...editForm, species: e.target.value })}
                            placeholder="e.g. Northern Cardinal"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Identification Reason</label>
                        <Input
                            value={editForm.reason}
                            onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                            placeholder="Why was this bird identified?"
                        />
                    </div>
                </div>
            </Dialog>

            {/* 2. Confirm Delete Dialog */}
            <Dialog
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                title="Delete Sighting?"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeletingId(null)}>Keep</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                        >
                            Delete Forever
                        </Button>
                    </>
                }
            >
                <p className="text-muted-foreground">
                    This will permanently remove the recording and snapshot of this sighting. This action cannot be undone.
                </p>
            </Dialog>
        </div>
    );
};

export default Feed;
