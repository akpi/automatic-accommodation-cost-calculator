/**
 * 祝日判定ユーティリティ
 * 日本の祝日APIを使用して祝日を判定
 */

// 祝日キャッシュ（年単位）
const holidayCache = new Map();

// API URL（Holidays JP）
const HOLIDAYS_API_URL = 'https://holidays-jp.github.io/api/v1';

/**
 * 指定した年の祝日を取得
 * @param {number} year - 年
 * @returns {Promise<Object>} 祝日オブジェクト { 'YYYY-MM-DD': '祝日名', ... }
 */
export async function fetchHolidays(year) {
    // キャッシュチェック
    if (holidayCache.has(year)) {
        return holidayCache.get(year);
    }

    try {
        const response = await fetch(`${HOLIDAYS_API_URL}/${year}/date.json`);
        if (!response.ok) {
            throw new Error(`Failed to fetch holidays: ${response.status}`);
        }

        const holidays = await response.json();
        holidayCache.set(year, holidays);
        return holidays;
    } catch (error) {
        console.error('Error fetching holidays:', error);
        // エラー時は空オブジェクトを返す（フォールバック）
        return {};
    }
}

/**
 * 指定した日付が祝日かどうかを判定
 * @param {Date|string} date - 日付
 * @returns {Promise<boolean>} 祝日ならtrue
 */
export async function isHoliday(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const dateStr = formatDate(d);

    const holidays = await fetchHolidays(year);
    return dateStr in holidays;
}

/**
 * 指定した日付の祝日名を取得
 * @param {Date|string} date - 日付
 * @returns {Promise<string|null>} 祝日名、祝日でない場合はnull
 */
export async function getHolidayName(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const dateStr = formatDate(d);

    const holidays = await fetchHolidays(year);
    return holidays[dateStr] || null;
}

/**
 * 日付をYYYY-MM-DD形式にフォーマット
 * @param {Date} date - 日付
 * @returns {string} フォーマットされた日付文字列
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 指定した年の祝日一覧を取得（プリロード用）
 * @param {number} year - 年
 */
export async function preloadHolidays(year) {
    await fetchHolidays(year);
}

/**
 * キャッシュをクリア
 */
export function clearHolidayCache() {
    holidayCache.clear();
}

/**
 * 祝日判定（同期版・キャッシュ済みデータのみ）
 * fetchHolidaysでプリロードした後に使用
 * @param {Date|string} date - 日付
 * @returns {boolean} 祝日ならtrue（キャッシュがない場合はfalse）
 */
export function isHolidaySync(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const dateStr = formatDate(d);

    const holidays = holidayCache.get(year);
    if (!holidays) {
        return false;
    }

    return dateStr in holidays;
}
