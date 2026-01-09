/**
 * LocalStorage操作ユーティリティ
 * ホテル設定、月間目標、デイユースデータ、当日入力データの保存・読み込み
 */

// ==========================================
// ストレージキー定義
// ==========================================

const STORAGE_KEYS = {
    PASSWORD: 'app_password_hash',
    HOTEL_SETTINGS: 'hotel_settings',      // { hotel_a: { monthlyTargets: {...} }, ... }
    DAYUSE_DATA: 'dayuse_data',            // { hotel_a: [...], hotel_b: [...], ... }
    DAILY_INPUT: 'daily_input',            // { hotel_a: { '2026-01-09': {...} }, ... }
};

// ==========================================
// 汎用操作
// ==========================================

/**
 * LocalStorageからJSONデータを取得
 * @param {string} key - ストレージキー
 * @param {*} defaultValue - デフォルト値
 * @returns {*} 保存されている値またはデフォルト値
 */
function getStorageItem(key, defaultValue = null) {
    try {
        const stored = localStorage.getItem(key);
        if (stored === null) {
            return defaultValue;
        }
        return JSON.parse(stored);
    } catch {
        console.error(`Failed to parse storage item: ${key}`);
        return defaultValue;
    }
}

/**
 * LocalStorageにJSONデータを保存
 * @param {string} key - ストレージキー
 * @param {*} value - 保存する値
 */
function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Failed to save storage item: ${key}`, e);
    }
}

// ==========================================
// パスワード管理
// ==========================================

/**
 * パスワードハッシュが設定されているか確認
 * @returns {boolean}
 */
export function isPasswordSet() {
    return localStorage.getItem(STORAGE_KEYS.PASSWORD) !== null;
}

/**
 * パスワードハッシュを保存
 * @param {string} hash - ハッシュ化されたパスワード
 */
export function savePasswordHash(hash) {
    localStorage.setItem(STORAGE_KEYS.PASSWORD, hash);
}

/**
 * パスワードハッシュを取得
 * @returns {string|null}
 */
export function getPasswordHash() {
    return localStorage.getItem(STORAGE_KEYS.PASSWORD);
}

// ==========================================
// ホテル設定（月間目標など）
// ==========================================

/**
 * ホテル設定を取得
 * @param {string} hotelId - ホテルID
 * @returns {Object} 設定オブジェクト
 */
export function getHotelSettings(hotelId) {
    const allSettings = getStorageItem(STORAGE_KEYS.HOTEL_SETTINGS, {});
    return allSettings[hotelId] || { monthlyTargets: {} };
}

/**
 * ホテル設定を保存
 * @param {string} hotelId - ホテルID
 * @param {Object} settings - 設定オブジェクト
 */
export function saveHotelSettings(hotelId, settings) {
    const allSettings = getStorageItem(STORAGE_KEYS.HOTEL_SETTINGS, {});
    allSettings[hotelId] = settings;
    setStorageItem(STORAGE_KEYS.HOTEL_SETTINGS, allSettings);
}

/**
 * 月間目標を取得
 * @param {string} hotelId - ホテルID
 * @param {number} year - 年
 * @param {number} month - 月（1-12）
 * @returns {number} 月間目標金額（未設定の場合0）
 */
export function getMonthlyTarget(hotelId, year, month) {
    const settings = getHotelSettings(hotelId);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return settings.monthlyTargets?.[key] || 0;
}

/**
 * 月間目標を保存
 * @param {string} hotelId - ホテルID
 * @param {number} year - 年
 * @param {number} month - 月（1-12）
 * @param {number} target - 目標金額
 */
export function saveMonthlyTarget(hotelId, year, month, target) {
    const settings = getHotelSettings(hotelId);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (!settings.monthlyTargets) {
        settings.monthlyTargets = {};
    }
    settings.monthlyTargets[key] = target;
    saveHotelSettings(hotelId, settings);
}

// ==========================================
// デイユースデータ（CSVからインポート）
// ==========================================

/**
 * デイユースデータを取得
 * @param {string} hotelId - ホテルID
 * @returns {Array} デイユースデータ配列
 */
export function getDayuseData(hotelId) {
    const allData = getStorageItem(STORAGE_KEYS.DAYUSE_DATA, {});
    return allData[hotelId] || [];
}

/**
 * デイユースデータを保存（上書き）
 * @param {string} hotelId - ホテルID
 * @param {Array} data - デイユースデータ配列
 */
export function saveDayuseData(hotelId, data) {
    const allData = getStorageItem(STORAGE_KEYS.DAYUSE_DATA, {});
    allData[hotelId] = data;
    setStorageItem(STORAGE_KEYS.DAYUSE_DATA, allData);
}

/**
 * デイユースデータをIDベースでマージ（重複は上書き、新規は追加）
 * @param {string} hotelId - ホテルID
 * @param {Array} newData - 新しいデータ配列（各要素にidプロパティ必須）
 * @returns {Object} { added: number, updated: number, total: number }
 */
export function mergeDayuseData(hotelId, newData) {
    const existingData = getDayuseData(hotelId);

    // 既存データをIDでマップ化
    const dataMap = new Map();
    existingData.forEach(item => {
        if (item.id) {
            dataMap.set(item.id, item);
        }
    });

    let added = 0;
    let updated = 0;

    // 新しいデータをマージ
    newData.forEach(item => {
        if (!item.id) return; // IDがない場合はスキップ

        if (dataMap.has(item.id)) {
            // 既存データを上書き
            dataMap.set(item.id, { ...dataMap.get(item.id), ...item });
            updated++;
        } else {
            // 新規データを追加
            dataMap.set(item.id, item);
            added++;
        }
    });

    // マップを配列に変換して保存
    const mergedData = Array.from(dataMap.values());
    saveDayuseData(hotelId, mergedData);

    return {
        added,
        updated,
        total: mergedData.length,
    };
}

/**
 * デイユースデータを追加
 * @param {string} hotelId - ホテルID
 * @param {Array} newData - 追加するデータ配列
 */
export function appendDayuseData(hotelId, newData) {
    const existingData = getDayuseData(hotelId);
    const combinedData = [...existingData, ...newData];
    saveDayuseData(hotelId, combinedData);
}

/**
 * デイユースデータを削除
 * @param {string} hotelId - ホテルID
 */
export function clearDayuseData(hotelId) {
    const allData = getStorageItem(STORAGE_KEYS.DAYUSE_DATA, {});
    delete allData[hotelId];
    setStorageItem(STORAGE_KEYS.DAYUSE_DATA, allData);
}

/**
 * デイユースデータの件数を取得
 * @param {string} hotelId - ホテルID
 * @returns {number}
 */
export function getDayuseDataCount(hotelId) {
    return getDayuseData(hotelId).length;
}

// ==========================================
// 当日入力データ
// ==========================================

/**
 * 当日入力データを取得
 * @param {string} hotelId - ホテルID
 * @param {string} dateStr - 日付文字列 (YYYY-MM-DD)
 * @returns {Object} 入力データ
 */
export function getDailyInput(hotelId, dateStr) {
    const allData = getStorageItem(STORAGE_KEYS.DAILY_INPUT, {});
    return allData[hotelId]?.[dateStr] || {
        dayuseCount: null,
        dayuseAvgPrice: null,
        stayCount: null,
        stayAvgPrice: null,
    };
}

/**
 * 当日入力データを保存
 * @param {string} hotelId - ホテルID
 * @param {string} dateStr - 日付文字列 (YYYY-MM-DD)
 * @param {Object} input - 入力データ
 */
export function saveDailyInput(hotelId, dateStr, input) {
    const allData = getStorageItem(STORAGE_KEYS.DAILY_INPUT, {});
    if (!allData[hotelId]) {
        allData[hotelId] = {};
    }
    allData[hotelId][dateStr] = {
        ...getDailyInput(hotelId, dateStr),
        ...input,
        updatedAt: new Date().toISOString(),
    };
    setStorageItem(STORAGE_KEYS.DAILY_INPUT, allData);
}

// ==========================================
// エクスポート用
// ==========================================

/**
 * すべてのデータをエクスポート（バックアップ用）
 * @returns {Object} 全データオブジェクト
 */
export function exportAllData() {
    return {
        hotelSettings: getStorageItem(STORAGE_KEYS.HOTEL_SETTINGS, {}),
        dayuseData: getStorageItem(STORAGE_KEYS.DAYUSE_DATA, {}),
        dailyInput: getStorageItem(STORAGE_KEYS.DAILY_INPUT, {}),
        exportedAt: new Date().toISOString(),
    };
}

/**
 * データをインポート（復元用）
 * @param {Object} data - インポートするデータ
 */
export function importAllData(data) {
    if (data.hotelSettings) {
        setStorageItem(STORAGE_KEYS.HOTEL_SETTINGS, data.hotelSettings);
    }
    if (data.dayuseData) {
        setStorageItem(STORAGE_KEYS.DAYUSE_DATA, data.dayuseData);
    }
    if (data.dailyInput) {
        setStorageItem(STORAGE_KEYS.DAILY_INPUT, data.dailyInput);
    }
}
