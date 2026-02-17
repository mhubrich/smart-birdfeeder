/**
 * @module SystemStatus
 * @description Displays the current status of the Vision Service (Online/Offline) using Lucide icons.
 */

import React, { useState, useEffect } from 'react';
import { Video, VideoOff } from 'lucide-react';

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
        <div
            className="flex items-center justify-center h-12 w-12 rounded-full transition-colors hover:bg-muted cursor-help"
            title={lastHeartbeat ? `Last heartbeat: ${lastHeartbeat.toLocaleString()}` : 'No heartbeat detected'}
            onClick={fetchStatus}
        >
            {isOnline ? (
                <Video size={24} className="text-foreground transition-all" />
            ) : (
                <VideoOff size={24} className="text-foreground transition-all" />
            )}
        </div>
    );
};

export default SystemStatus;
