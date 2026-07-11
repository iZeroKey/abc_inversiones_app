"use client";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field";
import { MinusIcon, PlusIcon } from "lucide-react";
import * as React from "react";

export const NumberFieldContext: React.Context<{
  fieldId: string;
  size?: "sm" | "default" | "lg";
} | null> = React.createContext<{
  fieldId: string;
  size?: "sm" | "default" | "lg";
} | null>(null);

export function NumberField({
  id,
  className,
  size = "default",
  ...props
}: NumberFieldPrimitive.Root.Props & {
  size?: "sm" | "default" | "lg";
}): React.ReactElement {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;

  return (
    <NumberFieldContext.Provider value={{ fieldId, size }}>
      <NumberFieldPrimitive.Root
        className={cn("flex w-full flex-col items-start gap-2", className)}
        data-size={size}
        data-slot="number-field"
        id={fieldId}
        {...props}
      />
    </NumberFieldContext.Provider>
  );
}

export function NumberFieldGroup({
  className,
  ...props
}: NumberFieldPrimitive.Group.Props): React.ReactElement {
  const context = React.useContext(NumberFieldContext);

  return (
    <NumberFieldPrimitive.Group
      className={cn(
        "flex h-10 w-full items-center rounded-2xl border border-transparent bg-foreground/5 transition-all has-focus-visible:bg-foreground/10 has-aria-invalid:bg-destructive/10 sm:h-9 dark:bg-foreground/10 dark:has-focus-visible:bg-foreground/15",
        context?.size === "lg" && "h-12 sm:h-10",
        context?.size === "sm" && "h-9 sm:h-8",
        className,
      )}
      data-slot="number-field-group"
      {...props}
    />
  );
}

export function NumberFieldDecrement({
  className,
  ...props
}: NumberFieldPrimitive.Decrement.Props): React.ReactElement {
  return (
    <NumberFieldPrimitive.Decrement
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-xs" }),
        "pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 relative cursor-pointer text-muted-foreground ms-0.75",
        className,
      )}
      data-slot="number-field-decrement"
      {...props}
    >
      <MinusIcon className="size-3.5" />
    </NumberFieldPrimitive.Decrement>
  );
}

export function NumberFieldIncrement({
  className,
  ...props
}: NumberFieldPrimitive.Increment.Props): React.ReactElement {
  return (
    <NumberFieldPrimitive.Increment
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-xs" }),
        "pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 relative cursor-pointer text-muted-foreground me-0.75",
        className,
      )}
      data-slot="number-field-increment"
      {...props}
    >
      <PlusIcon className="size-3.5" />
    </NumberFieldPrimitive.Increment>
  );
}

export function NumberFieldInput({
  className,
  ...props
}: NumberFieldPrimitive.Input.Props): React.ReactElement {
  const context = React.useContext(NumberFieldContext);

  return (
    <NumberFieldPrimitive.Input
      className={cn(
        "w-full min-w-0 grow bg-transparent px-3.5 text-center tabular-nums outline-none [transition:background-color_5000000s_ease-in-out_0s]",
        context?.size === "lg" ? "h-12 sm:h-10" : context?.size === "sm" ? "h-9 sm:h-8" : "h-10 sm:h-9",
        className,
      )}
      data-slot="number-field-input"
      {...props}
    />
  );
}

export function NumberFieldScrubArea({
  className,
  label,
  ...props
}: NumberFieldPrimitive.ScrubArea.Props & {
  label: string;
}): React.ReactElement {
  const context = React.useContext(NumberFieldContext);

  if (!context) {
    throw new Error(
      "NumberFieldScrubArea must be used within a NumberField component for accessibility.",
    );
  }

  return (
    <NumberFieldPrimitive.ScrubArea
      className={cn("flex cursor-ew-resize", className)}
      data-slot="number-field-scrub-area"
      {...props}
    >
      <Label className="cursor-ew-resize" htmlFor={context.fieldId}>
        {label}
      </Label>
      <NumberFieldPrimitive.ScrubAreaCursor className="drop-shadow-[0_1px_1px_#0008] filter">
        <CursorGrowIcon />
      </NumberFieldPrimitive.ScrubAreaCursor>
    </NumberFieldPrimitive.ScrubArea>
  );
}

export function CursorGrowIcon(
  props: React.ComponentProps<"svg">,
): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      fill="black"
      height="14"
      stroke="white"
      viewBox="0 0 24 14"
      width="26"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M19.5 5.5L6.49737 5.51844V2L1 6.9999L6.5 12L6.49737 8.5L19.5 8.5V12L25 6.9999L19.5 2V5.5Z" />
    </svg>
  );
}

export { NumberFieldPrimitive };

