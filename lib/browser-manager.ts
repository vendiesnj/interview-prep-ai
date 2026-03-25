import { chromium, Browser, BrowserContext, Page, CDPSession } from "playwright-core";

interface ActiveSession {
  sessionId: string;
  studentId: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cdp: CDPSession;
  startedAt: Date;
  currentUrl: string;
  currentUrlEnteredAt: Date;
  screenshotInterval: NodeJS.Timeout | null;
  frameCallback: ((frame: string) => void) | null;
  urlCallback: ((url: string, title: string) => void) | null;
  lastActivityAt: Date;
}

class BrowserManager {
  private sessions = new Map<string, ActiveSession>();

  async createSession(sessionId: string, studentId: string): Promise<void> {
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1280,800",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      storageState: await this.loadStorageState(studentId),
    });

    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    await page.goto("https://www.google.com");

    const session: ActiveSession = {
      sessionId,
      studentId,
      browser,
      context,
      page,
      cdp,
      startedAt: new Date(),
      currentUrl: "https://www.google.com",
      currentUrlEnteredAt: new Date(),
      screenshotInterval: null,
      frameCallback: null,
      urlCallback: null,
      lastActivityAt: new Date(),
    };

    this.sessions.set(sessionId, session);

    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        const title = page.title();
        session.currentUrl = url;
        session.currentUrlEnteredAt = new Date();
        if (session.urlCallback) {
          Promise.resolve(title).then((t) => session.urlCallback!(url, t));
        }
      }
    });
  }

  startScreencast(
    sessionId: string,
    onFrame: (jpeg: string) => void,
    onUrl: (url: string, title: string) => void,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.frameCallback = onFrame;
    session.urlCallback = onUrl;

    session.cdp
      .send("Page.startScreencast", {
        format: "jpeg",
        quality: 75,
        maxWidth: 1280,
        maxHeight: 800,
        everyNthFrame: 2,
      })
      .catch(() => {});

    session.cdp.on(
      "Page.screencastFrame",
      ({ data, sessionId: frameSessionId }) => {
        onFrame(data);
        session.cdp
          .send("Page.screencastFrameAck", { sessionId: frameSessionId })
          .catch(() => {});
      },
    );
  }

  stopScreencast(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.cdp.send("Page.stopScreencast").catch(() => {});
    session.frameCallback = null;
  }

  async sendMouseEvent(
    sessionId: string,
    type: string,
    x: number,
    y: number,
    button: string,
    clickCount: number,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.lastActivityAt = new Date();
    await session.cdp
      .send("Input.dispatchMouseEvent", {
        type: type as "mouseMoved" | "mousePressed" | "mouseReleased" | "mouseWheel",
        x,
        y,
        button: button as "left" | "right" | "middle" | "none",
        clickCount,
        modifiers: 0,
      })
      .catch(() => {});
  }

  async sendScrollEvent(
    sessionId: string,
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    await session.cdp
      .send("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x,
        y,
        deltaX,
        deltaY,
        modifiers: 0,
        button: "none",
      })
      .catch(() => {});
  }

  async sendKeyEvent(
    sessionId: string,
    type: string,
    key: string,
    code: string,
    keyCode: number,
    modifiers: number,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.lastActivityAt = new Date();
    await session.cdp
      .send("Input.dispatchKeyEvent", {
        type: type as "keyDown" | "keyUp" | "char" | "rawKeyDown",
        key,
        code,
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
        modifiers,
      })
      .catch(() => {});
  }

  async navigate(sessionId: string, url: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      finalUrl = url.includes(".")
        ? `https://${url}`
        : `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
    await session.page.goto(finalUrl).catch(() => {});
  }

  async goBack(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    await session.page.goBack().catch(() => {});
  }

  async goForward(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    await session.page.goForward().catch(() => {});
  }

  async reload(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    await session.page.reload().catch(() => {});
  }

  async captureScreenshot(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    try {
      const buffer = await session.page.screenshot({
        type: "jpeg",
        quality: 60,
      });
      return buffer.toString("base64");
    } catch {
      return null;
    }
  }

  getCurrentUrl(sessionId: string): string {
    return this.sessions.get(sessionId)?.currentUrl ?? "";
  }

  getSession(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (session.screenshotInterval) clearInterval(session.screenshotInterval);
    await session.browser.close().catch(() => {});
    this.sessions.delete(sessionId);
  }

  private async loadStorageState(
    _studentId: string,
  ): Promise<undefined> {
    return undefined;
  }

  isActive(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}

// Singleton — one manager for the whole server process
export const browserManager = new BrowserManager();
