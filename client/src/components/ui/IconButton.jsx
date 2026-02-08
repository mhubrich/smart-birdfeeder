import * as React from "react"
import { Button } from "./Button"
import { cn } from "../../lib/utils"

const IconButton = React.forwardRef(({ className, variant = "text", ...props }, ref) => {
    return (
        <Button
            ref={ref}
            variant={variant}
            size="icon"
            className={cn("rounded-full", className)}
            {...props}
        />
    )
})
IconButton.displayName = "IconButton"

export { IconButton }
