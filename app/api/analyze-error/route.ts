import { NextResponse } from 'next/server'

type RequestBody = {
  workflowId?: string
  executionId?: string
  errorMessage?: string
  nodeName?: string
}

type AnthropicResponse = {
  content: { type: string; text: string }[]
}

export async function POST(req: Request) {
  const body: RequestBody = await req.json()

  if (!body.errorMessage) {
    return NextResponse.json({ error: 'errorMessage es requerido' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 503 })
  }

  const { workflowId, executionId, errorMessage, nodeName } = body

  let anthropicResponse: Response
  try {
    anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system:
          'Eres un experto en n8n workflows. Analizás errores de ejecución y das respuestas concisas: primero la causa probable (1-2 oraciones), luego el fix sugerido (pasos concretos). Sin markdown headers, sin bullets, texto plano.',
        messages: [
          {
            role: 'user',
            content: `Workflow: ${workflowId ?? 'desconocido'}\nEjecución: ${executionId ?? 'desconocida'}\nNodo que falló: ${nodeName ?? 'desconocido'}\nError: ${errorMessage}`,
          },
        ],
      }),
    })
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo contactar la API de Anthropic: ${String(err)}` },
      { status: 502 }
    )
  }

  if (!anthropicResponse.ok) {
    return NextResponse.json(
      { error: `Anthropic API error: ${anthropicResponse.status} ${anthropicResponse.statusText}` },
      { status: 502 }
    )
  }

  const data: AnthropicResponse = await anthropicResponse.json()
  const analysis = data.content?.[0]?.text

  if (!analysis) {
    return NextResponse.json({ error: 'Respuesta vacía de la API de Anthropic' }, { status: 502 })
  }

  return NextResponse.json({ analysis })
}
