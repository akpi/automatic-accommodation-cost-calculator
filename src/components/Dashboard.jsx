import { useState, useEffect, useMemo } from 'react';
import { HOTELS, getHotelById } from '../data/hotels';
import { getMonthlyTarget, getDailyInput, saveDailyInput, getDayuseData } from '../utils/storage';
import { refreshSession } from '../utils/security';
import { predictDayuseRevenue, initializePrediction } from '../utils/prediction';
import './Dashboard.css';

/**
 * ダッシュボードコンポーネント
 * メイン画面：目標表示、予測表示、入力フォーム、最低金額表示
 */
function Dashboard({ selectedHotelId, onHotelChange, onNavigateToSettings }) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    // 入力状態
    const [dayuseCount, setDayuseCount] = useState('');
    const [dayuseAvgPrice, setDayuseAvgPrice] = useState('');
    const [stayCount, setStayCount] = useState('');
    const [stayAvgPrice, setStayAvgPrice] = useState('');
    const [holidaysLoaded, setHolidaysLoaded] = useState(false);

    // 保存済みデータを読み込み
    useEffect(() => {
        const saved = getDailyInput(selectedHotelId, dateStr);
        setDayuseCount(saved.dayuseCount ?? '');
        setDayuseAvgPrice(saved.dayuseAvgPrice ?? '');
        setStayCount(saved.stayCount ?? '');
        setStayAvgPrice(saved.stayAvgPrice ?? '');
    }, [selectedHotelId, dateStr]);

    // セッションを更新（アクティビティ記録）& 祝日データをプリロード
    useEffect(() => {
        refreshSession();
        initializePrediction(year).then(() => setHolidaysLoaded(true));
    }, [year]);

    // ホテル情報
    const hotel = getHotelById(selectedHotelId);
    const totalRooms = hotel?.rooms || 0;

    // 月間目標と日次目標
    const monthlyTarget = getMonthlyTarget(selectedHotelId, year, month);
    const dailyTarget = monthlyTarget > 0 ? Math.round(monthlyTarget / daysInMonth) : 0;

    // デイユース予測（新しい予測ロジックを使用）
    const prediction = useMemo(() => {
        const dayuseData = getDayuseData(selectedHotelId);
        return predictDayuseRevenue(dayuseData, today);
    }, [selectedHotelId, today, holidaysLoaded]);

    // デイユース売上（入力値 or 予測値）
    const dayuseRevenue = useMemo(() => {
        const count = parseInt(dayuseCount) || 0;
        const avgPrice = parseInt(dayuseAvgPrice) || 0;
        if (count > 0 && avgPrice > 0) {
            return count * avgPrice;
        }
        return prediction.revenue;
    }, [dayuseCount, dayuseAvgPrice, prediction.revenue]);

    // 残り客室数
    const remainingRooms = useMemo(() => {
        const stay = parseInt(stayCount) || 0;
        return Math.max(1, totalRooms - stay); // 最低1室
    }, [totalRooms, stayCount]);

    // 宿泊最低許容金額
    const minimumPrice = useMemo(() => {
        if (dailyTarget <= 0) return 0;
        const requiredRevenue = dailyTarget - dayuseRevenue;
        if (requiredRevenue <= 0) return 0;
        return Math.ceil(requiredRevenue / remainingRooms);
    }, [dailyTarget, dayuseRevenue, remainingRooms]);

    // 入力値を保存
    const handleSave = () => {
        saveDailyInput(selectedHotelId, dateStr, {
            dayuseCount: dayuseCount ? parseInt(dayuseCount) : null,
            dayuseAvgPrice: dayuseAvgPrice ? parseInt(dayuseAvgPrice) : null,
            stayCount: stayCount ? parseInt(stayCount) : null,
            stayAvgPrice: stayAvgPrice ? parseInt(stayAvgPrice) : null,
        });
    };

    // 曜日名
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayName = dayNames[today.getDay()];

    // 数値フォーマット
    const formatNumber = (num) => {
        return num.toLocaleString('ja-JP');
    };

    return (
        <div className="dashboard">
            <div className="container">
                {/* ヘッダー */}
                <header className="dashboard-header">
                    <h1 className="dashboard-title">🏨 宿泊料金計算ツール</h1>
                    <div className="hotel-selector">
                        <select
                            value={selectedHotelId}
                            onChange={(e) => onHotelChange(e.target.value)}
                        >
                            {HOTELS.map((h) => (
                                <option key={h.id} value={h.id}>
                                    {h.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </header>

                {/* 日付表示 */}
                <div className="date-display">
                    📅 {year}年{month}月{today.getDate()}日（{dayName}）
                </div>

                {/* 目標カード */}
                <div className="card fade-in">
                    <div className="card-header">
                        <span className="icon">📊</span>
                        <span>本日の目標</span>
                    </div>
                    <div className="target-info">
                        <div className="target-row">
                            <span className="target-label">月間目標</span>
                            <span className="target-value">
                                {monthlyTarget > 0 ? `¥${formatNumber(monthlyTarget)}` : '未設定'}
                            </span>
                        </div>
                        <div className="target-row">
                            <span className="target-label">本日目標</span>
                            <span className="target-value highlight">
                                {dailyTarget > 0 ? `¥${formatNumber(dailyTarget)}` : '—'}
                            </span>
                        </div>
                    </div>
                    {monthlyTarget === 0 && (
                        <p className="hint-text">
                            設定画面で月間目標を設定してください
                        </p>
                    )}
                </div>

                {/* デイユース予測カード */}
                <div className="card fade-in">
                    <div className="card-header">
                        <span className="icon">🔮</span>
                        <span>デイユース予測</span>
                    </div>
                    {prediction.hasData ? (
                        <div className="prediction-info">
                            <div className="prediction-row">
                                <span className="prediction-label">予測件数</span>
                                <span className="prediction-value">{prediction.count}組</span>
                            </div>
                            <div className="prediction-row">
                                <span className="prediction-label">予測売上</span>
                                <span className="prediction-value">¥{formatNumber(prediction.revenue)}</span>
                            </div>
                            <p className="prediction-note">
                                （{prediction.basis}）
                            </p>
                        </div>
                    ) : (
                        <p className="hint-text">
                            CSVデータをアップロードすると予測が表示されます
                        </p>
                    )}
                </div>

                {/* 当日入力カード */}
                <div className="card fade-in">
                    <div className="card-header">
                        <span className="icon">✏️</span>
                        <span>当日実績入力</span>
                    </div>

                    <div className="input-section">
                        <div className="input-label">デイユース（組数 × 平均金額）</div>
                        <div className="input-row">
                            <div className="input-group">
                                <input
                                    type="number"
                                    value={dayuseCount}
                                    onChange={(e) => setDayuseCount(e.target.value)}
                                    onBlur={handleSave}
                                    placeholder="0"
                                    min="0"
                                />
                                <span className="input-suffix">組</span>
                            </div>
                            <span className="input-separator">×</span>
                            <div className="input-group">
                                <span className="input-prefix">¥</span>
                                <input
                                    type="number"
                                    value={dayuseAvgPrice}
                                    onChange={(e) => setDayuseAvgPrice(e.target.value)}
                                    onBlur={handleSave}
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="input-section">
                        <div className="input-label">宿泊（任意：件数 × 平均金額）</div>
                        <div className="input-row">
                            <div className="input-group">
                                <input
                                    type="number"
                                    value={stayCount}
                                    onChange={(e) => setStayCount(e.target.value)}
                                    onBlur={handleSave}
                                    placeholder="0"
                                    min="0"
                                />
                                <span className="input-suffix">件</span>
                            </div>
                            <span className="input-separator">×</span>
                            <div className="input-group">
                                <span className="input-prefix">¥</span>
                                <input
                                    type="number"
                                    value={stayAvgPrice}
                                    onChange={(e) => setStayAvgPrice(e.target.value)}
                                    onBlur={handleSave}
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 最低許容金額カード */}
                <div className="card highlight-card fade-in">
                    <div className="card-header">
                        <span className="icon">🎯</span>
                        <span>宿泊最低許容金額</span>
                    </div>

                    <div className="highlight-box">
                        <div className="highlight-value">
                            {minimumPrice > 0 ? `¥${formatNumber(minimumPrice)}` : '—'}
                        </div>
                        <div className="highlight-label">/室</div>
                    </div>

                    <div className="result-details">
                        <div className="detail-row">
                            <span>残り客室数</span>
                            <span>{remainingRooms}室 / {totalRooms}室</span>
                        </div>
                        <div className="detail-row">
                            <span>必要売上</span>
                            <span>¥{formatNumber(Math.max(0, dailyTarget - dayuseRevenue))}</span>
                        </div>
                        <div className="detail-row">
                            <span>デイユース売上</span>
                            <span>¥{formatNumber(dayuseRevenue)}</span>
                        </div>
                    </div>
                </div>

                {/* 設定へのリンク */}
                <button
                    className="settings-link"
                    onClick={onNavigateToSettings}
                >
                    ⚙️ 設定
                </button>
            </div>
        </div>
    );
}

export default Dashboard;
