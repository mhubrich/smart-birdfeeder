/**
 * @module SystemStatus
 * @description Displays the current status of the Vision Service (Online/Offline).
 */

import React, { useState, useEffect } from 'react';

const SystemStatus = () => {
    const [isOnline, setIsOnline] = useState(false);
    const [lastHeartbeat, setLastHeartbeat] = useState(null);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${import.meta.env.BASE_URL}api/system-status`);
            if (res.ok) {
                const data = await res.json();
                setIsOnline(data.isOnline);
                if (data.lastHeartbeat) {
                    setLastHeartbeat(new Date(data.lastHeartbeat));
                }
            }
        } catch (err) {
            console.error("Failed to fetch system status:", err);
            setIsOnline(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center justify-center p-2 bg-background/50 rounded-full border border-border/50 backdrop-blur-sm shadow-sm" title={lastHeartbeat ? `Last heartbeat: ${lastHeartbeat.toLocaleString()}` : 'No heartbeat detected'}>
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
        </div>
    );
};

export default SystemStatus;
