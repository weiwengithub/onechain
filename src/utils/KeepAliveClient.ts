export class KeepAliveClient {
  private timer?: ReturnType<typeof setTimeout>;
  private isRunning = false;

  constructor(private readonly origin: string) {
    this.connect();
  }

  connect(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.ping();
  }

  disconnect(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private ping(): void {
    if (!this.isRunning) return;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    this.timer = setTimeout(async () => {
      try {
        // 发送keepalive消息到service worker
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ type: 'KEEPALIVE', origin: this.origin }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('[KeepAliveClient] Service worker connection lost:', chrome.runtime.lastError.message);
            } else {
              // console.log('[KeepAliveClient] Ping successful:', response);
            }
          });
        }
      } catch (err) {
        console.error('[KeepAliveClient] Ping error:', err);
      }

      // 继续下一次ping
      if (this.isRunning) {
        this.ping();
      }
    }, 10000); // 每10秒ping一次
  }
}
