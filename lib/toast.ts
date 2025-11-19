"use client"

import Toastify from "toastify-js"

type ToastVariant = "success" | "error" | "warning" | "info"

const variantStyles: Record<ToastVariant, Record<string, string>> = {
  success: {
    background: "#16a34a",
    color: "#ffffff",
  },
  error: {
    background: "#dc2626",
    color: "#ffffff",
  },
  warning: {
    background: "#f59e0b",
    color: "#1f2937",
  },
  info: {
    background: "#3b82f6",
    color: "#ffffff",
  },
}

const baseOptions = {
  duration: 4000,
  gravity: "top" as const,
  position: "right" as const,
  stopOnFocus: true,
  close: true,
}

interface ToastOverrides {
  duration?: number
}

function showToast(message: string, variant: ToastVariant, overrides?: ToastOverrides) {
  if (typeof window === "undefined") return
  Toastify({
    text: message,
    ...baseOptions,
    duration: overrides?.duration ?? baseOptions.duration,
    style: variantStyles[variant],
  }).showToast()
}

export const showSuccessToast = (message: string, overrides?: ToastOverrides) =>
  showToast(message, "success", overrides)

export const showErrorToast = (message: string, overrides?: ToastOverrides) => showToast(message, "error", overrides)

export const showWarningToast = (message: string, overrides?: ToastOverrides) =>
  showToast(message, "warning", overrides)

export const showInfoToast = (message: string, overrides?: ToastOverrides) => showToast(message, "info", overrides)
