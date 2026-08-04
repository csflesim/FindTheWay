"use client"

import React, { createContext, useContext, useState, useCallback } from "react"

type ToastType = "success" | "error" | "info"
interface ToastState { message: string; type: ToastType }

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-xl transition-all duration-300 ${
          toast.type === "success"
            ? "bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]"
            : toast.type === "error"
            ? "bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]"
            : "bg-[#8b5cf6]/10 border-[#8b5cf6]/30 text-[#a78bfa]"
        }`}>
          <div className="w-2 h-2 rounded-full bg-current" />
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}
