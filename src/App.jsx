import { useState, useEffect } from 'react';
import { isSessionValid, getSession, clearSession } from './utils/security';
import { getDefaultHotelId } from './data/hotels';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import './App.css';

/**
 * メインアプリケーションコンポーネント
 * - 認証状態の管理
 * - 画面の切り替え（ダッシュボード / 設定）
 * - ホテル選択状態の管理
 */
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard' | 'settings'
  const [selectedHotelId, setSelectedHotelId] = useState(getDefaultHotelId());
  const [isLoading, setIsLoading] = useState(true);

  // 初期認証状態をチェック
  useEffect(() => {
    const checkAuth = () => {
      const isValid = isSessionValid();
      setIsAuthenticated(isValid);

      // セッションからホテルIDを復元
      if (isValid) {
        const session = getSession();
        if (session?.hotelId) {
          setSelectedHotelId(session.hotelId);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // ログイン成功時
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // ログアウト
  const handleLogout = () => {
    clearSession();
    setIsAuthenticated(false);
    setCurrentPage('dashboard');
  };

  // ホテル変更時
  const handleHotelChange = (hotelId) => {
    setSelectedHotelId(hotelId);
  };

  // ローディング中
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  // 未認証時はログイン画面
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // 認証済み：ダッシュボードまたは設定画面
  return (
    <div className="app">
      {currentPage === 'dashboard' ? (
        <Dashboard
          selectedHotelId={selectedHotelId}
          onHotelChange={handleHotelChange}
          onNavigateToSettings={() => setCurrentPage('settings')}
        />
      ) : (
        <Settings
          selectedHotelId={selectedHotelId}
          onHotelChange={handleHotelChange}
          onNavigateBack={() => setCurrentPage('dashboard')}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
