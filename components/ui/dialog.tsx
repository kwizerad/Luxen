"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

interface DialogContextValue {
  open: boolean;
}

const DialogAnimationContext = React.createContext<DialogContextValue | null>(null)

const Dialog: React.FC<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>> = ({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange]
  )

  const contextValue = React.useMemo(() => ({ open: Boolean(open) }), [open])

  return (
    <DialogAnimationContext.Provider value={contextValue}>
      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange} {...props}>
        {children}
      </DialogPrimitive.Root>
    </DialogAnimationContext.Provider>
  )
}

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} asChild forceMount {...props}>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed inset-0 z-[70] bg-black/60 dark:bg-black/80 backdrop-blur-md",
        className
      )}
    />
  </DialogPrimitive.Overlay>
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideCloseButton?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, hideCloseButton, style, ...props }, ref) => {
  const ctx = React.useContext(DialogAnimationContext)
  const isOpen = ctx ? ctx.open : true

  return (
    <AnimatePresence>
      {isOpen && (
        <DialogPortal forceMount>
          <DialogOverlay />
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 overflow-y-auto pointer-events-none"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <DialogPrimitive.Content
              ref={ref}
              asChild
              forceMount
              {...props}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{
                  type: "spring",
                  damping: 26,
                  stiffness: 340,
                  mass: 0.8,
                }}
                className={cn(
                  "pointer-events-auto relative w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] my-auto grid gap-3 sm:gap-4 overflow-y-auto overscroll-contain border border-border bg-background dark:bg-card p-4 sm:p-6 shadow-2xl rounded-2xl sm:rounded-3xl transform-gpu",
                  className
                )}
                style={{
                  WebkitOverflowScrolling: "touch",
                  ...style,
                }}
              >
                {children}
                {!hideCloseButton && (
                  <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1.5 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </DialogPrimitive.Close>
                )}
              </motion.div>
            </DialogPrimitive.Content>
          </div>
        </DialogPortal>
      )}
    </AnimatePresence>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-base sm:text-lg font-semibold leading-tight tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
