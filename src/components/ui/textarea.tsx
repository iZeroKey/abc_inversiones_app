"use client";

import { cn } from "@/lib/utils";
import { Field as FieldPrimitive } from "@base-ui/react/field";
import { mergeProps } from "@base-ui/react/merge-props";
import type * as React from "react";

export type TextareaProps = React.ComponentPropsWithoutRef<"textarea"> &
  React.RefAttributes<HTMLTextAreaElement> & {
    size?: "sm" | "default" | "lg" | number;
    unstyled?: boolean;
  };

export function Textarea({
  className,
  size = "default",
  unstyled = false,
  ref,
  ...props
}: TextareaProps): React.ReactElement {
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
      data-slot="textarea-control"
    >
      <FieldPrimitive.Control
        ref={ref}
        value={props.value}
        defaultValue={props.defaultValue}
        disabled={props.disabled}
        id={props.id}
        name={props.name}
        render={(defaultProps: React.ComponentProps<"textarea">) => (
          <textarea
            className={cn(
              "field-sizing-content min-h-20 w-full rounded-[inherit] px-4 py-3 outline-none",
              size === "sm" &&
                "min-h-16 px-3 py-2",
              size === "lg" &&
                "min-h-24 px-5 py-4",
            )}
            data-slot="textarea"
            {...mergeProps(defaultProps, props)}
          />
        )}
      />
    </span>
  );
}

export { FieldPrimitive };
