import { Page } from '@/components/page'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Overview })

function Overview() {
  return (
    <Page title="Overview">
      <Link className="text-blue-500" to="/agents">Agents</Link>
    </Page>
  )
}
