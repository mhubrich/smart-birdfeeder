import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, label, error, ...props }, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-xs font-medium text-md-primary mb-1 ml-4 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <input
                ref={ref}
                className={cn(
                    "w-full bg-md-surface-container-low px-4 py-3 rounded-t-lg border-b-2 border-md-outline focus:border-md-primary outline-none transition-all text-md-on-surface placeholder:text-md-on-surface-variant/50",
                    error && "border-md-error focus:border-md-error",
                    className
                )}
                {...props}
            />
            {error && (
                <p className="mt-1 ml-4 text-xs text-md-error font-medium">{error}</p>
            )}
        </div>
    )
})
Input.displayName = "Input"

export { Input }
