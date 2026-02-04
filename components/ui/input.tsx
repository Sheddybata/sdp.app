import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  valid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, valid, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sdp-primary focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
          valid === true && "border-sdp-accent ring-1 ring-sdp-accent",
          valid === false && "border-red-500",
          className
        )}
        ref={ref}
        aria-invalid={valid === false}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
