/**
 * @module ImageLightbox
 * @description Renders a full-screen overlay for zooming and panning an image using a React portal.
 */
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { IconButton } from './ui/IconButton';

/**
 * ImageLightbox
 * 
 * @param {Object} props
 * @param {string} props.src - The source URL of the image to display
 * @param {string} [props.alt] - Alternative text for the image
 * @param {Function} props.onClose - Callback triggered when the lightbox is closed
 * @returns {React.ReactPortal} The rendered portal containing the lightbox
 */
const ImageLightbox = ({ src, alt, onClose }) => {
    // Prevent body scroll when open to ensure the user only scrolls/pans within the lightbox
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const content = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm touch-none">
            <IconButton
                variant="ghost"
                className="absolute top-4 right-4 z-50 text-white/70 hover:text-white hover:bg-white/20"
                onClick={onClose}
                aria-label="Close fullscreen"
            >
                <X size={28} />
            </IconButton>

            <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={5}
                centerOnInit={true}
                doubleClick={{ mode: 'toggle' }}
                pinch={{ disabled: false }}
                wheel={{ wheelDisabled: false }}
            >
                {() => (
                    <TransformComponent
                        wrapperStyle={{ width: "100vw", height: "100vh" }}
                        contentStyle={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                        <img 
                            src={src} 
                            alt={alt || "Zoomed image"} 
                            className="max-w-full max-h-screen object-contain pointer-events-auto cursor-grab active:cursor-grabbing"
                            draggable={false}
                        />
                    </TransformComponent>
                )}
            </TransformWrapper>
        </div>
    );
    
    return createPortal(content, document.body);
};

export default ImageLightbox;
