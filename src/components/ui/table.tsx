import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import * as React from "react";

export function Table({
  className,
  ...props
}: React.ComponentProps<"table">): React.ReactElement {
  return (
    <div
      className="relative w-full min-w-0 max-w-full"
      data-slot="table-container"
    >
      <ScrollArea className="h-auto w-full min-w-0 max-w-full" scrollbarGutter scrollFade>
        <table
          className={cn(
            "w-full caption-bottom border-separate border-spacing-0 text-sm",
            className,
          )}
          data-slot="table"
          {...props}
        />
      </ScrollArea>
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">): React.ReactElement {
  return (
    <thead
      className={cn("sticky top-0 z-10 bg-muted/40 [&_tr]:border-b", className)}
      data-slot="table-header"
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">): React.ReactElement {
  return (
    <tbody
      className={cn("[&_tr:last-child]:border-0", className)}
      data-slot="table-body"
      {...props}
    />
  );
}

export function TableFooter({
  className,
  ...props
}: React.ComponentProps<"tfoot">): React.ReactElement {
  return (
    <tfoot
      className={cn(
        "border-t bg-transparent font-medium [&>tr]:last:border-b-0",
        className,
      )}
      data-slot="table-footer"
      {...props}
    />
  );
}

export const TableRow = React.forwardRef<HTMLTableRowElement, React.ComponentProps<"tr">>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "relative border-b border-black/8 transition-colors duration-150 even:bg-muted/20 hover:bg-black/2.5 dark:hover:bg-white/3 data-[state=selected]:bg-muted/30",
        className,
      )}
      data-slot="table-row"
      {...props}
    />
  )
)
TableRow.displayName = "TableRow"

export function TableHead({
  className,
  ...props
}: React.ComponentProps<"th">): React.ReactElement {
  return (
    <th
      className={cn(
        "h-10 whitespace-nowrap px-3 py-2.5 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-none has-[[role=checkbox]]:w-px last:has-[[role=checkbox]]:ps-0 first:has-[[role=checkbox]]:pe-0",
        className,
      )}
      data-slot="table-head"
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.ComponentProps<"td">): React.ReactElement {
  return (
    <td
      className={cn(
        "whitespace-nowrap bg-clip-padding px-3 py-3.5 align-middle leading-none has-[[role=checkbox]]:w-px last:has-[[role=checkbox]]:ps-0 first:has-[[role=checkbox]]:pe-0",
        className,
      )}
      data-slot="table-cell"
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">): React.ReactElement {
  return (
    <caption
      className={cn("mt-4 text-muted-foreground text-sm", className)}
      data-slot="table-caption"
      {...props}
    />
  );
}
