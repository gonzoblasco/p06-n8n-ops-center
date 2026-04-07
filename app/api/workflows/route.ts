import { NextResponse } from 'next/server'

type Workflow = {
  id: string
  name: string
  active: boolean
  updatedAt: string
}

export async function GET() {
  const mcpUrl = process.env.MCP_SERVER_URL ?? 'http://localhost:3001'

  let response: Response
  try {
    response = await fetch(`${mcpUrl}/mcp`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'list_workflows', arguments: {} },
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

  // Parse SSE lines: "data: {...}"
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

  // If not SSE, try parsing the whole body as JSON
  if (!mcpResult) {
    try {
      mcpResult = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Unexpected MCP response format' }, { status: 502 })
    }
  }

  const result = (mcpResult as { result?: { content?: { type: string; text: string }[] } })
    ?.result?.content?.[0]?.text

  if (!result) {
    return NextResponse.json({ error: 'Empty result from MCP tool' }, { status: 502 })
  }

  let workflows: Workflow[]
  try {
    workflows = JSON.parse(result)
  } catch {
    return NextResponse.json({ error: 'Failed to parse workflows JSON' }, { status: 502 })
  }

  return NextResponse.json(workflows)
}
