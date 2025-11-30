import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SyncStatus } from '@/lib/sync/sync-service'
import { cn } from '@/lib/utils'

interface SyncStatusCardProps {
  status?: SyncStatus
}

const statusColorMap: Record<SyncStatus['status'], string> = {
  idle: 'bg-slate-200 text-slate-900',
  running: 'bg-emerald-100 text-emerald-900',
  paused: 'bg-amber-100 text-amber-900',
  completed: 'bg-blue-100 text-blue-900',
  error: 'bg-red-100 text-red-900',
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export function SyncStatusCard({ status }: SyncStatusCardProps) {
  const chipClass = status ? statusColorMap[status.status] : statusColorMap.idle
  const percentage = status?.progress.percentage ?? 0

  return (
    <Card className="bg-white/5 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-white">File Synchronization</CardTitle>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold capitalize', chipClass)}>
          {status?.status ?? 'idle'}
        </span>
      </CardHeader>
      <CardContent className="space-y-6 text-sm text-slate-100">
        <div>
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-300">
            <span>Progress</span>
            <span>{percentage}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10">
            <div
              className={cn('h-full rounded-full transition-all', percentage >= 100 ? 'bg-emerald-400' : 'bg-sky-400')}
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-300">
            {status?.progress.processed ?? 0} / {status?.progress.total ?? 0} items •{' '}
            {status?.progress.current ?? 'No active sync'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-5">
          {[
            { label: 'Added', value: status?.stats.added ?? 0 },
            { label: 'Updated', value: status?.stats.updated ?? 0 },
            { label: 'Duplicates', value: status?.stats.duplicates ?? 0 },
            { label: 'Deleted', value: status?.stats.deleted ?? 0 },
            { label: 'Errors', value: status?.stats.errors ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-md border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">{stat.label}</p>
              <p className="text-xl font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Started</p>
            <p className="text-white">{formatDate(status?.timing.started)}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Last Sync</p>
            <p className="text-white">{formatDate(status?.lastSync)}</p>
          </div>
        </div>

        {status?.status === 'completed' && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-300/30 bg-emerald-500/10 p-3 text-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
            <span>Synchronization finished successfully.</span>
          </div>
        )}

        {status?.status === 'error' && status?.error && (
          <div className="flex items-center gap-2 rounded-md border border-red-300/30 bg-red-500/10 p-3 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <span>{status.error}</span>
          </div>
        )}

        {!status && (
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 p-3 text-slate-200">
            <Info className="h-4 w-4" />
            <span>No sync history yet. Start your first synchronization to populate the virtual library.</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
