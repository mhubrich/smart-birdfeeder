/**
 * @module Feed
 * @description Displays the chronological list of bird sightings with auto-refresh capabilities.
 */

import React, { useState, useEffect } from 'react';
import SightingCard from './SightingCard';
import { Bell, RefreshCw, LogOut, Check, X, Bird } from 'lucide-react';
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
        <div className="min-h-screen bg-md-background text-md-on-background pb-24 transition-colors relative overflow-hidden">
            {/* Background Decorations */}
            <div className="fixed top-0 left-[-10%] w-96 h-96 bg-md-primary/5 blur-[120px] rounded-full pointer-events-none" aria-hidden="true" />
            <div className="fixed bottom-[20%] right-[-10%] w-[500px] h-[500px] bg-md-secondary/5 blur-[150px] rounded-full pointer-events-none" aria-hidden="true" />
            <div className="fixed top-[40%] left-[20%] w-64 h-64 bg-md-tertiary/5 blur-[100px] rounded-full pointer-events-none" aria-hidden="true" />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-md-surface/80 backdrop-blur-md border-b border-md-outline-variant/10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="p-2 bg-md-primary-container/30 text-md-primary rounded-pill transition-transform group-hover:scale-110">
                        <Bird size={24} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-2xl font-bold text-md-primary tracking-tight">
                        Smart Feeder
                    </h1>
                </div>
                <div className="flex gap-2">
                    <IconButton
                        variant="text"
                        onClick={onSubscribe}
                        aria-label="Enable Notifications"
                    >
                        <Bell size={26} />
                    </IconButton>
                    <IconButton
                        variant="text"
                        onClick={fetchSightings}
                        className={loading ? 'animate-spin' : ''}
                        aria-label="Refresh Feed"
                    >
                        <RefreshCw size={26} />
                    </IconButton>
                    <IconButton
                        variant="text"
                        onClick={onLogout}
                        aria-label="Log Out"
                    >
                        <LogOut size={26} />
                    </IconButton>
                </div>
            </header>

            {/* Feed Container */}
            <main className="max-w-md mx-auto p-6 space-y-10">
                {sightings.length === 0 && !loading ? (
                    <div className="text-center py-20 px-6">
                        <div className="bg-md-secondary-container/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-md-secondary">
                            <Bell size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-md-on-surface mb-2">No birds seen yet</h3>
                        <p className="text-md-on-surface-variant text-sm text-balance">
                            Your smart camera is watching. New sightings will appear here automatically.
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
                        <Button variant="text" onClick={() => setEditingSighting(null)}>Cancel</Button>
                        <Button variant="filled" onClick={handleUpdate}>Save Changes</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Species Name"
                        value={editForm.species}
                        onChange={(e) => setEditForm({ ...editForm, species: e.target.value })}
                        placeholder="e.g. Northern Cardinal"
                    />
                    <Input
                        label="Identification Reason"
                        value={editForm.reason}
                        onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                        placeholder="Why was this bird identified?"
                    />
                </div>
            </Dialog>

            {/* 2. Confirm Delete Dialog */}
            <Dialog
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                title="Delete Sighting?"
                footer={
                    <>
                        <Button variant="text" onClick={() => setDeletingId(null)}>Keep</Button>
                        <Button
                            className="bg-md-error text-md-on-error hover:bg-md-error/90"
                            onClick={handleDelete}
                        >
                            Delete Forever
                        </Button>
                    </>
                }
            >
                <p className="text-md-on-surface-variant">
                    This will permanently remove the recording and snapshot of this sighting. This action cannot be undone.
                </p>
            </Dialog>
        </div>
    );
};

export default Feed;
