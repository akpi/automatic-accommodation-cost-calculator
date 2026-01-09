/**
 * セキュリティユーティリティ
 * パスワードハッシュ化、ログイン試行制限、セッション管理
 */

// ==========================================
// パスワードハッシュ化（SHA-256）
// ==========================================

/**
 * 文字列をSHA-256でハッシュ化
 * @param {string} message - ハッシュ化する文字列
 * @returns {Promise<string>} ハッシュ値（16進数文字列）
 */
export async function hashPassword(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * パスワードを検証
 * @param {string} inputPassword - 入力されたパスワード
 * @param {string} storedHash - 保存されているハッシュ値
 * @returns {Promise<boolean>} 一致すればtrue
 */
export async function verifyPassword(inputPassword, storedHash) {
    const inputHash = await hashPassword(inputPassword);
    return inputHash === storedHash;
}

// ==========================================
// ログイン試行制限
// ==========================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30秒
const LOGIN_ATTEMPTS_KEY = 'login_attempts';

/**
 * ログイン試行情報を取得
 * @returns {Object} { attempts: number, lockoutUntil: number|null }
 */
export function getLoginAttempts() {
    const stored = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (!stored) {
        return { attempts: 0, lockoutUntil: null };
    }
    try {
        return JSON.parse(stored);
    } catch {
        return { attempts: 0, lockoutUntil: null };
    }
}

/**
 * ログイン失敗を記録
 * @returns {Object} { isLocked: boolean, remainingAttempts: number, lockoutSeconds: number }
 */
export function recordLoginFailure() {
    const current = getLoginAttempts();
    const newAttempts = current.attempts + 1;


    let lockoutUntil = null;
    let isLocked = false;

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        isLocked = true;
    }

    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify({
        attempts: newAttempts,
        lockoutUntil,
    }));

    return {
        isLocked,
        remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - newAttempts),
        lockoutSeconds: isLocked ? Math.ceil(LOCKOUT_DURATION_MS / 1000) : 0,
    };
}

/**
 * ログイン成功時にカウンターをリセット
 */
export function resetLoginAttempts() {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
}

/**
 * アカウントがロックされているかチェック
 * @returns {Object} { isLocked: boolean, remainingSeconds: number }
 */
export function checkLockout() {
    const current = getLoginAttempts();

    if (!current.lockoutUntil) {
        return { isLocked: false, remainingSeconds: 0 };
    }

    const now = Date.now();
    if (now >= current.lockoutUntil) {
        // ロックアウト期間終了、リセット
        resetLoginAttempts();
        return { isLocked: false, remainingSeconds: 0 };
    }

    return {
        isLocked: true,
        remainingSeconds: Math.ceil((current.lockoutUntil - now) / 1000),
    };
}

// ==========================================
// セッション管理
// ==========================================

const SESSION_KEY = 'session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24時間

/**
 * セッションを作成
 * @param {string} hotelId - 選択したホテルID（オプション）
 */
export function createSession(hotelId = null) {
    const session = {
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION_MS,
        hotelId,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * セッションを取得
 * @returns {Object|null} セッション情報またはnull
 */
export function getSession() {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
        return null;
    }

    try {
        const session = JSON.parse(stored);

        // 有効期限チェック
        if (Date.now() >= session.expiresAt) {
            clearSession();
            return null;
        }

        return session;
    } catch {
        return null;
    }
}

/**
 * セッションが有効かチェック
 * @returns {boolean} 有効ならtrue
 */
export function isSessionValid() {
    return getSession() !== null;
}

/**
 * セッションを更新（アクティビティを記録）
 */
export function refreshSession() {
    const session = getSession();
    if (session) {
        session.expiresAt = Date.now() + SESSION_DURATION_MS;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
}

/**
 * セッションを削除（ログアウト）
 */
export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

/**
 * セッションの残り時間を取得
 * @returns {number} 残り時間（秒）、無効なら0
 */
export function getSessionRemainingTime() {
    const session = getSession();
    if (!session) {
        return 0;
    }
    return Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000));
}
