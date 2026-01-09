import { useState, useRef } from 'react';
import './CSVUploader.css';

// ファイルサイズ制限（5MB）
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 必須列
const REQUIRED_COLUMNS = ['id', 'date', 'price'];

/**
 * CSVアップローダーコンポーネント
 * - ファイル選択・ドラッグ&ドロップ
 * - バリデーション（サイズ、形式、必須列）
 * - データパース
 */
function CSVUploader({ onUploadComplete, onCancel }) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const fileInputRef = useRef(null);

    // ファイルを処理
    const processFile = (file) => {
        setError('');
        setPreview(null);
        setParsedData(null);

        // ファイル形式チェック
        if (!file.name.endsWith('.csv')) {
            setError('CSVファイルを選択してください');
            return;
        }

        // ファイルサイズチェック
        if (file.size > MAX_FILE_SIZE) {
            setError('ファイルサイズは5MB以下にしてください');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const data = parseCSV(text);

                if (data.length === 0) {
                    setError('有効なデータがありませんでした');
                    return;
                }

                setParsedData(data);
                setPreview({
                    fileName: file.name,
                    rowCount: data.length,
                    firstRow: data[0],
                    lastRow: data[data.length - 1],
                });
            } catch (err) {
                setError(err.message || 'CSVの解析に失敗しました');
            }
        };
        reader.onerror = () => {
            setError('ファイルの読み込みに失敗しました');
        };
        reader.readAsText(file);
    };

    // CSV解析
    const parseCSV = (text) => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('ヘッダー行とデータ行が必要です');
        }

        // ヘッダー行を解析
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

        // 必須列チェック
        const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
        if (missingColumns.length > 0) {
            throw new Error(`必須列がありません: ${missingColumns.join(', ')}`);
        }

        // データ行を解析
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = parseCSVLine(line);
            if (values.length !== headers.length) {
                console.warn(`行${i + 1}: 列数が一致しません`);
                continue;
            }

            const row = {};
            headers.forEach((header, index) => {
                let value = values[index];

                // 型変換
                if (header === 'price' || header === 'duration_minutes') {
                    value = parseInt(value) || 0;
                }

                row[header] = value;
            });

            // 日付の検証
            if (!row.date || !isValidDate(row.date)) {
                console.warn(`行${i + 1}: 無効な日付`);
                continue;
            }

            data.push(row);
        }

        return data;
    };

    // CSVの1行を解析（カンマ区切り、引用符対応）
    const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());

        return result;
    };

    // 日付形式の検証
    const isValidDate = (dateStr) => {
        const date = new Date(dateStr);
        return date instanceof Date && !isNaN(date);
    };

    // ドラッグイベント
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    };

    // ファイル選択
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    };

    // アップロード確定
    const handleConfirm = () => {
        if (parsedData) {
            onUploadComplete(parsedData);
        }
    };

    return (
        <div className="csv-uploader-overlay">
            <div className="csv-uploader-modal">
                <div className="modal-header">
                    <h3>CSVアップロード</h3>
                    <button className="close-button" onClick={onCancel}>
                        ✕
                    </button>
                </div>

                <div className="modal-body">
                    {/* ドロップゾーン */}
                    <div
                        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".csv"
                            hidden
                        />
                        <div className="drop-zone-content">
                            <span className="drop-icon">📄</span>
                            <p>ファイルをドラッグ&ドロップ</p>
                            <p className="drop-hint">またはクリックして選択</p>
                        </div>
                    </div>

                    {/* エラー表示 */}
                    {error && (
                        <div className="upload-error">
                            {error}
                        </div>
                    )}

                    {/* プレビュー */}
                    {preview && (
                        <div className="upload-preview">
                            <h4>プレビュー</h4>
                            <div className="preview-info">
                                <div className="preview-row">
                                    <span>ファイル名</span>
                                    <span>{preview.fileName}</span>
                                </div>
                                <div className="preview-row">
                                    <span>データ件数</span>
                                    <span>{preview.rowCount}件</span>
                                </div>
                                <div className="preview-row">
                                    <span>最初の日付</span>
                                    <span>{preview.firstRow.date}</span>
                                </div>
                                <div className="preview-row">
                                    <span>最後の日付</span>
                                    <span>{preview.lastRow.date}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CSV形式の説明 */}
                    <div className="csv-format-hint">
                        <h4>CSV形式</h4>
                        <code>id,date,duration_minutes,price,check_in,check_out</code>
                        <p>必須列: id, date, price</p>
                        <p className="merge-hint">※ 同一IDは上書き、新規IDは追加されます</p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        キャンセル
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleConfirm}
                        disabled={!parsedData}
                    >
                        アップロード
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CSVUploader;
