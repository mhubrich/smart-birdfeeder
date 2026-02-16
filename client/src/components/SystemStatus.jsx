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
            className="flex items-center justify-center h-12 w-12 rounded-full transition-colors"
            title={lastHeartbeat ? `Last heartbeat: ${lastHeartbeat.toLocaleString()}` : 'No heartbeat detected'}
        >
            {isOnline ? (
                <Video size={24} className="text-green-500 transition-all hover:scale-110" />
            ) : (
                <VideoOff size={24} className="text-slate-300" />
            )}
        </div>
    );
};

export default SystemStatus;
