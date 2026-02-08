import * as React from "react"
import { cn } from "../../lib/utils"

const Card = React.forwardRef(({ className, elevation = 1, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                "rounded-md-lg bg-md-surface-container text-md-on-surface transition-all duration-300 border border-md-outline-variant/10",
                {
                    "shadow-md-1": elevation === 1,
                    "shadow-md-2": elevation === 2,
                    "shadow-md-3": elevation === 3,
                    "shadow-none": elevation === 0,
                },
                "hover:shadow-md-2 hover:border-md-outline-variant/30",
                className
            )}
            {...props}
        />
    )
})
Card.displayName = "Card"

export { Card }
