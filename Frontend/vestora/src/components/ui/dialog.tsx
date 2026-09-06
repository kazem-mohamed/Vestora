"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/55 duration-300 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:duration-150 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * On a phone this is a bottom sheet; from `sm` up it is the centred dialog it always was.
 *
 * A centred box that merely shrinks is the desktop pattern wearing a smaller size: it
 * lands in the middle of the screen, far from the thumb, and its dismissal is a 32px ✕
 * in the corner furthest from it. Anchoring to the bottom edge puts the whole sheet —
 * and its actions — inside thumb reach, which is the only part of a tall phone that is
 * comfortably reachable one-handed.
 *
 * The grabber drags. A handle that only looks draggable is worse than no handle, because
 * it advertises a gesture the surface does not honour, so the pointer handlers below
 * implement the real thing: follow the finger down, release past a threshold to dismiss,
 * spring back otherwise. Dragging is bound to the grabber strip alone rather than the
 * whole sheet, so it can never fight the sheet's own scrolling.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const sheetRef = React.useRef<HTMLDivElement>(null)
  const dragStart = React.useRef<number | null>(null)
  const releaseDismisses = React.useRef(false)

  // Past this much travel the release reads as "dismiss" rather than "I changed my mind".
  const DISMISS_AFTER_PX = 96

  function setOffset(px: number, animate: boolean) {
    const el = sheetRef.current
    if (!el) return
    el.style.transition = animate ? "translate 260ms cubic-bezier(0.22,1,0.36,1)" : ""
    el.style.translate = px === 0 ? "" : `0 ${px}px`
  }

  function onGrabberPointerDown(e: React.PointerEvent<HTMLElement>) {
    dragStart.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onGrabberPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (dragStart.current == null) return
    // Downward only: dragging a bottom sheet up would uncover the page beneath it.
    setOffset(Math.max(0, e.clientY - dragStart.current), false)
  }

  function onGrabberPointerUp(e: React.PointerEvent<HTMLElement>) {
    if (dragStart.current == null) return
    const travelled = e.clientY - dragStart.current
    dragStart.current = null
    // The grabber is itself a Close trigger, so the click that follows this release
    // is what dismisses the sheet. All this has to decide is whether to let it
    // through; a short drag springs back and the click is swallowed below.
    releaseDismisses.current = travelled > DISMISS_AFTER_PX
    setOffset(0, !releaseDismisses.current)
  }

  function onGrabberClick(e: React.MouseEvent) {
    const dismisses = releaseDismisses.current
    releaseDismisses.current = false
    if (!dismisses) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={sheetRef}
        data-slot="dialog-content"
        className={cn(
          // Phone: a sheet on the bottom edge, square where it meets the screen.
          "fixed inset-x-0 bottom-0 z-50 grid max-h-[88svh] w-full gap-4 overflow-y-auto rounded-t-2xl bg-popover p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sm text-popover-foreground shadow-2xl ring-1 ring-foreground/10 outline-none",
          // sm and up: the centred dialog, unchanged.
          "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[85vh] sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-4",
          "[scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
          // The phone entrance is the sheet keyframes in globals.css; these utilities are
          // the desktop one and must not also run on the sheet.
          "sm:duration-300 sm:data-open:animate-in sm:data-open:fade-in-0 sm:data-open:zoom-in-95 sm:data-open:slide-in-from-bottom-4 sm:data-open:ease-[cubic-bezier(0.22,1,0.36,1)]",
          "sm:data-closed:duration-150 sm:data-closed:animate-out sm:data-closed:fade-out-0 sm:data-closed:zoom-out-95 sm:data-closed:slide-out-to-bottom-2",
          className
        )}
        {...props}
      >
        {/* The grabber is a real Close trigger, so releasing a completed drag dismisses
            through base-ui's own path — focus restoration and the exit animation included
            — rather than through a simulated click on some other control. It is kept out
            of the tab order because the ✕ beside it is the accessible way to close; this
            one exists for the thumb. */}
        <DialogPrimitive.Close
          data-slot="dialog-grabber"
          tabIndex={-1}
          aria-hidden
          onPointerDown={onGrabberPointerDown}
          onPointerMove={onGrabberPointerMove}
          onPointerUp={onGrabberPointerUp}
          onPointerCancel={onGrabberPointerUp}
          onClick={onGrabberClick}
          // touch-none claims the vertical gesture from the browser so the drag is
          // never handed off to the sheet's own scrolling.
          className="-mx-4 -mt-4 flex w-[calc(100%+2rem)] touch-none cursor-grab justify-center py-3 active:cursor-grabbing sm:hidden"
        >
          <span className="h-1 w-10 rounded-full bg-foreground/25" />
        </DialogPrimitive.Close>
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        // On the sheet the footer runs to the screen edge and carries the safe-area
        // padding itself, so the home indicator never sits on top of the actions.
        "-mb-[calc(1rem+env(safe-area-inset-bottom))] pb-[calc(1rem+env(safe-area-inset-bottom))]",
        "sm:-mb-4 sm:rounded-b-xl sm:pb-4",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
