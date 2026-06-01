import { NextResponse } from "next/server";

type ParsedBody = Record<string, unknown> | string | null;

async function readPayload(request: Request): Promise<{ rawBody: string | null; parsedBody: ParsedBody }> {
  const rawBody = await request.text();

  if (!rawBody) {
    return { rawBody: null, parsedBody: null };
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    try {
      return { rawBody, parsedBody: JSON.parse(rawBody) as Record<string, unknown> };
    } catch {
      return { rawBody, parsedBody: rawBody };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(rawBody);
    return { rawBody, parsedBody: Object.fromEntries(params.entries()) };
  }

  return { rawBody, parsedBody: rawBody };
}

async function handleWebhook(request: Request) {
  try {
    const headers = Object.fromEntries(request.headers.entries());
    const query = Object.fromEntries(request.url ? new URL(request.url).searchParams.entries() : []);
    const { rawBody, parsedBody } = await readPayload(request);

    console.log("Incoming webhook payload", {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      headers,
      query,
      rawBody,
      parsedBody,
    });

    return NextResponse.json({
      ok: true,
      message: "Webhook received and logged.",
      method: request.method,
    });
  } catch (error) {
    console.error("Webhook logging failed", error);
    return NextResponse.json({ ok: false, error: "Failed to process webhook." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleWebhook(request);
}

export async function POST(request: Request) {
  return handleWebhook(request);
}

export async function PUT(request: Request) {
  return handleWebhook(request);
}

export async function PATCH(request: Request) {
  return handleWebhook(request);
}

export async function DELETE(request: Request) {
  return handleWebhook(request);
}
