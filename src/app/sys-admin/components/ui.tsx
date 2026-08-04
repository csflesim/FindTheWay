"use client"

import React, { useState } from "react"

export function PageHeader({ title, subtitle, badge }: { title: string; subtitle: string; badge?: string }) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          {title}
          {badge && (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-violet-600/20 text-violet-400 border border-violet-500/20 font-normal">
              {badge}
            </span>
          )}
        </h1>
        <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
      </div>
    </header>
  )
}

export function SectionCard({
  title, tag, accent = "violet", children, className = "",
}: {
  title: string; tag?: string; accent?: "violet" | "blue" | "green" | "emerald"
  children: React.ReactNode; className?: string
}) {
  const accentMap: Record<string, string> = {
    violet: "bg-violet-500/10 text-violet-400",
    blue:   "bg-blue-500/10 text-blue-400",
    green:  "bg-green-500/10 text-green-400",
    emerald:"bg-emerald-500/10 text-emerald-400",
  }
  return (
    <section className={`glass-panel rounded-2xl p-5 md:p-6 relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          {tag && <span className={`p-1.5 rounded text-[10px] ${accentMap[accent]}`}>{tag}</span>}
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-zinc-400 flex items-center justify-between">
        <span>{label}</span>
        {hint}
      </label>
      {children}
    </div>
  )
}

export function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [reveal, setReveal] = useState(false)
  return (
    <div className="relative">
      <input type={reveal ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className="glass-input text-sm w-full pr-14 font-mono" />
      <button type="button" onClick={() => setReveal((r) => !r)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 hover:text-violet-400 px-1.5 py-1">
        {reveal ? "隱藏" : "顯示"}
      </button>
    </div>
  )
}
