import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Wider dialog for lists. */
  large?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Base modal: Radix Dialog (focus trap, Esc, a11y) styled with Bootstrap's modal classes in the
 * dark theme. Every window besides the map opens through it.
 */
export const Modal = ({ open, onOpenChange, title, large = false, children, footer }: ModalProps) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="stm-modal-overlay" />
      <DialogPrimitive.Content
        className={`modal-content stm-modal-content${large ? ' stm-modal-lg' : ''}`}
        aria-describedby={undefined}
      >
        <div className="modal-header">
          <DialogPrimitive.Title className="modal-title h5">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="btn-close" aria-label="Fechar" />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);

export default Modal;
