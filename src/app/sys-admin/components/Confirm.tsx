"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from "react"

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(async () => false)

export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((o: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setOpts(o)
    })
  }, [])

  const close = (v: boolean) => {
    resolver.current?.(v)
    resolver.current = null
    setOpts(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#16161c] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              {opts.title && <h4 className="text-sm font-bold text-white mb-1.5">{opts.title}</h4>}
              <p className="text-xs text-zinc-400 leading-relaxed">{opts.message}</p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => close(false)}
                className="flex-1 py-2 rounded-lg text-sm text-zinc-300 border border-white/10 hover:bg-white/5 transition"
              >
                {opts.cancelText ?? "取消"}
              </button>
              <button
                onClick={() => close(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white transition ${
                  opts.danger ? "bg-red-600 hover:bg-red-500" : "bg-violet-600 hover:bg-violet-500"
                }`}
              >
                {opts.confirmText ?? "確認"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
