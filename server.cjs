const http = require("node:http");
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

      console.log("Biometric websocket connected", {
        clientId,
        clientCount,
        remoteAddress: req.socket.remoteAddress ?? "unknown",
        userAgent: req.headers["user-agent"] ?? "unknown",
      });

      ws.on("message", (payload, isBinary) => {
        const messageText = safeToText(payload).replace(/\u0000/g, "").slice(0, 1200);
        console.log("Biometric websocket message", {
          clientId,
          isBinary,
          bytes: Buffer.byteLength(payload),
          preview: messageText,
        });

        // Generic ACK helps some legacy device integrations continue sending.
        ws.send("OK");
      });

      ws.on("close", () => {
        clientCount = Math.max(0, clientCount - 1);
        console.log("Biometric websocket disconnected", { clientId, clientCount });
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
