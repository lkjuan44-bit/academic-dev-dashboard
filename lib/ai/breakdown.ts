import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";

const requestSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
});

const subtasksSchema = z.object({
  subtasks: z.array(z.string().trim().min(1).max(240)).length(4),
});

const providerResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
});

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function handleBreakdown(
  request: Request,
  getSession: () => Promise<{ user?: unknown } | null> = auth,
  fetchProvider: typeof fetch = fetch,
) {
  const session = await getSession();
  if (!session?.user) {
    return errorResponse(
      "UNAUTHORIZED",
      "Inicia sesión para usar esta función.",
      401,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "El cuerpo debe ser JSON válido.", 400);
  }

  const parsedRequest = requestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return errorResponse(
      "INVALID_TITLE",
      parsedRequest.error.issues[0]?.message ?? "El título no es válido.",
      400,
    );
  }

  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!apiKey || !model) {
    return errorResponse(
      "AI_NOT_CONFIGURED",
      "Configura AI_API_KEY y AI_MODEL para habilitar el desglose.",
      503,
    );
  }

  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );

  let providerResponse: Response;
  try {
    providerResponse = await fetchProvider(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Desglosa una tarea académica en exactamente cuatro subtareas accionables, concretas y ordenadas. Devuelve solo JSON con la forma {"subtasks":["...","...","...","..."]}.',
          },
          { role: "user", content: parsedRequest.data.title },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return errorResponse(
        "AI_PROVIDER_TIMEOUT",
        "El proveedor de IA agotó el tiempo de espera.",
        504,
      );
    }
    console.error("No se pudo conectar con el proveedor de IA.");
    return errorResponse(
      "AI_PROVIDER_UNAVAILABLE",
      "No se pudo contactar al proveedor de IA.",
      502,
    );
  }

  if (!providerResponse.ok) {
    console.error(`El proveedor de IA respondió con HTTP ${providerResponse.status}.`);
    return errorResponse(
      "AI_PROVIDER_ERROR",
      "El proveedor de IA rechazó la solicitud.",
      502,
    );
  }

  let providerPayload: unknown;
  try {
    providerPayload = await providerResponse.json();
  } catch {
    return errorResponse(
      "AI_PROVIDER_INVALID_RESPONSE",
      "El proveedor de IA devolvió una respuesta inválida.",
      502,
    );
  }

  const parsedProviderResponse = providerResponseSchema.safeParse(providerPayload);
  if (!parsedProviderResponse.success) {
    return errorResponse(
      "AI_PROVIDER_INVALID_RESPONSE",
      "El proveedor de IA devolvió una respuesta inválida.",
      502,
    );
  }

  let content: unknown;
  try {
    content = JSON.parse(parsedProviderResponse.data.choices[0].message.content);
  } catch {
    return errorResponse(
      "AI_PROVIDER_INVALID_RESPONSE",
      "La respuesta de IA no contiene JSON válido.",
      502,
    );
  }

  const parsedSubtasks = subtasksSchema.safeParse(content);
  if (!parsedSubtasks.success) {
    return errorResponse(
      "AI_PROVIDER_INVALID_SUBTASKS",
      "El proveedor de IA no devolvió exactamente cuatro subtareas válidas.",
      502,
    );
  }

  return NextResponse.json(parsedSubtasks.data, {
    headers: { "Cache-Control": "no-store" },
  });
}
