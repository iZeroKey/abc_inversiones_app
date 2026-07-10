"use client";

import { cn } from "@/lib/utils";
import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";

export type InputProps = Omit<
  InputPrimitive.Props & React.RefAttributes<HTMLInputElement>,
  "size"
> & {
  size?: "sm" | "default" | "lg" | number;
  unstyled?: boolean;
  nativeInput?: boolean;
};

export function Input({
  className,
  size = "default",
  unstyled = false,
  nativeInput = false,
  style,
  ...props
}: InputProps): React.ReactElement {
  const inputClassName = cn(
    "w-full min-w-0 rounded-[inherit] px-3.5 bg-transparent outline-none [transition:background-color_5000000s_ease-in-out_0s] placeholder:text-muted-foreground/72 h-10 sm:h-9",
    size === "sm" &&
      "px-3 h-9 sm:h-8",
    size === "lg" && "px-4 h-12 sm:h-10",
    props.type === "search" &&
      "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none",
    props.type === "file" &&
      "file:me-3 file:h-full file:self-center file:bg-transparent file:font-medium file:text-foreground file:text-sm file:leading-none file:py-0 file:inline-flex file:items-center",
  );

  return (
    <span
      className={
        cn(
          !unstyled &&
            "relative inline-flex w-full rounded-2xl border border-transparent bg-foreground/5 text-base text-foreground transition-all has-focus-visible:bg-foreground/10 has-autofill:bg-foreground/10 has-disabled:opacity-64 has-disabled:pointer-events-none has-aria-invalid:bg-destructive/10 sm:text-sm dark:bg-foreground/10 dark:has-autofill:bg-foreground/15 dark:has-focus-visible:bg-foreground/15",
          className,
        ) || undefined
      }
      data-size={size}
      data-slot="input-control"
    >
      {nativeInput ? (
        <input
          className={inputClassName}
          data-slot="input"
          size={typeof size === "number" ? size : undefined}
          style={typeof style === "function" ? undefined : style}
          {...props}
        />
      ) : (
        <InputPrimitive
          className={inputClassName}
          data-slot="input"
          size={typeof size === "number" ? size : undefined}
          style={style}
          {...props}
        />
      )}
    </span>
  );
}

export { InputPrimitive };
