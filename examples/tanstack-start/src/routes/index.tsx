import { createFileRoute } from '@tanstack/react-router'
import {
  Pause
} from 'lucide-react'

import { AgentsList } from '@/components/AgentsList'

export const Route = createFileRoute('/')({ component: App })

function App() {

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-200 to-slate-100">
      <section className="relative py-6 px-6 text-center overflow-hidden">
        <div className="flex flex-col items-center justify-center gap-1">
          <h1 className="text-xl md:text-xl font-black">
            <Pause fill='black' stroke='none' height="1em" width="1em" className="inline-block align-[-0.15em]" />
            ElevenLabs
          </h1>
          <h2 className="text-xl">
            TanStack Start example
          </h2>
        </div>
      </section>

      <section className="py-6 px-6 max-w-7xl mx-auto">
        <AgentsList />
      </section>
    </div>
  )
}
