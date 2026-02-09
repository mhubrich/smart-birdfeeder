/**
 * @module SightingCard
 * @description Card component displaying a single bird sighting with image/video toggle.
 */

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Download, Edit2, Trash2, Circle, ChevronLeft, ChevronRight, Video, Image as ImageIcon } from 'lucide-react';
import { Card } from './ui/Card';
import { IconButton } from './ui/IconButton';
import { cn } from '../lib/utils';

const SightingCard = ({ sighting, onRefresh, onDelete, onEdit }) => {
    const isRecording = sighting.status === 'recording';
    const [currentSlide, setCurrentSlide] = useState(0); // 0: Image, 1: Video

    const hasVideo = !!sighting.hq_video_path;
    const slides = [
        { type: 'image', src: sighting.hq_snapshot_path ? `/static/${sighting.hq_snapshot_path}` : `/static/${sighting.lq_crop_path}` },
        ...(hasVideo ? [{ type: 'video', src: `/static/${sighting.hq_video_path}` }] : [])
    ];

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) setCurrentSlide(curr => curr + 1);
    };

    const prevSlide = () => {
        if (currentSlide > 0) setCurrentSlide(curr => curr - 1);
    };

    /**
     * Handles downloading the current media (image or video).
     */
    const handleDownload = async () => {
        const slide = slides[currentSlide];
        try {
            const response = await fetch(slide.src);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Generate a filename based on species and timestamp
            let formattedDate = 'unknown_date';
            try {
                if (sighting.timestamp) {
                    const date = new Date(sighting.timestamp);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toISOString().split('T')[0];
                    }
                }
            } catch (e) {
                console.error("Error formatting date for filename", e);
            }

            const speciesName = (sighting.species || 'unknown_bird').toLowerCase().replace(/\s+/g, '_');
            const extension = slide.src.split('.').pop().split('?')[0]; // Remove query params if any
            const filename = `${speciesName}_${formattedDate}_${sighting.id}.${extension}`;

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: trigger a simple browser download
            const link = document.createElement('a');
            link.href = slide.src;
            link.setAttribute('download', '');
            link.click();
        }
    };

    // Date formatting
    const dateStr = sighting.timestamp
        ? formatDistanceToNow(new Date(sighting.timestamp), { addSuffix: true })
        : 'Unknown time';

    return (
        <Card className="overflow-hidden mb-8 flex flex-col bg-white">
            {/* 1. Header */}
            <div className="p-6 pb-4 flex flex-col gap-2">
                {/* Row 1: Title */}
                <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-bold font-display text-foreground tracking-tight">
                        {sighting.species || "Unknown Bird"}
                    </h3>
                    {/* Status Badge if Recording */}
                    {isRecording && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse border-2 border-red-200">
                            RECORDING
                        </span>
                    )}
                </div>

                {/* Row 2: Date (Left) & Count (Right) */}
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span className="font-medium bg-muted px-2 py-0.5 rounded-md border border-border/50">{dateStr}</span>
                    <span className="font-bold bg-tertiary text-foreground px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider border-2 border-foreground shadow-[2px_2px_0px_#1E293B]">
                        {sighting.sightings_count || 1} sighting{sighting.sightings_count !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Row 3: Features / Reason */}
                {sighting.reason && (
                    <div className="mt-2 relative">
                        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-quaternary rounded-full"></div>
                        <p className="text-sm text-slate-600 pl-3 italic leading-relaxed">
                            "{sighting.reason}"
                        </p>
                    </div>
                )}
            </div>

            {/* 2. Media Carousel */}
            <div className="px-4 pb-5">
                <div className="relative aspect-[4/5] bg-slate-900 w-full overflow-hidden rounded-xl border-2 border-foreground group/media">
                    <div
                        className="flex transition-transform duration-700 ease-[cubic-bezier(0.2,0,0,1)] h-full"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                        {slides.map((slide, idx) => (
                            <div key={idx} className="min-w-full h-full relative flex items-center justify-center bg-slate-100">
                                {slide.type === 'image' ? (
                                    <img
                                        src={slide.src}
                                        alt={sighting.species}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover/media:scale-105"
                                        loading="lazy"
                                    />
                                ) : (
                                    <video
                                        src={slide.src}
                                        controls
                                        className="w-full h-full object-contain"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Carousel Controls (only if multiple slides) */}
                    {slides.length > 1 && (
                        <>
                            {/* Dots */}
                            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
                                {slides.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSlide(idx)}
                                        className={cn(
                                            "w-2 h-2 rounded-full transition-all duration-300",
                                            currentSlide === idx
                                                ? "bg-white w-5"
                                                : "bg-white/40 hover:bg-white/80"
                                        )}
                                        aria-label={`Go to slide ${idx + 1}`}
                                    />
                                ))}
                            </div>

                            {/* Slide type indicator icon (Top Right) */}
                            <div className="absolute top-4 right-4 bg-white text-foreground p-2 rounded-full shadow-[2px_2px_0px_#1E293B] border-2 border-foreground transform transition-transform group-hover/media:scale-110">
                                {currentSlide === 0 ? <ImageIcon size={18} /> : <Video size={18} />}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 3. Action Bar */}
            <div className="px-6 py-4 flex justify-between items-center bg-muted/30 border-t-2 border-border">
                <div className="flex gap-3">
                    <IconButton
                        variant="ghost"
                        className="hover:bg-accent/10 hover:text-accent transition-colors"
                        onClick={handleDownload}
                        aria-label="Download"
                    >
                        <Download size={22} strokeWidth={2} />
                    </IconButton>
                    <IconButton
                        variant="ghost"
                        className="hover:bg-accent/10 hover:text-accent transition-colors"
                        onClick={() => onEdit(sighting)}
                        aria-label="Edit"
                    >
                        <Edit2 size={22} strokeWidth={2} />
                    </IconButton>
                </div>

                <IconButton
                    variant="ghost"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    onClick={() => onDelete(sighting.id)}
                    aria-label="Delete"
                >
                    <Trash2 size={22} strokeWidth={2} />
                </IconButton>
            </div>
        </Card>
    );
};

export default SightingCard;
