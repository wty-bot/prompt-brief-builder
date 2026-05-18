import { AlertTriangle } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认删除",
  cancelLabel = "取消",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      role="presentation"
      onMouseDown={onCancel}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oxblood/10 text-oxblood">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/62">{description}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="ghost-button">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-oxblood bg-oxblood px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-oxblood/90"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
