import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation dialog for destructive/irreversible actions. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} className="card w-full max-w-sm p-6 shadow-xl">
      <h2 className="font-display text-lg text-paper">{title}</h2>
      <p className="mt-2 text-sm text-ink-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onCancel} disabled={isBusy}>
          {cancelLabel}
        </button>
        <button
          className={destructive ? 'btn-danger' : 'btn-primary'}
          onClick={onConfirm}
          disabled={isBusy}
        >
          {isBusy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
