"use client";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div className="toast toast-top toast-end z-50">
      <div
        className={`alert ${type === "success" ? "alert-success" : "alert-error"} shadow-lg`}
      >
        <span>{message}</span>
        <button className="btn btn-ghost btn-xs" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
}
