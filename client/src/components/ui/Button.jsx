import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Button = forwardRef(({ className, variant = 'primary', size = 'default', children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-full font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-foreground active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop-active";

    const variants = {
        primary: "bg-accent text-white shadow-pop hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-pop-hover",
        secondary: "bg-transparent text-foreground shadow-none hover:bg-tertiary border-2 border-foreground",
        ghost: "border-transparent bg-transparent hover:bg-muted text-foreground shadow-none active:translate-x-0 active:translate-y-0 active:shadow-none",
        destructive: "bg-red-500 text-white shadow-pop hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-pop-hover",
    };

    const sizes = {
        default: "h-12 px-6 py-2 text-base",
        sm: "h-9 px-4 text-sm",
        lg: "h-14 px-8 text-lg",
        icon: "h-12 w-12 p-0",
    };

    return (
        <button
            ref={ref}
            className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
            {...props}
        >
            {children}
        </button>
    );
});

Button.displayName = "Button";

export { Button };
