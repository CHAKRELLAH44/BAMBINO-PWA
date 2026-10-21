import type { ReactNode } from 'react'

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-rose-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-slate-800">{title}</h1>
        {children}
      </div>
    </main>
  )
}
