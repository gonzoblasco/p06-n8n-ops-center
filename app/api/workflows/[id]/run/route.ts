// NOTE: This endpoint is not used in production.
// n8n's REST API does not expose a reliable execution endpoint for workflows
// with a Manual Trigger node. The UI links directly to the n8n editor instead.
// Kept here as a reference in case the trigger type changes or the API adds support.
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workflowId } = await params
  const mcpUrl = process.env.MCP_SERVER_URL ?? 'http://localhost:3001'

  let response: Response
  try {
    response = await fetch(`${mcpUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'run_workflow', arguments: { workflowId, payload: '{}' } },
      }),
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Cannot reach MCP server: ${String(err)}` },
      { status: 502 }
    )
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `MCP server error: ${response.status} ${response.statusText}` },
      { status: 502 }
    )
  }

  const text = await response.text()

  let mcpResult: unknown
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        mcpResult = JSON.parse(line.slice(6))
        break
      } catch {
        // skip malformed lines
      }
    }
  }

  if (!mcpResult) {
    try {
      mcpResult = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Unexpected MCP response format' }, { status: 502 })
    }
  }

  const resultText = (mcpResult as { result?: { content?: { type: string; text: string }[] } })
    ?.result?.content?.[0]?.text

  if (!resultText) {
    return NextResponse.json({ error: 'Empty result from MCP tool' }, { status: 502 })
  }

  let runResult: { executionId: string | null; status: string }
  try {
    runResult = JSON.parse(resultText)
  } catch {
    return NextResponse.json({ error: 'Failed to parse run result JSON' }, { status: 502 })
  }

  return NextResponse.json(runResult)
}
