"use client";

import { Ban, Copy, Trash2 } from "lucide-react";
import { useEffect } from "react";

export function NodeContextMenu({
  x,
  y,
  disabled,
  onDuplicate,
  onDisable,
  onDelete,
  onClose,
}: {
  x: number;
  y: number;
  disabled: boolean;
  onDuplicate: () => void;
  onDisable: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointer() {
      onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  const left = Math.min(x, window.innerWidth - 200);
  const top = Math.min(y, window.innerHeight - 160);

  return (
    <div
      role="menu"
      className="fixed z-50 min-w-[11.5rem] overflow-hidden rounded-lg border border-steel-800 bg-steel-900 py-1 shadow-lg"
      style={{ left, top }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <MenuItem icon={Copy} label="Duplicate" onClick={onDuplicate} />
      <MenuItem icon={Ban} label={disabled ? "Enable" : "Disable"} onClick={onDisable} />
      <div className="my-1 h-px bg-steel-800" />
      <MenuItem icon={Trash2} label="Delete component" danger onClick={onDelete} />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: typeof Copy;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={
        danger
          ? "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-coral hover:bg-coral/10"
          : "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-foreground hover:bg-background"
      }
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
