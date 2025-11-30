'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { SyncConfigurationForm } from '@/components/sync/sync-configuration-form'
import { SyncButton } from '@/components/sync/sync-button'
import { SyncStatusCard } from '@/components/sync/sync-status-card'
import { Button } from '@/components/ui/button'
import { useSyncOperations } from '@/hooks/use-sync-operations'

export function SyncDashboard() {
  const {
    status,
    statusLoading,
    statusError,
    refetchStatus,
    configuration,
    configurationLoading,
    updateConfiguration,
    startSync,
    pauseSync,
    resumeSync,
    cancelSync,
    starting,
    controlling,
    updatingConfiguration,
  } = useSyncOperations()

  const configurationKey = configuration
    ? [
        configuration.autoSync ? '1' : '0',
        configuration.batchSize,
        configuration.syncInterval,
        configuration.maxRetries,
        configuration.syncTimeout,
        configuration.enableDuplicateDetection ? '1' : '0',
      ].join('-')
    : 'default'

  const wrap = useCallback(
    async (fn: () => Promise<unknown>, success: string) => {
      try {
        await fn()
        toast.success(success)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Operation failed')
      }
    },
    []
  )

  const infoTabs = useMemo(
    () => [
      {
        id: 'overview',
        label: 'Overview',
        summary:
          'Understand how Real-Debrid metadata is mirrored into DMM with batching, duplicate detection, and cleanup.',
        bulletPoints: [
          'Full sync fetches every file on the first run; incremental sync honors the last successful timestamp.',
          'SHA1 hashes consolidate duplicates so the virtual filesystem stays tidy.',
          'Deleted Real-Debrid entries are removed locally on full sync runs.',
        ],
      },
      {
        id: 'troubleshooting',
        label: 'Troubleshooting',
        summary:
          'Use this checklist whenever syncs fail or stall. Most issues stem from expired tokens or rate-limit bursts.',
        bulletPoints: [
          'Re-authenticate on the Connection page if `/api/sync/start` responds with 401.',
          'Rate-limit errors auto-retry up to three times; reduce batch size or pause/resume to recover faster.',
          'Use the Cancel button to reset a stuck job, then restart with a smaller batch.',
        ],
      },
      {
        id: 'performance',
        label: 'Performance',
        summary:
          'Tune batch sizes and intervals to support large Real-Debrid libraries without overwhelming Supabase.',
        bulletPoints: [
          '50-150 files per batch strikes a balance between throughput and DB load.',
          'Auto-sync interval should stay at or above 30 minutes for heavy accounts.',
          'Monitor duplicates/errors in the stats grid to spot data-quality issues early.',
        ],
      },
    ],
    []
  )

  const [activeTab, setActiveTab] = useState(infoTabs[0]?.id ?? 'overview')
  const activeContent = infoTabs.find((tab) => tab.id === activeTab) ?? infoTabs[0]

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Real-Debrid</p>
          <h1 className="text-3xl font-semibold text-white">File Metadata Synchronization</h1>
          <p className="text-sm text-slate-300">
            Keep your Real-Debrid library mirrored inside DMM with incremental sync, duplicate detection,
            and detailed progress tracking.
          </p>
        </div>
        <Button variant="outline" onClick={() => wrap(() => refetchStatus(), 'Status refreshed')}>
          {statusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} 
          Refresh
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <SyncStatusCard status={status} />
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white">
            <h3 className="text-base font-semibold">Sync Controls</h3>
            <p className="text-xs text-slate-300">Start, pause, resume, or cancel active sync jobs.</p>
            <div className="mt-4">
              <SyncButton
                status={status}
                starting={starting}
                controlling={controlling}
                onStart={() => wrap(() => startSync(), 'Sync started')}
                onPause={() => wrap(() => pauseSync(), 'Sync paused')}
                onResume={() => wrap(() => resumeSync(), 'Sync resumed')}
                onCancel={() => wrap(() => cancelSync(), 'Sync cancelled')}
              />
            </div>
            {statusError && <p className="mt-3 text-xs text-red-200">{statusError}</p>}
          </div>

          <SyncConfigurationForm
            key={configurationKey}
            configuration={configuration}
            updating={updatingConfiguration || configurationLoading}
            onSubmit={(config) => wrap(() => updateConfiguration(config), 'Configuration saved')}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-white">
        <div className="flex flex-wrap gap-2">
          {infoTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                tab.id === activeTab
                  ? 'bg-white text-slate-900'
                  : 'bg-transparent text-slate-300 hover:bg-white/10'
              }`}
              aria-pressed={tab.id === activeTab}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-100">
          <p>{activeContent.summary}</p>
          <ul className="list-disc space-y-2 pl-5 text-slate-300">
            {activeContent.bulletPoints.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
