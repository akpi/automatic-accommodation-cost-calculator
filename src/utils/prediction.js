/**
 * デイユース予測ロジック
 * 過去データから曜日別・祝日別の売上を予測
 */

import { isHolidaySync, preloadHolidays } from './holidays';

/**
 * 予測結果の型
 * @typedef {Object} PredictionResult
 * @property {number} count - 予測件数
 * @property {number} revenue - 予測売上
 * @property {number} avgPrice - 予測平均単価
 * @property {boolean} hasData - データがあるかどうか
 * @property {string} basis - 予測根拠の説明
 */

/**
 * デイユース売上を予測
 * @param {Array} dayuseData - 過去のデイユースデータ
 * @param {Date} targetDate - 予測対象日
 * @returns {PredictionResult} 予測結果
 */
export function predictDayuseRevenue(dayuseData, targetDate) {
    if (!dayuseData || dayuseData.length === 0) {
        return {
            count: 0,
            revenue: 0,
            avgPrice: 0,
            hasData: false,
            basis: 'データなし',
        };
    }

    const dayOfWeek = targetDate.getDay(); // 0=日, 1=月, ...
    const isTargetHoliday = isHolidaySync(targetDate);

    // 祝日の場合は祝日データで予測
    if (isTargetHoliday) {
        const holidayPrediction = predictFromHolidayData(dayuseData);
        if (holidayPrediction) {
            return holidayPrediction;
        }
        // 祝日データがない場合は土曜日のデータを使用
        return predictFromDayOfWeek(dayuseData, 6, '祝日（土曜日データで代用）');
    }

    // 通常日は曜日別で予測
    return predictFromDayOfWeek(dayuseData, dayOfWeek);
}

/**
 * 祝日データから予測
 * @param {Array} dayuseData - 過去のデイユースデータ
 * @returns {PredictionResult|null} 予測結果、データがない場合はnull
 */
function predictFromHolidayData(dayuseData) {
    // 日ごとにグループ化
    const dailyTotals = groupByDate(dayuseData);

    // 祝日のデータのみをフィルタ
    const holidayDays = Object.entries(dailyTotals).filter(([dateStr]) => {
        return isHolidaySync(dateStr);
    });

    if (holidayDays.length === 0) {
        return null;
    }

    return calculateAverage(
        holidayDays.map(([, data]) => data),
        '祝日の過去平均'
    );
}

/**
 * 曜日別データから予測
 * @param {Array} dayuseData - 過去のデイユースデータ
 * @param {number} dayOfWeek - 曜日（0=日曜）
 * @param {string} [basisOverride] - 予測根拠の説明を上書き
 * @returns {PredictionResult} 予測結果
 */
function predictFromDayOfWeek(dayuseData, dayOfWeek, basisOverride = null) {
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    // 日ごとにグループ化
    const dailyTotals = groupByDate(dayuseData);

    // 同じ曜日のデータをフィルタ
    const sameDayData = Object.entries(dailyTotals).filter(([dateStr]) => {
        const date = new Date(dateStr);
        return date.getDay() === dayOfWeek;
    });

    if (sameDayData.length === 0) {
        // 曜日データがない場合は全体平均
        return calculateAverage(
            Object.values(dailyTotals),
            '全体平均（曜日データなし）'
        );
    }

    return calculateAverage(
        sameDayData.map(([, data]) => data),
        basisOverride || `${dayNames[dayOfWeek]}曜日の過去平均`
    );
}

/**
 * 過去データを日付ごとにグループ化
 * @param {Array} dayuseData - デイユースデータ
 * @returns {Object} { 'YYYY-MM-DD': { count, revenue }, ... }
 */
function groupByDate(dayuseData) {
    const dailyTotals = {};

    dayuseData.forEach((item) => {
        const dateStr = item.date;
        if (!dailyTotals[dateStr]) {
            dailyTotals[dateStr] = { count: 0, revenue: 0 };
        }
        dailyTotals[dateStr].count += 1;
        dailyTotals[dateStr].revenue += item.price || 0;
    });

    return dailyTotals;
}

/**
 * 平均を計算して予測結果を返す
 * @param {Array} dailyDataArray - 日ごとのデータ配列
 * @param {string} basis - 予測根拠の説明
 * @returns {PredictionResult} 予測結果
 */
function calculateAverage(dailyDataArray, basis) {
    if (dailyDataArray.length === 0) {
        return {
            count: 0,
            revenue: 0,
            avgPrice: 0,
            hasData: false,
            basis,
        };
    }

    const totalCount = dailyDataArray.reduce((sum, d) => sum + d.count, 0);
    const totalRevenue = dailyDataArray.reduce((sum, d) => sum + d.revenue, 0);
    const numDays = dailyDataArray.length;

    const avgCount = Math.round(totalCount / numDays);
    const avgRevenue = Math.round(totalRevenue / numDays);
    const avgPrice = avgCount > 0 ? Math.round(avgRevenue / avgCount) : 0;

    return {
        count: avgCount,
        revenue: avgRevenue,
        avgPrice,
        hasData: true,
        basis,
    };
}

/**
 * 曜日別の統計を取得
 * @param {Array} dayuseData - 過去のデイユースデータ
 * @returns {Object} 曜日別の平均データ
 */
export function getDayOfWeekStats(dayuseData) {
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const stats = {};

    for (let dow = 0; dow < 7; dow++) {
        const prediction = predictFromDayOfWeek(dayuseData, dow);
        stats[dayNames[dow]] = {
            dayOfWeek: dow,
            avgCount: prediction.count,
            avgRevenue: prediction.revenue,
            avgPrice: prediction.avgPrice,
        };
    }

    return stats;
}

/**
 * 祝日データをプリロード
 * @param {number} year - 年
 */
export async function initializePrediction(year) {
    await preloadHolidays(year);
}
