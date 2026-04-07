const N8N_BASE_URL = 'https://n8n.srv920035.hstgr.cloud'

export function RunWorkflowButton({ workflowId }: { workflowId: string }) {
  return (
    <a
      href={`${N8N_BASE_URL}/workflow/${workflowId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
    >
      Abrir en n8n
    </a>
  )
}
