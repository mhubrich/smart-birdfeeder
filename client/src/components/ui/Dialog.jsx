import * as React from "react"
import { cn } from "../../lib/utils"
import { Card } from "./Card"

const Dialog = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Dialog Body */}
            <Card
                className="relative z-10 w-full max-w-sm rounded-[28px] bg-md-surface-container-high p-6 shadow-md-3 animate-in fade-in zoom-in duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
                elevation={0} // Using custom shadow for modal
            >
                {title && (
                    <h2 className="text-2xl font-bold text-md-on-surface mb-4 tracking-tight">
                        {title}
                    </h2>
                )}

                <div className="mb-6">
                    {children}
                </div>

                {footer && (
                    <div className="flex justify-end gap-2">
                        {footer}
                    </div>
                )}
            </Card>
        </div>
    );
};

export { Dialog }
