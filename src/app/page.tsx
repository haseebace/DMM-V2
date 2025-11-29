'use client'

import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-8">
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-4 text-3xl font-bold text-white">Welcome to DMM</h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          Transform your Real-Debrid chaos into organized libraries
        </p>
        <Button
          size="lg"
          className="mt-6"
          onClick={() => console.log('Connect to Real-Debrid clicked')}
        >
          Connect to Real-Debrid
        </Button>
      </div>
    </div>
  )
}
