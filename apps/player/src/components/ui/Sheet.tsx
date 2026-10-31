import * as Dialog from "@radix-ui/react-dialog";
import { playerCopy as copy } from "@playbit/content/player";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export const OverlayContainer = createContext<HTMLElement | null>(null);

export function Sheet({ open, onClose, title, eyebrow, description, variant = "sheet", className = "", children }: {
  open: boolean; onClose: () => void; title: string; eyebrow?: string; description?: string;
  variant?: "sheet" | "drawer"; className?: string; children: ReactNode;
}) {
  const container = useContext(OverlayContainer);
  const [present, setPresent] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setPresent(true);
      setClosing(false);
      return;
    }
    setClosing(true);
    const timer = window.setTimeout(() => {
      setPresent(false);
      setClosing(false);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [open]);
  const dialogOpen = open || present;
  const closingClass = closing && !open ? "is-closing" : "";
  return <Dialog.Root open={dialogOpen} onOpenChange={value => { if (!value) onClose(); }}>
    <Dialog.Portal container={container ?? undefined}>
      {(open || present) && <>
        <Dialog.Overlay className={`overlay ${closingClass}`} />
        <Dialog.Content className={`${variant === "drawer" ? "drawer" : "save-sheet"} dialog-content ${className} ${closingClass}`} aria-describedby={description ? undefined : undefined}>
          <div className="sheet-handle" aria-hidden="true" />
          <div className="drawer-head"><div>{eyebrow && <small>{eyebrow}</small>}<Dialog.Title>{title}</Dialog.Title></div><Dialog.Close className="icon-btn" aria-label={copy.close}><Icon name="close" /></Dialog.Close></div>
          {description ? <Dialog.Description className="muted">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
          {children}
        </Dialog.Content>
      </>}
    </Dialog.Portal>
  </Dialog.Root>;
}
