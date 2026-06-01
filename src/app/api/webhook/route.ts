import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

type ParsedBody = Record<string, unknown> | string | null;

type PayloadInfo = {
  rawBody: string | null;
  parsedBody: ParsedBody;
  payloadHash: string | null;
  binaryInfo: {
    byteLength: number;
    hexPreview: string;
    base64Preview: string;
    utf8Preview: string;
    utf8WithoutNullPreview: string;
    utf16lePreview: string;
    bestTextPreview: string;
    extractedFields: Record<string, string>;
  } | null;
};

const INTERESTING_FIELD_NAMES = [
  "user",
  "userid",
  "user_id",
  "uid",
  "pin",
  "emp",
  "employee",
  "enroll",
  "name",
  "person",
  "card",
  "id",
  "verify",
  "punch",
  "time",
] as const;

let lastPayloadHash: string | null = null;
let duplicateCount = 0;

function toHexPreview(bytes: Uint8Array, maxBytes = 96) {
  return Array.from(bytes.slice(0, maxBytes))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join(" ");
}

function slicePreview(value: string, maxChars = 500) {
  return value.length > maxChars ? `${value.slice(0, maxChars)}...(truncated)` : value;
}

function decodeSafely(bytes: Uint8Array, encoding: string) {
  return new TextDecoder(encoding, { fatal: false }).decode(bytes);
}

function scoreDecodedText(text: string) {
  const withoutNull = text.replace(/\u0000/g, "");
  const printable = withoutNull.replace(/[^\x20-\x7E]/g, "");
  let score = printable.length;

  if (withoutNull.toLowerCase().includes("fk_")) {
    score += 120;
  }
  if (withoutNull.includes(":") || withoutNull.includes("=") || withoutNull.includes("\"")) {
    score += 40;
  }

  return score;
}

function parseKeyValuePairs(input: string) {
  const extracted = new Map<string, string>();

  const jsonLike = /"([A-Za-z0-9_]+)"\s*:\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = jsonLike.exec(input)) !== null) {
    extracted.set(match[1], match[2]);
  }

  const equalsLike = /([A-Za-z0-9_]+)\s*=\s*([^,|]+)/g;
  while ((match = equalsLike.exec(input)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^"|"$/g, "");
    extracted.set(key, value);
  }

  return Object.fromEntries(extracted.entries());
}

function pickInterestingFields(fields: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => {
      const normalized = key.toLowerCase();
      return INTERESTING_FIELD_NAMES.some((name) => normalized.includes(name));
    }),
  );
}

function classifyPayload(parsedBody: ParsedBody, binaryInfo: PayloadInfo["binaryInfo"]) {
  const raw = binaryInfo?.utf8WithoutNullPreview
    ?? (typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody ?? {}));
  const normalized = raw.toLowerCase();

  if (
    normalized.includes("supported_enroll_data")
    || normalized.includes("fk_bin_data_lib")
    || normalized.includes("firmware")
  ) {
    return "device-info";
  }

  if (
    normalized.includes("punch")
    || normalized.includes("attendance")
    || normalized.includes("checkin")
    || normalized.includes("checkout")
    || normalized.includes("verify")
    || normalized.includes("logtime")
    || normalized.includes("userid")
  ) {
    return "attendance-event";
  }

  return "unknown";
}

function fkAckResponse(payloadType: string) {
  const body = payloadType === "attendance-event" ? "result=OK" : "OK";
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "close",
    },
  });
}

async function readPayload(request: Request): Promise<PayloadInfo> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const bytes = new Uint8Array(await request.arrayBuffer());
  const payloadHash = createHash("sha256").update(bytes).digest("hex");

  if (bytes.length === 0) {
    return { rawBody: null, parsedBody: null, payloadHash: null, binaryInfo: null };
  }

  const utf8Text = decodeSafely(bytes, "utf-8");
  const rawBody = slicePreview(utf8Text);

  if (contentType.includes("application/json")) {
    try {
      return {
        rawBody,
        parsedBody: JSON.parse(utf8Text) as Record<string, unknown>,
        payloadHash,
        binaryInfo: null,
      };
    } catch {
      return { rawBody, parsedBody: rawBody, payloadHash, binaryInfo: null };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(utf8Text);
    return { rawBody, parsedBody: Object.fromEntries(params.entries()), payloadHash, binaryInfo: null };
  }

  if (contentType.includes("application/octet-stream")) {
    const utf16leText = decodeSafely(bytes, "utf-16le");
    const bestDecoded = scoreDecodedText(utf16leText) > scoreDecodedText(utf8Text) ? utf16leText : utf8Text;
    const bestDecodedWithoutNull = bestDecoded.replace(/\u0000/g, "");
    const utf8WithoutNull = utf8Text.replace(/\u0000/g, "");
    const base64Payload = Buffer.from(bytes).toString("base64");
    const allFields = parseKeyValuePairs(bestDecodedWithoutNull);
    const extractedFields = pickInterestingFields(allFields);

    return {
      rawBody,
      parsedBody: "Binary payload detected (see binaryInfo).",
      payloadHash,
      binaryInfo: {
        byteLength: bytes.length,
        hexPreview: toHexPreview(bytes),
        base64Preview: slicePreview(base64Payload),
        utf8Preview: rawBody,
        utf8WithoutNullPreview: slicePreview(utf8WithoutNull),
        utf16lePreview: slicePreview(utf16leText),
        bestTextPreview: slicePreview(bestDecodedWithoutNull),
        extractedFields,
      },
    };
  }

  return { rawBody, parsedBody: rawBody, payloadHash, binaryInfo: null };
}

async function handleWebhook(request: Request) {
  try {
    const headers = Object.fromEntries(request.headers.entries());
    const query = Object.fromEntries(request.url ? new URL(request.url).searchParams.entries() : []);
    const { rawBody, parsedBody, payloadHash, binaryInfo } = await readPayload(request);
    const payloadType = classifyPayload(parsedBody, binaryInfo);
    const isDuplicate = payloadHash !== null && payloadHash === lastPayloadHash;

    if (isDuplicate) {
      duplicateCount += 1;
      console.log("Incoming webhook payload (duplicate)", {
        timestamp: new Date().toISOString(),
        method: request.method,
        payloadType,
        duplicateCount,
        payloadHash,
      });
    } else {
      lastPayloadHash = payloadHash;
      duplicateCount = 0;
      console.log("Incoming webhook payload", {
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        headers,
        query,
        payloadType,
        payloadHash,
        rawBody,
        parsedBody,
        binaryInfo,
      });
    }

    if (request.method === "POST") {
      return fkAckResponse(payloadType);
    }

    return NextResponse.json({
      ok: true,
      message: "Webhook endpoint is live. POST is used for device pushes.",
      method: request.method,
      payloadType,
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
