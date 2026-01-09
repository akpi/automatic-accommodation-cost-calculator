import { useState, useEffect } from 'react';
import {
    hashPassword,
    verifyPassword,
    recordLoginFailure,
    resetLoginAttempts,
    checkLockout,
    createSession,
} from '../utils/security';
import {
    isPasswordSet,
    savePasswordHash,
    getPasswordHash,
} from '../utils/storage';
import './Login.css';

/**
 * ログイン画面コンポーネント
 * - 初回アクセス時：パスワード設定
 * - 2回目以降：パスワード認証
 * - ログイン試行制限（5回失敗で30秒ロック）
 */
function Login({ onLoginSuccess }) {
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutSeconds, setLockoutSeconds] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // 初回かどうかをチェック
    useEffect(() => {
        setIsFirstTime(!isPasswordSet());
    }, []);

    // ロックアウトのカウントダウン
    useEffect(() => {
        if (!isLocked) return;

        const timer = setInterval(() => {
            const status = checkLockout();
            if (!status.isLocked) {
                setIsLocked(false);
                setLockoutSeconds(0);
                setError('');
            } else {
                setLockoutSeconds(status.remainingSeconds);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isLocked]);

    // 初期ロックアウト状態をチェック
    useEffect(() => {
        const status = checkLockout();
        if (status.isLocked) {
            setIsLocked(true);
            setLockoutSeconds(status.remainingSeconds);
        }
    }, []);

    // 初回パスワード設定
    const handleSetPassword = async (e) => {
        e.preventDefault();
        setError('');

        // バリデーション
        if (password.length < 4) {
            setError('パスワードは4文字以上で設定してください');
            return;
        }

        if (password !== confirmPassword) {
            setError('パスワードが一致しません');
            return;
        }

        setIsLoading(true);
        try {
            const hash = await hashPassword(password);
            savePasswordHash(hash);
            createSession();
            onLoginSuccess();
        } catch (err) {
            setError('エラーが発生しました。もう一度お試しください。');
        } finally {
            setIsLoading(false);
        }
    };

    // ログイン処理
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        // ロックアウトチェック
        const lockStatus = checkLockout();
        if (lockStatus.isLocked) {
            setIsLocked(true);
            setLockoutSeconds(lockStatus.remainingSeconds);
            return;
        }

        if (!password) {
            setError('パスワードを入力してください');
            return;
        }

        setIsLoading(true);
        try {
            const storedHash = getPasswordHash();
            const isValid = await verifyPassword(password, storedHash);

            if (isValid) {
                resetLoginAttempts();
                createSession();
                onLoginSuccess();
            } else {
                const result = recordLoginFailure();
                if (result.isLocked) {
                    setIsLocked(true);
                    setLockoutSeconds(result.lockoutSeconds);
                    setError(`ログインに5回失敗しました。${result.lockoutSeconds}秒後に再試行できます。`);
                } else {
                    setError(`パスワードが正しくありません（残り${result.remainingAttempts}回）`);
                }
            }
        } catch (err) {
            setError('エラーが発生しました。もう一度お試しください。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card fade-in">
                <div className="login-header">
                    <span className="login-icon">🏨</span>
                    <h1>宿泊料金計算ツール</h1>
                    <p className="login-subtitle">
                        {isFirstTime ? 'パスワードを設定してください' : 'ログイン'}
                    </p>
                </div>

                <form onSubmit={isFirstTime ? handleSetPassword : handleLogin} className="login-form">
                    <div className="form-group">
                        <label htmlFor="password">パスワード</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="パスワードを入力"
                            disabled={isLocked || isLoading}
                            autoComplete={isFirstTime ? 'new-password' : 'current-password'}
                        />
                    </div>

                    {isFirstTime && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">パスワード（確認）</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="もう一度入力"
                                disabled={isLoading}
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {isLocked && (
                        <div className="lockout-message">
                            <span className="lockout-icon">🔒</span>
                            <span>再試行まで {lockoutSeconds} 秒</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary login-button"
                        disabled={isLocked || isLoading}
                    >
                        {isLoading ? '処理中...' : isFirstTime ? 'パスワードを設定' : 'ログイン'}
                    </button>
                </form>

                {isFirstTime && (
                    <p className="login-hint">
                        ※ このパスワードはこのブラウザでのみ有効です
                    </p>
                )}
            </div>
        </div>
    );
}

export default Login;
