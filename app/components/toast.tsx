"use client"

type ToastType = "success" | "error" | "warning"

type ToastProps = {
  message: string
  type?: ToastType
  show: boolean
  isExiting?: boolean
}

const toastConfig: Record<
  ToastType,
  { borderColor: string; bgColor: string; iconColor: string; icon: string }
> = {
  success: {
    borderColor: "border-success/20",
    bgColor: "bg-success/10",
    iconColor: "text-success",
    icon: "M5 13l4 4L19 7",
  },
  error: {
    borderColor: "border-error/20",
    bgColor: "bg-error/10",
    iconColor: "text-error",
    icon: "M6 18L18 6M6 6l12 12",
  },
  warning: {
    borderColor: "border-warning/20",
    bgColor: "bg-warning/10",
    iconColor: "text-warning",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
}

export function Toast({ message, type = "success", show, isExiting = false }: ToastProps) {
  if (!show) return null

  const config = toastConfig[type]

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 bg-white rounded-xl shadow-lg border ${config.borderColor} ${
        isExiting ? "animate-toast-out" : "animate-toast-in"
      }`}
      role="alert"
    >
      <div
        className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}
      >
        <svg
          className={`w-5 h-5 ${config.iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d={config.icon}
          />
        </svg>
      </div>
      <span className="text-sm font-medium text-text-primary">{message}</span>
    </div>
  )
}
