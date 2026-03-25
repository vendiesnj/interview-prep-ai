import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { browserManager } from "./lib/browser-manager";
import { prisma } from "./app/lib/prisma";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface WsMessage {
  type: string;
  [key: string]: unknown;
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const wss = new WebSocketServer({
    server: httpServer,
    path: "/api/browser/stream",
  });

  wss.on("connection", async (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId");
    const studentId = url.searchParams.get("studentId");

    if (!sessionId || !studentId) {
      ws.close(1008, "Missing sessionId or studentId");
      return;
    }

    // Narrow types — guaranteed non-null after the guard above
    const sid: string = sessionId;
    const stid: string = studentId;

    console.log(`[WS] Student ${stid} connected to session ${sid}`);

    // Create the browser session if it doesn't exist
    if (!browserManager.isActive(sid)) {
      try {
        await browserManager.createSession(sid, stid);
        await prisma.browserSession
          .create({ data: { id: sid, studentId: stid, isActive: true } })
          .catch(() => {});
      } catch (err) {
        console.error("Failed to create browser session:", err);
        ws.send(
          JSON.stringify({ type: "error", message: "Failed to start browser" }),
        );
        ws.close();
        return;
      }
    }

    let screenshotInterval: NodeJS.Timeout | null = null;
    let currentUrlId: string | null = null;
    let currentUrlStartTime = Date.now();

    async function onUrlChange(url: string, title: string) {
      // Close previous URL visit
      if (currentUrlId) {
        const spent = Math.round((Date.now() - currentUrlStartTime) / 1000);
        await prisma.urlVisit
          .update({
            where: { id: currentUrlId },
            data: { exitedAt: new Date(), activeSeconds: spent },
          })
          .catch(() => {});
      }
      const domain = (() => {
        try {
          return new URL(url).hostname;
        } catch {
          return url;
        }
      })();
      const visit = await prisma.urlVisit
        .create({
          data: { sessionId: sid, url, title, domain, enteredAt: new Date() },
        })
        .catch(() => null);
      currentUrlId = visit?.id ?? null;
      currentUrlStartTime = Date.now();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "urlChange", url, title }));
      }
    }

    // Start screencast
    browserManager.startScreencast(
      sid,
      (jpeg: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "frame", data: jpeg }));
        }
      },
      onUrlChange,
    );

    await onUrlChange("https://www.google.com", "Google");

    // Screenshot every 5 minutes
    screenshotInterval = setInterval(
      async () => {
        const screenshot = await browserManager.captureScreenshot(sid);
        if (screenshot) {
          const url = browserManager.getCurrentUrl(sid);
          await prisma.browserScreenshot
            .create({ data: { sessionId: sid, url, imageData: screenshot } })
            .catch(() => {});
        }
      },
      5 * 60 * 1000,
    );

    // Handle messages from client
    ws.on("message", async (raw) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());
        switch (msg.type) {
          case "mouseMove":
            await browserManager.sendMouseEvent(
              sid, "mouseMoved",
              msg.x as number, msg.y as number, "none", 0,
            );
            break;
          case "mouseDown":
            await browserManager.sendMouseEvent(
              sid, "mousePressed",
              msg.x as number, msg.y as number,
              (msg.button as string) ?? "left", 1,
            );
            break;
          case "mouseUp":
            await browserManager.sendMouseEvent(
              sid, "mouseReleased",
              msg.x as number, msg.y as number,
              (msg.button as string) ?? "left", 1,
            );
            break;
          case "scroll":
            await browserManager.sendScrollEvent(
              sid,
              msg.x as number, msg.y as number,
              msg.deltaX as number, msg.deltaY as number,
            );
            break;
          case "keyDown":
            await browserManager.sendKeyEvent(
              sid, "rawKeyDown",
              msg.key as string, msg.code as string,
              msg.keyCode as number, (msg.modifiers as number) ?? 0,
            );
            break;
          case "keyUp":
            await browserManager.sendKeyEvent(
              sid, "keyUp",
              msg.key as string, msg.code as string,
              msg.keyCode as number, (msg.modifiers as number) ?? 0,
            );
            break;
          case "keyChar":
            await browserManager.sendKeyEvent(
              sid, "char",
              msg.key as string, msg.code as string,
              msg.keyCode as number, 0,
            );
            break;
          case "navigate":
            await browserManager.navigate(sid, msg.url as string);
            break;
          case "back":
            await browserManager.goBack(sid);
            break;
          case "forward":
            await browserManager.goForward(sid);
            break;
          case "reload":
            await browserManager.reload(sid);
            break;
          case "taskComplete":
            await prisma.browserTaskEvent
              .create({
                data: {
                  sessionId: sid,
                  taskId: msg.taskId as string,
                  activeUrl: browserManager.getCurrentUrl(sid),
                },
              })
              .catch(() => {});
            break;
        }
      } catch (err) {
        console.error("[WS] Error processing message:", err);
      }
    });

    ws.on("close", async () => {
      console.log(
        `[WS] Student ${stid} disconnected from session ${sid}`,
      );
      if (screenshotInterval) clearInterval(screenshotInterval);

      if (currentUrlId) {
        const spent = Math.round((Date.now() - currentUrlStartTime) / 1000);
        await prisma.urlVisit
          .update({
            where: { id: currentUrlId },
            data: { exitedAt: new Date(), activeSeconds: spent },
          })
          .catch(() => {});
      }

      const screenshot = await browserManager.captureScreenshot(sid);
      if (screenshot) {
        const url = browserManager.getCurrentUrl(sid);
        await prisma.browserScreenshot
          .create({ data: { sessionId: sid, url, imageData: screenshot } })
          .catch(() => {});
      }

      const visits = await prisma.urlVisit.findMany({ where: { sessionId: sid } });
      const totalSeconds = visits.reduce(
        (sum, v) => sum + (v.activeSeconds ?? 0),
        0,
      );
      await prisma.browserSession
        .update({
          where: { id: sid },
          data: { endedAt: new Date(), totalSeconds, isActive: false },
        })
        .catch(() => {});

      browserManager.stopScreencast(sid);
      await browserManager.destroySession(sid);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
