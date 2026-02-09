import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Input = forwardRef(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={twMerge(clsx(
                "flex h-12 w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-[4px_4px_0px_0px_var(--color-accent)] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 text-foreground",
                className
            ))}
            ref={ref}
            {...props}
        />
    );
});
Input.displayName = "Input";

export { Input };
