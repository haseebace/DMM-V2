import {
  Activity,
  Database,
  Info,
  Settings as SettingsIcon,
  Shield,
  User,
  Wifi,
} from 'lucide-react'

import { ConnectionCard } from '@/components/connection/connection-card'
import { ConnectionStatusBadge } from '@/components/connection/connection-status-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-8 px-4">
        <div className="space-y-2 text-center">
          <h1 className="flex items-center justify-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your Real-Debrid connection, synchronization preferences, and learn more about Debrid Media Manager.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ConnectionCard />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Quick Stats
              </CardTitle>
              <CardDescription>Overall health of your Real-Debrid workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Wifi className="h-4 w-4 text-emerald-500" />
                    Connection
                  </span>
                  <ConnectionStatusBadge />
                </div>
                <p className="text-xs text-muted-foreground">Live status of the Real-Debrid integration.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Database className="h-4 w-4 text-sky-500" />
                  Synchronization
                </div>
                <p className="text-xs text-muted-foreground">
                  Kick off a manual sync from the connection card whenever you need fresh metadata.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-purple-500" />
                  Security
                </div>
                <p className="text-xs text-muted-foreground">
                  Access tokens are stored securely in Supabase and automatically refreshed when required.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="connection">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connection" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Connection
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Synchronization
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connection Management</CardTitle>
                <CardDescription>
                  DMM continuously validates your Real-Debrid tokens and surfaces actionable errors with retry and reconnect controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>View current account details, monitor API health, and disconnect when troubleshooting your setup.</p>
                <p>Connection checks run automatically every minute, and manual refresh is available whenever you need real-time confirmation.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Synchronization Settings</CardTitle>
                <CardDescription>Advanced synchronization options will be added in upcoming updates.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>The manual sync control inside the connection card lets you refresh metadata whenever you want. Automatic scheduling preferences will arrive soon.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account & Security</CardTitle>
                <CardDescription>Overview of how tokens are stored and refreshed.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Your Real-Debrid tokens are stored in the project database with server-side access only. Disconnecting from the connection card clears cached tokens immediately.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>About Debrid Media Manager</CardTitle>
                <CardDescription>Virtual organization for your Real-Debrid library.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>DMM keeps your Real-Debrid files tidy with metadata synchronization, manual organization, and upcoming folder tooling.</p>
                <p>Only metadata is stored locally; the actual files stay on Real-Debrid at all times.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
