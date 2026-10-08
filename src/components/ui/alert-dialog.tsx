import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "../../lib/utils";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTitle = AlertDialogPrimitive.Title;
export const AlertDialogDescription = AlertDialogPrimitive.Description;
export const AlertDialogAction = AlertDialogPrimitive.Action;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;

type AlertDialogContentProps = React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
    container: HTMLElement | null;
};

export const AlertDialogContent = React.forwardRef<React.ElementRef<typeof AlertDialogPrimitive.Content>, AlertDialogContentProps>(
    ({ container, className, ...props }, ref) => container ? (
        <AlertDialogPrimitive.Portal container={container}>
            <AlertDialogPrimitive.Overlay className="chat-dialog-overlay" />
            <AlertDialogPrimitive.Content ref={ref} className={cn("chat-dialog", className)} {...props} />
        </AlertDialogPrimitive.Portal>
    ) : null,
);
AlertDialogContent.displayName = "AlertDialogContent";
