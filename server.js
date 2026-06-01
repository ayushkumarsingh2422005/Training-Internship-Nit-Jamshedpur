#!/usr/bin/env node

const http = require("http");
const next = require("next");
const { WebSocketServer } = require("ws");

const WS_PATH = "/secureye-protocol-debug";
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const dev = process.env.NODE_ENV === "development";

function now() {
  return new Date().toISOString();
}

function getClientIp(req) {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (typeof xForwardedFor === "string" && xForwardedFor.trim()) {
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = req.headers["x-real-ip"];
  if (typeof xRealIp === "string" && xRealIp.trim()) {
    return xRealIp.trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

function toHex(buffer) {
  return buffer.toString("hex").replace(/(..)/g, "$1 ").trim();
}

async function bootstrap() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const wsServer = new WebSocketServer({ noServer: true });

  wsServer.on("connection", (socket, req) => {
    const clientIp = getClientIp(req);
    console.log(`[${now()}] [CONNECT] path=${WS_PATH} clientIp=${clientIp}`);

    socket.on("message", (data, isBinary) => {
      const ts = now();
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

      console.log(
        `[${ts}] [MESSAGE] path=${WS_PATH} clientIp=${clientIp} isBinary=${Boolean(isBinary)}`
      );
      console.log(`[${ts}] [PAYLOAD RAW]`, data);
      console.log(`[${ts}] [PAYLOAD UTF8] ${buffer.toString("utf8")}`);
      console.log(`[${ts}] [PAYLOAD HEX] ${toHex(buffer)}`);
      console.log(`[${ts}] [PAYLOAD SIZE] ${buffer.byteLength} bytes`);
      console.log(`[${ts}] [TIMESTAMP] ${ts}`);
    });

    socket.on("close", (code, reasonBuffer) => {
      const reason = Buffer.isBuffer(reasonBuffer)
        ? reasonBuffer.toString("utf8")
        : String(reasonBuffer || "");

      console.log(
        `[${now()}] [DISCONNECT] path=${WS_PATH} clientIp=${clientIp} code=${code} reason="${reason}"`
      );
    });

    socket.on("error", (error) => {
      console.error(
        `[${now()}] [SOCKET ERROR] path=${WS_PATH} clientIp=${clientIp} message="${error.message}"`
      );
    });
  });

  const server = http.createServer((req, res) => handle(req, res));

  server.on("upgrade", (req, socket, head) => {
    const host = req.headers.host || `127.0.0.1:${port}`;
    const reqUrl = new URL(req.url || "/", `http://${host}`);

    if (reqUrl.pathname !== WS_PATH) {
      socket.destroy();
      return;
    }

    wsServer.handleUpgrade(req, socket, head, (ws) => {
      wsServer.emit("connection", ws, req);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`[${now()}] Next.js server listening on http://${hostname}:${port}`);
    console.log(
      `[${now()}] Secureye protocol debug WebSocket endpoint ready at ws(s)://<domain>${WS_PATH}`
    );
  });
}

bootstrap().catch((error) => {
  console.error(`[${now()}] [BOOT ERROR] ${error?.stack || error}`);
  process.exit(1);
});
