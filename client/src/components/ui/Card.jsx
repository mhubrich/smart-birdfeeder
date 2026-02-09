import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Card = forwardRef(({ className, children, hoverEffect = true, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={twMerge(clsx(
                "bg-card text-card-foreground rounded-2xl border-2 border-foreground shadow-[8px_8px_0px_#E2E8F0] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                hoverEffect && "hover:rotate-[-1deg] hover:scale-[1.02] hover:shadow-[10px_10px_0px_#E2E8F0]",
                className
            ))}
            {...props}
        >
            {children}
        </div>
    );
});

Card.displayName = "Card";

const CardHeader = forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={twMerge(clsx("flex flex-col space-y-1.5 p-6", className))}
        {...props}
    />
));
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={twMerge(clsx("font-display font-bold leading-none tracking-tight text-2xl", className))}
        {...props}
    />
));
CardTitle.displayName = "CardTitle";

const CardContent = forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={twMerge(clsx("p-6 pt-0", className))} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={twMerge(clsx("flex items-center p-6 pt-0", className))}
        {...props}
    />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardContent };
