import { useState, useEffect } from 'react';
import { HOTELS, getHotelById } from '../data/hotels';
import {
    getMonthlyTarget,
    saveMonthlyTarget,
    getDayuseDataCount,
    saveDayuseData,
    clearDayuseData,
    getPasswordHash,
    savePasswordHash,
} from '../utils/storage';
import { hashPassword, verifyPassword } from '../utils/security';
import CSVUploader from './CSVUploader';
import './Settings.css';

/**
 * 設定画面コンポーネント
 * - パスワード変更
 * - 月間目標設定
 * - CSVデータ管理
 * - ログアウト
 */
function Settings({ selectedHotelId, onHotelChange, onNavigateBack, onLogout }) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    // 月間目標の状態（12ヶ月分）
    const [monthlyTargets, setMonthlyTargets] = useState({});
    const [dataCount, setDataCount] = useState(0);

    // パスワード変更
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

    // CSV管理
    const [showUploader, setShowUploader] = useState(false);

    // ホテル情報
    const hotel = getHotelById(selectedHotelId);

    // 月間目標を読み込み
    useEffect(() => {
        const targets = {};
        for (let i = 0; i < 12; i++) {
            let year = currentYear;
            let month = currentMonth + i;
            if (month > 12) {
                month -= 12;
                year += 1;
            }
            const key = `${year}-${String(month).padStart(2, '0')}`;
            targets[key] = getMonthlyTarget(selectedHotelId, year, month);
        }
        setMonthlyTargets(targets);
        setDataCount(getDayuseDataCount(selectedHotelId));
    }, [selectedHotelId, currentYear, currentMonth]);

    // 月間目標を保存
    const handleTargetChange = (key, value) => {
        const numValue = parseInt(value) || 0;
        setMonthlyTargets((prev) => ({ ...prev, [key]: numValue }));

        const [year, month] = key.split('-').map(Number);
        saveMonthlyTarget(selectedHotelId, year, month, numValue);
    };

    // パスワード変更
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });

        // バリデーション
        if (!currentPassword) {
            setPasswordMessage({ type: 'error', text: '現在のパスワードを入力してください' });
            return;
        }

        if (newPassword.length < 4) {
            setPasswordMessage({ type: 'error', text: '新しいパスワードは4文字以上で設定してください' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: '新しいパスワードが一致しません' });
            return;
        }

        // 現在のパスワードを確認
        const storedHash = getPasswordHash();
        const isValid = await verifyPassword(currentPassword, storedHash);

        if (!isValid) {
            setPasswordMessage({ type: 'error', text: '現在のパスワードが正しくありません' });
            return;
        }

        // 新しいパスワードを保存
        const newHash = await hashPassword(newPassword);
        savePasswordHash(newHash);

        setPasswordMessage({ type: 'success', text: 'パスワードを変更しました' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    // CSVアップロード完了
    const handleUploadComplete = (data) => {
        saveDayuseData(selectedHotelId, data);
        setDataCount(data.length);
        setShowUploader(false);
    };

    // データ削除
    const handleClearData = () => {
        if (window.confirm('デイユースデータを削除しますか？この操作は取り消せません。')) {
            clearDayuseData(selectedHotelId);
            setDataCount(0);
        }
    };

    // 月名を取得
    const getMonthLabel = (key) => {
        const [year, month] = key.split('-').map(Number);
        const isCurrentYear = year === currentYear;
        return isCurrentYear ? `${month}月` : `${year}年${month}月`;
    };

    // 数値フォーマット
    const formatNumber = (num) => {
        return num.toLocaleString('ja-JP');
    };

    return (
        <div className="settings">
            <div className="container">
                {/* ヘッダー */}
                <header className="settings-header">
                    <button className="back-button" onClick={onNavigateBack}>
                        ← 戻る
                    </button>
                    <h1>⚙️ 設定</h1>
                </header>

                {/* ホテル選択 */}
                <div className="card fade-in">
                    <div className="card-header">
                        <span className="icon">🏨</span>
                        <span>ホテル選択</span>
                    </div>
                    <select
                        value={selectedHotelId}
                        onChange={(e) => onHotelChange(e.target.value)}
                        className="hotel-select"
                    >
                        {HOTELS.map((h) => (
                            <option key={h.id} value={h.id}>
                                {h.name}（{h.rooms}室）
                            </option>
                        ))}
                    </select>
                </div>

                {/* 月間目標設定 */}
                <div className="card fade-in">
                    <div className="card-header">
                        <span className="icon">📊</span>
                        <span>{hotel?.name} の月間目標</span>
                    </div>
                    <div className="targets-grid">
                        {Object.entries(monthlyTargets).map(([key, value]) => (
                            <div key={key} className="target-item">
                                <label>{getMonthLabel(key)}</label>
                                <div className="target-input-wrapper">
                                    <span className="input-prefix">¥</span>
                                    <input
                                        type="number"
                                        value={value || ''}
                                        onChange={(e) => handleTargetChange(key, e.target.value)}
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CSVデータ管理 */}
                <div className="card fade-in">
                    <div className="card-header">
                        <span className="icon">📤</span>
                        <span>デイユースデータ（{hotel?.name}）</span>
                    </div>

                    <div className="data-info">
                        <span>現在のデータ</span>
                        <span className="data-count">{formatNumber(dataCount)}件</span>
                    </div>

                    <div className="data-actions">
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowUploader(true)}
                        >
                            CSVをアップロード
                        </button>
                        {dataCount > 0 && (
                            <button
                                className="btn btn-danger"
                                onClick={handleClearData}
                            >
                                データを削除
                            </button>
                        )}
                    </div>

                    {showUploader && (
                        <CSVUploader
                            onUploadComplete={handleUploadComplete}
                            onCancel={() => setShowUploader(false)}
                        />
                    )}
                </div>

                {/* パスワード変更 */}
                <div className="card fade-in">
                    <div className="card-header">
                        <span className="icon">🔐</span>
                        <span>パスワード変更</span>
                    </div>

                    <form onSubmit={handlePasswordChange} className="password-form">
                        <div className="form-group">
                            <label>現在のパスワード</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        <div className="form-group">
                            <label>新しいパスワード</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="form-group">
                            <label>新しいパスワード（確認）</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>

                        {passwordMessage.text && (
                            <div className={`message ${passwordMessage.type}`}>
                                {passwordMessage.text}
                            </div>
                        )}

                        <button type="submit" className="btn btn-secondary">
                            パスワードを変更
                        </button>
                    </form>
                </div>

                {/* ログアウト */}
                <button className="logout-button" onClick={onLogout}>
                    ログアウト
                </button>
            </div>
        </div>
    );
}

export default Settings;
