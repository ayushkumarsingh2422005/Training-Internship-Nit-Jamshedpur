const http = require("node:http");
const { createHash } = require("node:crypto");
const { parse: parseUrl } = require("node:url");
const next = require("next");
const { WebSocketServer } = require("ws");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const wsPath = "/api/biometric-ws";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let clientCount = 0;

function safeToText(payload) {
  if (typeof payload === "string") {
    return payload;
  }
  try {
    return Buffer.from(payload).toString("utf-8");
  } catch {
    return "";
  }
}

function parseSimpleXmlFields(text) {
  const fields = {};
  const normalized = text.replace(/\u0000/g, "").trim();
  const tagRegex = /<([A-Za-z0-9_:-]+)>([^<>]*)<\/\1>/g;
  let match;

  while ((match = tagRegex.exec(normalized)) !== null) {
    const key = match[1];
    const value = match[2].trim();
    if (value && !Object.hasOwn(fields, key)) {
      fields[key] = value;
    }
  }

  return fields;
}

function classifyWsMessage(text, fields) {
  const lower = text.toLowerCase();
  if (lower === "ok") return "ack";
  if (fields.Request?.toLowerCase().includes("register")) return "register";
  if (lower.includes("register") || lower.includes("terminaltype")) return "register";
  if (lower.includes("punch") || lower.includes("attendance") || lower.includes("verify")) return "attendance";
  return "unknown";
}

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      const parsedUrl = parseUrl(req.url, true);
      handle(req, res, parsedUrl);
    });

    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", (ws, req) => {
      clientCount += 1;
      const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let lastMessageHash = "";
      let duplicateCount = 0;
      let ackCount = 0;
      let registerCount = 0;
      let attendanceCount = 0;
      let unknownCount = 0;

      console.log("Biometric websocket connected", {
        clientId,
        clientCount,
        remoteAddress: req.socket.remoteAddress ?? "unknown",
        userAgent: req.headers["user-agent"] ?? "unknown",
      });

      ws.on("message", (payload, isBinary) => {
        const rawText = safeToText(payload).replace(/\u0000/g, "").trim();
        const messageHash = createHash("sha256").update(rawText).digest("hex");
        const fields = parseSimpleXmlFields(rawText);
        const messageType = classifyWsMessage(rawText, fields);
        const preview = rawText.slice(0, 1200);
        const isDuplicate = messageHash === lastMessageHash;

        if (messageType === "ack") {
          ackCount += 1;
          // Ignore ACK chatter completely to reduce noise.
          return;
        }

        if (isDuplicate) {
          duplicateCount += 1;
          // Ignore repeated identical payloads.
        } else {
          duplicateCount = 0;
          lastMessageHash = messageHash;
          if (messageType === "register") {
            registerCount += 1;
            if (registerCount === 1) {
              console.log("Biometric websocket register", {
                clientId,
                messageType,
                isBinary,
                bytes: Buffer.byteLength(payload),
                fields,
                preview,
              });
            }
          } else if (messageType === "attendance") {
            attendanceCount += 1;
            console.log("Biometric websocket attendance event", {
              clientId,
              attendanceCount,
              isBinary,
              bytes: Buffer.byteLength(payload),
              fields,
              preview,
            });
          } else {
            unknownCount += 1;
            // Keep unknown quiet unless very infrequent checkpoint.
            if (unknownCount % 50 === 1) {
              console.log("Biometric websocket unknown stream", {
                clientId,
                unknownCount,
                bytes: Buffer.byteLength(payload),
              });
            }
          }
        }

        if (messageType === "register") {
          ws.send("result=OK");
          return;
        }

        // Generic ACK helps device continue sending and avoid retries.
        ws.send("OK");
      });

      ws.on("close", () => {
        clientCount = Math.max(0, clientCount - 1);
        console.log("Biometric websocket disconnected", {
          clientId,
          clientCount,
          stats: {
            ackCount,
            registerCount,
            attendanceCount,
            unknownCount,
            duplicateCount,
          },
        });
      });
    });

    server.on("upgrade", (req, socket, head) => {
      const { pathname } = parseUrl(req.url || "", true);

      if (pathname !== wsPath) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    });

    server.listen(port, hostname, () => {
      console.log(`> Next.js + WebSocket ready on http://${hostname}:${port}`);
      console.log(`> WebSocket endpoint: ${wsPath}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
