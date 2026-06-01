import { NextResponse } from "next/server";

type ParsedBody = Record<string, unknown> | string | null;

type PayloadInfo = {
  rawBody: string | null;
  parsedBody: ParsedBody;
  binaryInfo: {
    byteLength: number;
    hexPreview: string;
    base64Preview: string;
    utf8Preview: string;
    utf8WithoutNullPreview: string;
  } | null;
};

function toHexPreview(bytes: Uint8Array, maxBytes = 96) {
  return Array.from(bytes.slice(0, maxBytes))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join(" ");
}

function slicePreview(value: string, maxChars = 500) {
  return value.length > maxChars ? `${value.slice(0, maxChars)}...(truncated)` : value;
}

async function readPayload(request: Request): Promise<PayloadInfo> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const bytes = new Uint8Array(await request.arrayBuffer());

  if (bytes.length === 0) {
    return { rawBody: null, parsedBody: null, binaryInfo: null };
  }

  const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const rawBody = slicePreview(utf8Text);

  if (contentType.includes("application/json")) {
    try {
      return {
        rawBody,
        parsedBody: JSON.parse(utf8Text) as Record<string, unknown>,
        binaryInfo: null,
      };
    } catch {
      return { rawBody, parsedBody: rawBody, binaryInfo: null };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(utf8Text);
    return { rawBody, parsedBody: Object.fromEntries(params.entries()), binaryInfo: null };
  }

  if (contentType.includes("application/octet-stream")) {
    const utf8WithoutNull = utf8Text.replace(/\u0000/g, "");
    const base64Payload = Buffer.from(bytes).toString("base64");

    return {
      rawBody,
      parsedBody: "Binary payload detected (see binaryInfo).",
      binaryInfo: {
        byteLength: bytes.length,
        hexPreview: toHexPreview(bytes),
        base64Preview: slicePreview(base64Payload),
        utf8Preview: rawBody,
        utf8WithoutNullPreview: slicePreview(utf8WithoutNull),
      },
    };
  }

  return { rawBody, parsedBody: rawBody, binaryInfo: null };
}

async function handleWebhook(request: Request) {
  try {
    const headers = Object.fromEntries(request.headers.entries());
    const query = Object.fromEntries(request.url ? new URL(request.url).searchParams.entries() : []);
    const { rawBody, parsedBody, binaryInfo } = await readPayload(request);

    console.log("Incoming webhook payload", {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      headers,
      query,
      rawBody,
      parsedBody,
      binaryInfo,
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
