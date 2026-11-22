import { toast as sonnerToast } from "sonner";

export interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive" | "success" | "error";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const toast = Object.assign(
  (
    message: string | ToastOptions,
    options?: { description?: React.ReactNode; duration?: number }
  ) => {
    if (typeof message === "string") {
      return sonnerToast(message, options);
    }
    if (message.variant === "destructive" || message.variant === "error") {
      return sonnerToast.error(message.title, {
        description: message.description,
        duration: message.duration,
        action: message.action
          ? {
              label: message.action.label,
              onClick: message.action.onClick,
            }
          : undefined,
      });
    }
    return sonnerToast.success(message.title, {
      description: message.description,
      duration: message.duration,
      action: message.action
        ? {
            label: message.action.label,
            onClick: message.action.onClick,
          }
        : undefined,
    });
  },
  sonnerToast
);

export function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
  };
}
