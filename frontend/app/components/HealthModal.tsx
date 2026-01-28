"use client";

interface HealthStatus {
  status: string;
  backend: string;
  redis: string;
  ollama: string;
  model: string;
}

interface HealthModalProps {
  isOpen: boolean;
  isLoading: boolean;
  healthStatus: HealthStatus | null;
  onClose: () => void;
  onRefresh: () => void;
}

export default function HealthModal({
  isOpen,
  isLoading,
  healthStatus,
  onClose,
  onRefresh,
}: HealthModalProps) {
  if (!isOpen) return null;

  const StatusBadge = ({
    label,
    value,
    expectedValue,
  }: {
    label: string;
    value: string;
    expectedValue: string;
  }) => {
    const isOk = value === expectedValue;
    return (
      <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
        <span className="text-base-content/70">{label}</span>
        <div
          className={`badge ${isOk ? "badge-success" : "badge-error"} gap-1`}
        >
          {isOk ? "✓" : "✗"} {value}
        </div>
      </div>
    );
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-base-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">System Health</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-3">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <span className="text-base-content/70">Checking...</span>
          </div>
        ) : healthStatus ? (
          <div className="space-y-3">
            {/* Overall Status */}
            <div
              className={`alert ${healthStatus.status === "healthy" ? "alert-success" : "alert-warning"}`}
            >
              <span className="font-semibold">
                {healthStatus.status === "healthy"
                  ? "✓ All Systems Healthy"
                  : "⚠ System Degraded"}
              </span>
            </div>

            <StatusBadge
              label="Backend"
              value={healthStatus.backend}
              expectedValue="running"
            />
            <StatusBadge
              label="Redis"
              value={healthStatus.redis}
              expectedValue="connected"
            />
            <StatusBadge
              label="Ollama"
              value={healthStatus.ollama}
              expectedValue="connected"
            />
            <StatusBadge
              label="AI Model"
              value={healthStatus.model}
              expectedValue={
                healthStatus.model?.includes("not found")
                  ? ""
                  : healthStatus.model
              }
            />

            <button className="btn btn-primary w-full mt-4" onClick={onRefresh}>
              Refresh
            </button>
          </div>
        ) : null}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
