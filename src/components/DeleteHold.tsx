import { HoldButton } from "./bits/HoldButton";
import { IconTrash } from "./Icons";

interface Props {
  label: string;
  onDelete: () => void;
  /** Mặc định 900ms: đủ để một cú bấm trượt không xoá nhầm, mà không bắt chờ lâu —
   *  vì sau đó vẫn còn 6 giây hoàn tác. */
  holdTime?: number;
  /** Chỉ biểu tượng — dùng ở đầu cột, chỗ không đủ rộng cho chữ. */
  compact?: boolean;
  disabled?: boolean;
  title?: string;
}

/**
 * Nút xoá dùng chung: nhấn giữ đến khi màu đỏ dâng đầy mới xoá.
 * Gói HoldButton với đúng token màu của dự án để mọi nút xoá trông như nhau.
 */
export function DeleteHold({
  label,
  onDelete,
  holdTime = 900,
  compact = false,
  disabled,
  title,
}: Props) {
  const colors = {
    backgroundColor: compact ? "transparent" : "var(--danger-wash)",
    fillColor: "var(--danger)",
    textColor: compact ? "var(--ink-2)" : "var(--danger)",
    fillTextColor: "var(--ink-on-danger)",
  };

  if (compact) {
    return (
      <HoldButton
        {...colors}
        size="icon"
        radius={8}
        fillDirection="up"
        waveAmplitude={4}
        glow={false}
        holdTime={holdTime}
        resetAfter={0}
        disabled={disabled}
        ariaLabel={label}
        title={title ?? label}
        doneLabel={<IconTrash size={15} />}
        onHold={onDelete}
      >
        <IconTrash size={15} />
      </HoldButton>
    );
  }

  return (
    <HoldButton
      {...colors}
      size="sm"
      radius={11}
      holdTime={holdTime}
      resetAfter={0}
      disabled={disabled}
      title={title}
      icon={<IconTrash size={15} />}
      doneLabel="Đã xoá"
      onHold={onDelete}
    >
      {label}
    </HoldButton>
  );
}
