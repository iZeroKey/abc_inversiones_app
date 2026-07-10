"use client";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { OTPField as OTPFieldPrimitive } from "@base-ui/react/otp-field";
import type * as React from "react";

export function OTPField({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof OTPFieldPrimitive.Root> & {
  size?: "default" | "lg";
}): React.ReactElement {
  return (
    <OTPFieldPrimitive.Root
      className={cn(
        "flex items-center gap-2 has-disabled:opacity-64 has-disabled:**:data-[slot=otp-field-input]:shadow-none has-disabled:**:data-[slot=otp-field-input]:before:shadow-none!",
        className,
      )}
      data-size={size}
      data-slot="otp-field"
      {...props}
    />
  );
}

export function OTPFieldInput({
  className,
  ...props
}: React.ComponentProps<typeof OTPFieldPrimitive.Input>): React.ReactElement {
  return (
    <OTPFieldPrimitive.Input
      className={cn(
        "relative in-[[data-slot=otp-field][data-size=lg]]:size-12 size-10 min-w-0 rounded-2xl border border-transparent bg-foreground/5 text-center in-[[data-slot=otp-field][data-size=lg]]:text-lg text-base text-foreground in-[[data-slot=otp-field][data-size=lg]]:leading-10 leading-10 outline-none transition-all focus-visible:bg-foreground/10 focus-visible:z-10 aria-invalid:bg-destructive/10 sm:in-[[data-slot=otp-field][data-size=lg]]:size-10 sm:size-9 sm:in-[[data-slot=otp-field][data-size=lg]]:text-base sm:text-sm sm:in-[[data-slot=otp-field][data-size=lg]]:leading-9 sm:leading-9 dark:bg-foreground/10 dark:focus-visible:bg-foreground/15",
        className,
      )}
      data-slot="otp-field-input"
      spellCheck={false}
      {...props}
    />
  );
}

export function OTPFieldSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>): React.ReactElement {
  return (
    <OTPFieldPrimitive.Separator
      render={
        <Separator
          className={cn(
            "rounded-full bg-input data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:w-3",
            className,
          )}
          orientation="horizontal"
          {...props}
        />
      }
    />
  );
}

export { OTPFieldPrimitive };
