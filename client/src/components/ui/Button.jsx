import * as React from "react"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({ className, variant = "filled", size = "default", children, ...props }, ref) => {
    const variants = {
        filled: "bg-md-primary text-md-on-primary hover:shadow-md active:scale-95 after:absolute after:inset-0 after:rounded-pill after:bg-md-on-primary after:opacity-0 hover:after:opacity-[0.08] active:after:opacity-[0.12]",
        tonal: "bg-md-secondary-container text-md-on-secondary-container hover:shadow-md active:scale-95 after:absolute after:inset-0 after:rounded-pill after:bg-md-on-secondary-container after:opacity-0 hover:after:opacity-[0.08] active:after:opacity-[0.12]",
        text: "text-md-primary bg-transparent hover:bg-md-primary/10 active:bg-md-primary/12 active:scale-95",
        outline: "border border-md-outline text-md-primary bg-transparent hover:bg-md-primary/10 active:bg-md-primary/12 active:scale-95"
    }

    const sizes = {
        default: "h-10 px-6 text-sm font-medium",
        sm: "h-9 px-4 text-xs font-medium",
        lg: "h-12 px-8 text-base font-medium",
        icon: "h-10 w-10 p-0 flex items-center justify-center"
    }

    return (
        <button
            ref={ref}
            className={cn(
                "relative inline-flex items-center justify-center rounded-pill transition-all duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            <span className="relative z-10 flex items-center gap-2">{children}</span>
        </button>
    )
})
Button.displayName = "Button"

export { Button }
