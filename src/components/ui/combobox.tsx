"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import * as React from "react";

export { ComboboxPrimitive };

export const ComboboxContext: React.Context<{
  chipsRef: React.RefObject<Element | null> | null;
  multiple: boolean;
}> = React.createContext<{
  chipsRef: React.RefObject<Element | null> | null;
  multiple: boolean;
}>({
  chipsRef: null,
  multiple: false,
});

export function Combobox<Value, Multiple extends boolean | undefined = false>(
  props: ComboboxPrimitive.Root.Props<Value, Multiple>,
): React.ReactElement {
  const chipsRef = React.useRef<Element | null>(null);
  return (
    <ComboboxContext.Provider value={{ chipsRef, multiple: !!props.multiple }}>
      <ComboboxPrimitive.Root {...props} />
    </ComboboxContext.Provider>
  );
}

export function ComboboxValue({
  ...props
}: ComboboxPrimitive.Value.Props): React.ReactElement {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

export function ComboboxTrigger({
  className,
  ...props
}: ComboboxPrimitive.Trigger.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Trigger
      aria-label="Abrir"
      className={cn(
        "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent opacity-80 outline-none transition-opacity pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 hover:opacity-100 sm:size-7 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="combobox-trigger"
      {...props}
    >
      <ChevronsUpDownIcon />
    </ComboboxPrimitive.Trigger>
  );
}

export function ComboboxClear({
  className,
  ...props
}: ComboboxPrimitive.Clear.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Clear
      aria-label="Limpiar"
      className={cn(
        "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent opacity-80 outline-none transition-opacity pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 hover:opacity-100 sm:size-7 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="combobox-clear"
      {...props}
    >
      <XIcon />
    </ComboboxPrimitive.Clear>
  );
}

export function ComboboxInput({
  className,
  children,
  disabled,
  showTrigger = true,
  showClear = false,
  size,
  startAddon,
  triggerProps,
  clearProps,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean;
  showClear?: boolean;
  startAddon?: React.ReactNode;
  size?: "sm" | "default" | "lg" | number;
  ref?: React.Ref<HTMLInputElement>;
  triggerProps?: ComboboxPrimitive.Trigger.Props;
  clearProps?: ComboboxPrimitive.Clear.Props;
}): React.ReactElement {
  const sizeValue = (size ?? "default") as "sm" | "default" | "lg" | number;

  return (
    <InputGroup
      className={cn("w-full", className)}
      data-slot="combobox-input-group"
    >
      {startAddon && (
        <InputGroupAddon align="inline-start">
          <span className="opacity-80 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0">
            {startAddon}
          </span>
        </InputGroupAddon>
      )}
      <ComboboxPrimitive.Input
        render={
          <InputGroupInput
            disabled={disabled}
            size={sizeValue as "sm" | "default" | "lg"}
          />
        }
        {...props}
      />
      {showTrigger && (
        <InputGroupAddon align="inline-end">
          <ComboboxPrimitive.Trigger
            aria-label="Abrir"
            className={buttonVariants({ variant: "ghost", size: "icon-xs" })}
            data-slot="combobox-trigger"
            disabled={disabled}
            {...triggerProps}
          >
            <ChevronsUpDownIcon className="pointer-events-none" />
          </ComboboxPrimitive.Trigger>
        </InputGroupAddon>
      )}
      {showClear && (
        <InputGroupAddon align="inline-end">
          <ComboboxPrimitive.Clear
            aria-label="Limpiar"
            className={buttonVariants({ variant: "ghost", size: "icon-xs" })}
            data-slot="combobox-clear"
            {...clearProps}
          >
            <XIcon className="pointer-events-none" />
          </ComboboxPrimitive.Clear>
        </InputGroupAddon>
      )}
      {children}
    </InputGroup>
  );
}

export function ComboboxPopup({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  alignOffset,
  align = "start",
  anchor: anchorProp,
  portalProps,
  ...props
}: ComboboxPrimitive.Popup.Props & {
  align?: ComboboxPrimitive.Positioner.Props["align"];
  sideOffset?: ComboboxPrimitive.Positioner.Props["sideOffset"];
  alignOffset?: ComboboxPrimitive.Positioner.Props["alignOffset"];
  side?: ComboboxPrimitive.Positioner.Props["side"];
  anchor?: ComboboxPrimitive.Positioner.Props["anchor"];
  portalProps?: ComboboxPrimitive.Portal.Props;
}): React.ReactElement {
  const { chipsRef } = React.useContext(ComboboxContext);
  const anchor = anchorProp ?? chipsRef;

  return (
    <ComboboxPrimitive.Portal {...portalProps}>
      <ComboboxPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="z-50 select-none"
        data-slot="combobox-positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <span
          className={cn(
            "relative flex max-h-full min-w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) rounded-lg border bg-popover not-dark:bg-clip-padding shadow-lg/5 transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
            className,
          )}
        >
          <ComboboxPrimitive.Popup
            className="flex max-h-[min(var(--available-height),23rem)] flex-1 flex-col text-foreground"
            data-slot="combobox-popup"
            {...props}
          >
            {children}
          </ComboboxPrimitive.Popup>
        </span>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

export function ComboboxList({
  className,
  ...props
}: ComboboxPrimitive.List.Props): React.ReactElement {
  return (
    <ScrollArea scrollbarGutter scrollFade>
      <ComboboxPrimitive.List
        className={cn(
          "not-empty:scroll-py-1 not-empty:px-1 not-empty:py-1 in-data-has-overflow-y:pe-3",
          className,
        )}
        data-slot="combobox-list"
        {...props}
      />
    </ScrollArea>
  );
}

export function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Item
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1 pe-8 ps-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-64 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      data-slot="combobox-item"
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
        <CheckIcon className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

export function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Separator
      className={cn("mx-2 my-1 h-px bg-border last:hidden", className)}
      data-slot="combobox-separator"
      {...props}
    />
  );
}

export function ComboboxGroup({
  className,
  ...props
}: ComboboxPrimitive.Group.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Group
      className={cn("[[role=group]+&]:mt-1.5", className)}
      data-slot="combobox-group"
      {...props}
    />
  );
}

export function ComboboxGroupLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.GroupLabel
      className={cn(
        "px-2 py-1.5 font-medium text-muted-foreground text-xs",
        className,
      )}
      data-slot="combobox-group-label"
      {...props}
    />
  );
}

export function ComboboxEmpty({
  className,
  ...props
}: ComboboxPrimitive.Empty.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Empty
      className={cn(
        "hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-popup:flex",
        className,
      )}
      data-slot="combobox-empty"
      {...props}
    />
  );
}

export function ComboboxCollection(
  props: ComboboxPrimitive.Collection.Props,
): React.ReactElement {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  );
}

export function ComboboxChips({
  className,
  children,
  startAddon,
  ...props
}: ComboboxPrimitive.Chips.Props & {
  startAddon?: React.ReactNode;
}): React.ReactElement {
  const { chipsRef } = React.useContext(ComboboxContext);

  return (
    <ComboboxPrimitive.Chips
      className={cn(
        "relative flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-2xl border border-transparent bg-foreground/5 px-3.5 py-1.5 text-base outline-none transition-all has-focus-visible:bg-foreground/10 has-disabled:pointer-events-none has-disabled:opacity-64 has-aria-invalid:bg-destructive/10 has-autofill:bg-foreground/10 sm:min-h-9 sm:text-sm dark:bg-foreground/10 dark:has-autofill:bg-foreground/15 dark:has-focus-visible:bg-foreground/15",
        className,
      )}
      data-slot="combobox-chips"
      ref={chipsRef as React.Ref<HTMLDivElement> | null}
      {...props}
    >
      {startAddon && (
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center opacity-80 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none"
          data-slot="combobox-start-addon"
        >
          {startAddon}
        </span>
      )}
      {children}
    </ComboboxPrimitive.Chips>
  );
}

export function ComboboxChip({
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean;
}): React.ReactElement {
  return (
    <ComboboxPrimitive.Chip
      className="flex h-6 w-fit items-center gap-0.5 rounded-full bg-accent ps-2 pe-0.5 text-xs font-medium whitespace-nowrap text-accent-foreground [&_svg:not([class*='size-'])]:size-3.5"
      data-slot="combobox-chip"
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          aria-label="Quitar"
          data-slot="combobox-chip-remove"
          render={
            <span className="inline-flex size-4 items-center justify-center rounded-full outline-none hover:bg-black/10 dark:hover:bg-white/10">
              <XIcon className="size-3" />
            </span>
          }
        />
      )}
    </ComboboxPrimitive.Chip>
  );
}

export function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Input
      className={cn("h-6 min-w-16 flex-1 bg-transparent outline-none", className)}
      data-slot="combobox-chips-input"
      {...props}
    />
  );
}

export const useComboboxFilter: typeof ComboboxPrimitive.useFilter =
  ComboboxPrimitive.useFilter;

export function ComboboxStatus({
  className,
  ...props
}: ComboboxPrimitive.Status.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Status
      className={cn(
        "px-3 py-2 font-medium text-muted-foreground text-xs empty:m-0 empty:p-0",
        className,
      )}
      data-slot="combobox-status"
      {...props}
    />
  );
}


