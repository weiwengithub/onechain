import { setExtensionSessionStorage, getExtensionLocalStorage, getExtensionSessionStorage } from '@/utils/storage';
import { NEVER_LOCK_KEY } from '@/constants/autoLock';

class LockManager {
  private lockTimerId: number | undefined;
  private lockTimeInMinutes: number = 30;
  private isAuthenticated: boolean = false;
  private isInitialized: boolean = false;

  // 初始化锁定管理器
  async initialize() {
    this.isInitialized = false;
    // console.log('[LockManager] Starting initialization...');
    // 读取存储的锁定时间设置
    const storedLockTime = await getExtensionLocalStorage('autoLockTimeInMinutes');
    if (storedLockTime) {
      this.setLockTime(storedLockTime);
    }

    // 检查当前认证状态
    const sessionPassword = await getExtensionSessionStorage('sessionPassword');
    console.log(`[LockManager] SessionPassword exists: ${!!sessionPassword}`);
    if (sessionPassword) {
      // 检查会话是否已过期
      if (await this.isSessionExpired()) {
        const lastActivityTime = await this.getLastActivityTime();
        const currentTime = Date.now();
        const elapsedMinutes = lastActivityTime ? ((currentTime - lastActivityTime) / (1000 * 60)).toFixed(1) : 'unknown';
        console.log(`[LockManager] Session expired on startup (${elapsedMinutes} minutes elapsed), locking wallet`);
        await this.executeLock();
        return;
      }

      this.login();
    }

    this.isInitialized = true;
    // console.log('[LockManager] Initialization completed');
  }

  // 设置锁定时间
  setLockTime(minutes: string) {
    this.lockTimeInMinutes = minutes === NEVER_LOCK_KEY ? 0 : Number(minutes);
    // console.log(`[LockManager] Lock time set to: ${this.lockTimeInMinutes} minutes`);
    this.resetLockTimer(); // 立即应用新设置
  }

  // 用户登录
  login() {
    this.isAuthenticated = true;
    // console.log('[LockManager] User authenticated');
    this.storeLastActivityTime(); // 存储登录时间
    this.resetLockTimer();
  }

  // 重置锁定定时器（核心方法）
  resetLockTimer() {
    // 清除现有定时器
    if (this.lockTimerId) {
      clearTimeout(this.lockTimerId);
      this.lockTimerId = undefined;
      // console.log('[LockManager] Previous timer cleared');
    }

    // 如果设置了锁定时间，启动新定时器
    if (this.lockTimeInMinutes > 0 && this.isAuthenticated) {
      // @ts-expect-error setTimeout returns number in browser context
      this.lockTimerId = setTimeout(() => {
        this.executeLock();
      }, this.lockTimeInMinutes * 60 * 1000);

      // console.log(`[LockManager] New timer set for ${this.lockTimeInMinutes} minutes`);
    } else if (this.lockTimeInMinutes === 0) {
      // console.log('[LockManager] Auto-lock disabled (never lock)');
    }
  }

  // 存储用户最后活动时间戳
  private async storeLastActivityTime(): Promise<void> {
    await setExtensionSessionStorage('lastActivityTimestamp', Date.now());
  }

  // 获取最后活动时间戳
  private async getLastActivityTime(): Promise<number | null> {
    return await getExtensionSessionStorage('lastActivityTimestamp');
  }

  // 检查会话是否已过期
  private async isSessionExpired(): Promise<boolean> {
    if (this.lockTimeInMinutes === 0) {
      // console.log('[LockManager] Auto-lock disabled (never lock), session not expired');
      return false;
    }

    const lastActivityTime = await this.getLastActivityTime();
    if (!lastActivityTime) {
      // console.log('[LockManager] No lastActivityTime found, session not expired');
      return false;
    }

    const currentTime = Date.now();
    const elapsedMinutes = (currentTime - lastActivityTime) / (1000 * 60);
    const isExpired = elapsedMinutes >= this.lockTimeInMinutes;

    // console.log(`[LockManager] Session expiry check:`);
    // console.log(`  - Lock time: ${this.lockTimeInMinutes} minutes`);
    // console.log(`  - Last activity: ${new Date(lastActivityTime).toISOString()}`);
    // console.log(`  - Current time: ${new Date(currentTime).toISOString()}`);
    // console.log(`  - Elapsed time: ${elapsedMinutes.toFixed(2)} minutes`);
    // console.log(`  - Is expired: ${isExpired}`);

    return isExpired;
  }

  // 执行锁定
  private async executeLock() {
    // console.log('[LockManager] Executing auto-lock');
    console.log(`[LockManager] Previous auth state: ${this.isAuthenticated}`);
    this.isAuthenticated = false;
    await setExtensionSessionStorage('sessionPassword', null);
    // console.log('[LockManager] SessionPassword cleared, wallet locked');

    if (this.lockTimerId) {
      clearTimeout(this.lockTimerId);
      this.lockTimerId = undefined;
      // console.log('[LockManager] Lock timer cleared');
    }
  }

  // 检查认证状态
  hasAuth(): boolean {
    return this.isAuthenticated;
  }

  // 检查是否已初始化
  hasInitialized(): boolean {
    return this.isInitialized;
  }

  // 手动锁定
  async lock() {
    // console.log('[LockManager] Manual lock triggered');
    await this.executeLock();
  }

  // 用户活动检测
  onUserActivity() {
    if (this.isAuthenticated) {
      // console.log('[LockManager] User activity detected, resetting timer');
      this.storeLastActivityTime(); // 更新活动时间
      this.resetLockTimer();
    }
  }
}

// 创建单例实例
const lockManager = new LockManager();

export { lockManager };
