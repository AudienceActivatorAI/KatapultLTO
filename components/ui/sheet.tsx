"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | undefined>(
  undefined
);

const Sheet = ({ open = false, onOpenChange, children }: SheetProps) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <SheetContext.Provider value={{ open, onOpenChange: onOpenChange || (() => {}) }}>
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => onOpenChange?.(false)}
          />
          {children}
        </div>
      )}
    </SheetContext.Provider>
  );
};

const SheetContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { side?: "left" | "right" | "top" | "bottom" }
>(({ className, side = "right", children, ...props }, ref) => {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("SheetContent must be used within Sheet");
  }

  return (
    <div
      ref={ref}
      className={cn(
        "fixed z-50 bg-background p-6 shadow-lg transition ease-in-out",
        side === "right" && "right-0 top-0 h-full w-full sm:max-w-lg",
        side === "left" && "left-0 top-0 h-full w-full sm:max-w-lg",
        side === "top" && "top-0 h-auto w-full",
        side === "bottom" && "bottom-0 h-auto w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetClose = () => {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("SheetClose must be used within Sheet");
  }

  return (
    <button
      onClick={() => context.onOpenChange(false)}
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  );
};
SheetClose.displayName = "SheetClose";

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose };
