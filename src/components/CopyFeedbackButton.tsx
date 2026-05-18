import { Check, ClipboardCopy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type CopyAction = () => void | boolean | Promise<void | boolean>;

type CopyFeedbackButtonProps = {
  onCopy: CopyAction;
  label?: string;
  copiedLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function CopyFeedbackButton({
  onCopy,
  label = "复制",
  copiedLabel = "已复制",
  className = "",
  disabled = false,
}: CopyFeedbackButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handleClick() {
    if (disabled) return;
    const result = await onCopy();
    if (result === false) return;

    setCopied(true);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => setCopied(false), 1600);
  }

  const Icon = copied ? Check : ClipboardCopy;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-live="polite"
      className={`ghost-button ${className} ${
        copied ? "border-moss/30 bg-moss/10 text-moss hover:bg-moss/12" : ""
      }`}
    >
      <Icon className="h-4 w-4" />
      {copied ? copiedLabel : label}
    </button>
  );
}
