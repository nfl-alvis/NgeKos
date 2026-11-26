"use client"

import type { CSSProperties } from "react"
import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const LIGHT_TOAST_VARS = {
  "--normal-bg": "#FFFFFF",
  "--normal-text": "#1A1A1A",
  "--normal-border": "#E5E4DE",
  "--success-bg": "#ECFDF5",
  "--success-border": "#A7F3D0",
  "--success-text": "#065F46",
  "--info-bg": "#EFF6FF",
  "--info-border": "#BFDBFE",
  "--info-text": "#1E40AF",
  "--warning-bg": "#FFFBEB",
  "--warning-border": "#FDE68A",
  "--warning-text": "#92400E",
  "--error-bg": "#FEF2F2",
  "--error-border": "#FECACA",
  "--error-text": "#991B1B",
} as CSSProperties

const Toaster = ({ theme = "light", style, ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={theme}
      richColors
      className="toaster group"
      style={{ ...LIGHT_TOAST_VARS, ...style }}
      icons={{
        success: <CircleCheck className="h-4 w-4 shrink-0" />,
        info: <Info className="h-4 w-4 shrink-0" />,
        warning: <TriangleAlert className="h-4 w-4 shrink-0" />,
        error: <OctagonX className="h-4 w-4 shrink-0" />,
        loading: <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-xl !border !shadow-lg !font-sans",
          title: "!text-sm !font-medium",
          description: "!text-xs !opacity-90",
          actionButton:
            "!bg-nk-accent !text-nk-text-inverse !text-xs !font-medium !rounded-md",
          cancelButton:
            "!bg-nk-warm !text-nk-text !text-xs !font-medium !rounded-md",
          closeButton:
            "!bg-white !text-neutral-600 !border !border-neutral-200 hover:!bg-neutral-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
