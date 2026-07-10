"use client";

import { cn } from "@/lib/utils";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import type React from "react";

export function RadioGroup({
  className,
  ...props
}: RadioGroupPrimitive.Props): React.ReactElement {
  return (
    <RadioGroupPrimitive
      className={cn("flex flex-col gap-3", className)}
      data-slot="radio-group"
      {...props}
    />
  );
}

export function Radio({
  className,
  ...props
}: RadioPrimitive.Root.Props): React.ReactElement {
  return (
    <RadioPrimitive.Root
      className={cn(
        "relative inline-flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 border-input bg-transparent outline-none transition-all duration-200 ease-out active:scale-[0.95] active:brightness-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background data-checked:border-primary aria-invalid:ring-destructive data-disabled:cursor-not-allowed data-disabled:opacity-64 sm:size-4",
        className,
      )}
      data-slot="radio"
      {...props}
    >
      <RadioPrimitive.Indicator
        className="absolute -inset-px flex items-center justify-center rounded-full data-unchecked:hidden data-checked:bg-primary after:size-2 after:rounded-full after:bg-primary-foreground sm:after:size-1.5"
        data-slot="radio-indicator"
      />
    </RadioPrimitive.Root>
  );
}

export { Radio as RadioGroupItem, RadioGroupPrimitive, RadioPrimitive };
