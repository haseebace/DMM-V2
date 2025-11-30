'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SyncConfiguration } from '@/lib/sync/sync-service'

interface SyncConfigurationFormProps {
  configuration?: SyncConfiguration
  updating: boolean
  onSubmit: (config: Partial<SyncConfiguration>) => Promise<unknown>
}

const defaults: SyncConfiguration = {
  autoSync: false,
  syncInterval: 30,
  batchSize: 100,
  enableDuplicateDetection: true,
  syncTimeout: 300_000,
  maxRetries: 3,
}

export function SyncConfigurationForm({ configuration, updating, onSubmit }: SyncConfigurationFormProps) {
  const [formState, setFormState] = useState<SyncConfiguration>(configuration || defaults)
  const [dirty, setDirty] = useState(false)

  const handleChange = <K extends keyof SyncConfiguration>(key: K, value: SyncConfiguration[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await onSubmit(formState)
    setDirty(false)
  }

  const handleReset = () => {
    setFormState(configuration || defaults)
    setDirty(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white">
      <div>
        <h3 className="text-base font-semibold">Synchronization Settings</h3>
        <p className="text-xs text-slate-300">Tune how often Real-Debrid metadata is synced.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="batchSize">Batch Size</Label>
          <Input
            id="batchSize"
            type="number"
            min={25}
            max={500}
            value={formState.batchSize}
            onChange={(event) => handleChange('batchSize', Number(event.target.value))}
          />
          <p className="mt-1 text-xs text-slate-400">Files processed per batch (25-500).</p>
        </div>
        <div>
          <Label htmlFor="syncInterval">Auto Sync Interval (minutes)</Label>
          <Input
            id="syncInterval"
            type="number"
            min={5}
            value={formState.syncInterval}
            onChange={(event) => handleChange('syncInterval', Number(event.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="maxRetries">Max Retries</Label>
          <Input
            id="maxRetries"
            type="number"
            min={0}
            max={10}
            value={formState.maxRetries}
            onChange={(event) => handleChange('maxRetries', Number(event.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="syncTimeout">Sync Timeout (ms)</Label>
          <Input
            id="syncTimeout"
            type="number"
            min={30_000}
            step={10_000}
            value={formState.syncTimeout}
            onChange={(event) => handleChange('syncTimeout', Number(event.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
          <input
            type="checkbox"
            checked={formState.autoSync}
            onChange={(event) => handleChange('autoSync', event.target.checked)}
            className="h-4 w-4 rounded border-white/30 bg-transparent"
          />
          <div>
            <p className="font-medium">Enable Auto Sync</p>
            <p className="text-xs text-slate-300">Automatically run sync on the configured interval.</p>
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
          <input
            type="checkbox"
            checked={formState.enableDuplicateDetection}
            onChange={(event) => handleChange('enableDuplicateDetection', event.target.checked)}
            className="h-4 w-4 rounded border-white/30 bg-transparent"
          />
          <div>
            <p className="font-medium">Duplicate Detection</p>
            <p className="text-xs text-slate-300">Use SHA1 hashes to consolidate duplicates.</p>
          </div>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={updating || !dirty}>
          {updating ? 'Saving…' : 'Save Configuration'}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset} disabled={!dirty || updating}>
          Reset
        </Button>
      </div>
    </form>
  )
}
