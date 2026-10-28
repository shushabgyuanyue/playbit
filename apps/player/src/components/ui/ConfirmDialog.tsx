import * as Dialog from "@radix-ui/react-dialog";
import { playerCopy as copy } from "@playbit/content/player";
import { useContext, type ReactNode } from "react";
import { OverlayContainer } from "./Sheet";

export function ConfirmDialog({ open, onClose, title, description, confirmLabel, cancelLabel = copy.cancel, onConfirm, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const container = useContext(OverlayContainer);
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <Dialog.Portal container={container ?? undefined}>
      <Dialog.Overlay className="overlay" />
      <Dialog.Content className="confirm-dialog">
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description>{description}</Dialog.Description>
        {children}
        <div className="confirm-dialog-actions">
          <Dialog.Close asChild><button className="text-button" type="button">{cancelLabel}</button></Dialog.Close>
          <button className="danger-button" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
