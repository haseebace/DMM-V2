import { Suspense } from 'react'

import { SyncDashboard } from '@/components/sync/sync-dashboard'

export default function SyncPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <Suspense
          fallback={
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
              Preparing sync dashboard…
            </div>
          }
        >
          <SyncDashboard />
        </Suspense>
      </div>
    </main>
  )
}
