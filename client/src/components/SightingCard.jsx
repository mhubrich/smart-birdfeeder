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

    // Date formatting
    const dateStr = sighting.timestamp
        ? formatDistanceToNow(new Date(sighting.timestamp), { addSuffix: true })
        : 'Unknown time';

    return (
        <Card className="overflow-hidden mb-8 flex flex-col group/card hover:scale-[1.01] active:scale-[0.99] transition-transform">
            {/* 1. Header */}
            <div className="p-6 pb-4 flex flex-col gap-1.5">
                {/* Row 1: Title */}
                <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-bold text-md-on-surface tracking-tight">
                        {sighting.species || "Unknown Bird"}
                    </h3>
                    {/* Status Badge if Recording */}
                    {isRecording && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-md-error-container text-md-on-error-container animate-pulse shadow-sm">
                            RECORDING
                        </span>
                    )}
                </div>

                {/* Row 2: Date (Left) & Count (Right) */}
                <div className="flex justify-between items-center text-sm text-md-on-surface-variant/80">
                    <span className="font-medium">{dateStr}</span>
                    <span className="font-bold bg-md-secondary-container text-md-on-secondary-container px-2.5 py-1 rounded-md-sm text-[10px] uppercase tracking-wider">
                        {sighting.sightings_count || 1} sighting{sighting.sightings_count !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Row 3: Features / Reason */}
                {sighting.reason && (
                    <p className="text-sm text-md-on-surface-variant/70 mt-2 line-clamp-3 italic leading-relaxed">
                        "{sighting.reason}"
                    </p>
                )}
            </div>

            {/* 2. Media Carousel */}
            <div className="px-4 pb-5">
                <div className="relative aspect-[4/5] bg-black w-full overflow-hidden rounded-md-lg group/media shadow-inner">
                    <div
                        className="flex transition-transform duration-700 ease-[cubic-bezier(0.2,0,0,1)] h-full"
                        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                        {slides.map((slide, idx) => (
                            <div key={idx} className="min-w-full h-full relative flex items-center justify-center bg-md-surface-container-highest">
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
                            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-full">
                                {slides.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSlide(idx)}
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                            currentSlide === idx
                                                ? "bg-white w-4"
                                                : "bg-white/40 hover:bg-white/80"
                                        )}
                                        aria-label={`Go to slide ${idx + 1}`}
                                    />
                                ))}
                            </div>

                            {/* Slide type indicator icon (Top Right) */}
                            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-full text-white/90 shadow-md transform transition-transform group-hover/media:scale-110">
                                {currentSlide === 0 ? <ImageIcon size={18} /> : <Video size={18} />}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 3. Action Bar */}
            <div className="px-6 py-4 flex justify-between items-center bg-md-surface-container-low/30 border-t border-md-outline-variant/10">
                <div className="flex gap-3">
                    <IconButton
                        variant="text"
                        className="text-md-on-surface-variant hover:text-md-primary transition-colors"
                        aria-label="Download"
                    >
                        <Download size={24} strokeWidth={1.5} />
                    </IconButton>
                    <IconButton
                        variant="text"
                        className="text-md-on-surface-variant hover:text-md-primary transition-colors"
                        onClick={() => onEdit(sighting)}
                        aria-label="Edit"
                    >
                        <Edit2 size={24} strokeWidth={1.5} />
                    </IconButton>
                </div>

                <IconButton
                    variant="text"
                    className="text-md-error hover:text-md-error hover:bg-md-error/10 transition-colors"
                    onClick={() => onDelete(sighting.id)}
                    aria-label="Delete"
                >
                    <Trash2 size={24} strokeWidth={1.5} />
                </IconButton>
            </div>
        </Card>
    );
};

export default SightingCard;
