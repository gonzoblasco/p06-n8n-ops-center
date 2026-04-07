import { NextResponse } from 'next/server'

type ExecutionDetail = {
  id: string
  status: string
  startedAt: string
  stoppedAt: string | null
  mode: string
  error?: {
    message: string
    nodeName: string | null
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ execId: string }> }
) {
  const { execId } = await params
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
        params: { name: 'get_execution_detail', arguments: { executionId: execId } },
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

  const result = (mcpResult as { result?: { content?: { type: string; text: string }[] } })
    ?.result?.content?.[0]?.text

  if (!result) {
    return NextResponse.json({ error: 'Empty result from MCP tool' }, { status: 502 })
  }

  let execution: ExecutionDetail
  try {
    execution = JSON.parse(result)
  } catch {
    return NextResponse.json({ error: 'Failed to parse execution detail JSON' }, { status: 502 })
  }

  return NextResponse.json(execution)
}
