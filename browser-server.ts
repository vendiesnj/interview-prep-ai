/**
 * Standalone browser service — runs on Railway (separate from Next.js/Vercel).
 * Handles WebSocket connections, Playwright Chrome sessions, and persists
 * session data to the shared Postgres database.
 *
 * Start: tsx browser-server.ts
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { browserManager } from "./lib/browser-manager";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const port = parseInt(process.env.BROWSER_PORT || process.env.PORT || "3001", 10);

interface WsMessage {
  type: string;
  [key: string]: unknown;
}

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Health check endpoint — Railway uses this to confirm the service is up
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "signal-browser", sessions: 0 }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId");
  const studentId = url.searchParams.get("studentId");

  if (!sessionId || !studentId) {
    ws.close(1008, "Missing sessionId or studentId");
    return;
  }

  console.log(`[WS] Student ${studentId} connected → session ${sessionId}`);

  // Create Chrome instance
  if (!browserManager.isActive(sessionId)) {
    try {
      await browserManager.createSession(sessionId, studentId);
      await prisma.browserSession
        .create({ data: { id: sessionId, studentId, isActive: true } })
        .catch(() => {});
    } catch (err) {
      console.error("[WS] Failed to create browser session:", err);
      ws.send(JSON.stringify({ type: "error", message: "Failed to start browser" }));
      ws.close();
      return;
    }
  }

  let screenshotInterval: NodeJS.Timeout | null = null;
  let currentUrlId: string | null = null;
  let currentUrlStartTime = Date.now();

  async function onUrlChange(visitUrl: string, title: string) {
    if (currentUrlId) {
      const spent = Math.round((Date.now() - currentUrlStartTime) / 1000);
      await prisma.urlVisit
        .update({ where: { id: currentUrlId }, data: { exitedAt: new Date(), activeSeconds: spent } })
        .catch(() => {});
    }
    const domain = (() => { try { return new URL(visitUrl).hostname; } catch { return visitUrl; } })();
    const visit = await prisma.urlVisit
      .create({ data: { sessionId, url: visitUrl, title, domain, enteredAt: new Date() } })
      .catch(() => null);
    currentUrlId = visit?.id ?? null;
    currentUrlStartTime = Date.now();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "urlChange", url: visitUrl, title }));
    }
  }

  // Start JPEG screencast stream
  browserManager.startScreencast(
    sessionId,
    (jpeg: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "frame", data: jpeg }));
      }
    },
    onUrlChange,
  );

  await onUrlChange("https://www.google.com", "Google");

  // Screenshot every 5 minutes
  screenshotInterval = setInterval(async () => {
    const screenshot = await browserManager.captureScreenshot(sessionId);
    if (screenshot) {
      const currentUrl = browserManager.getCurrentUrl(sessionId);
      await prisma.browserScreenshot
        .create({ data: { sessionId, url: currentUrl, imageData: screenshot } })
        .catch(() => {});
    }
  }, 5 * 60 * 1000);

  // Handle input events from client
  ws.on("message", async (raw) => {
    try {
      const msg: WsMessage = JSON.parse(raw.toString());
      switch (msg.type) {
        case "mouseMove":
          await browserManager.sendMouseEvent(sessionId, "mouseMoved", msg.x as number, msg.y as number, "none", 0);
          break;
        case "mouseDown":
          await browserManager.sendMouseEvent(sessionId, "mousePressed", msg.x as number, msg.y as number, (msg.button as string) ?? "left", 1);
          break;
        case "mouseUp":
          await browserManager.sendMouseEvent(sessionId, "mouseReleased", msg.x as number, msg.y as number, (msg.button as string) ?? "left", 1);
          break;
        case "scroll":
          await browserManager.sendScrollEvent(sessionId, msg.x as number, msg.y as number, msg.deltaX as number, msg.deltaY as number);
          break;
        case "keyDown":
          await browserManager.sendKeyEvent(sessionId, "rawKeyDown", msg.key as string, msg.code as string, msg.keyCode as number, (msg.modifiers as number) ?? 0);
          break;
        case "keyUp":
          await browserManager.sendKeyEvent(sessionId, "keyUp", msg.key as string, msg.code as string, msg.keyCode as number, (msg.modifiers as number) ?? 0);
          break;
        case "keyChar":
          await browserManager.sendKeyEvent(sessionId, "char", msg.key as string, msg.code as string, msg.keyCode as number, 0);
          break;
        case "navigate":
          await browserManager.navigate(sessionId, msg.url as string);
          break;
        case "back":
          await browserManager.goBack(sessionId);
          break;
        case "forward":
          await browserManager.goForward(sessionId);
          break;
        case "reload":
          await browserManager.reload(sessionId);
          break;
        case "taskComplete":
          await prisma.browserTaskEvent
            .create({ data: { sessionId, taskId: msg.taskId as string, activeUrl: browserManager.getCurrentUrl(sessionId) } })
            .catch(() => {});
          break;
      }
    } catch (err) {
      console.error("[WS] Message error:", err);
    }
  });

  // On disconnect — finalize session data
  ws.on("close", async () => {
    console.log(`[WS] Student ${studentId} disconnected from session ${sessionId}`);
    if (screenshotInterval) clearInterval(screenshotInterval);

    if (currentUrlId) {
      const spent = Math.round((Date.now() - currentUrlStartTime) / 1000);
      await prisma.urlVisit
        .update({ where: { id: currentUrlId }, data: { exitedAt: new Date(), activeSeconds: spent } })
        .catch(() => {});
    }

    const screenshot = await browserManager.captureScreenshot(sessionId);
    if (screenshot) {
      await prisma.browserScreenshot
        .create({ data: { sessionId, url: browserManager.getCurrentUrl(sessionId), imageData: screenshot } })
        .catch(() => {});
    }

    const visits = await prisma.urlVisit.findMany({ where: { sessionId } });
    const totalSeconds = visits.reduce((sum, v) => sum + (v.activeSeconds ?? 0), 0);
    await prisma.browserSession
      .update({ where: { id: sessionId }, data: { endedAt: new Date(), totalSeconds, isActive: false } })
      .catch(() => {});

    browserManager.stopScreencast(sessionId);
    await browserManager.destroySession(sessionId);
  });
});

httpServer.listen(port, () => {
  console.log(`[Signal Browser Service] Running on port ${port}`);
});
