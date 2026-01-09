/**
 * ホテル設定データ
 * 各ホテルの基本情報を定義
 */

export const HOTELS = [
  {
    id: 'hotel_a',
    name: 'ホテルA',
    rooms: 52,
  },
  {
    id: 'hotel_b',
    name: 'ホテルB',
    rooms: 45,
  },
  {
    id: 'hotel_c',
    name: 'ホテルC',
    rooms: 21,
  },
];

/**
 * ホテルIDからホテル情報を取得
 * @param {string} hotelId - ホテルID
 * @returns {Object|undefined} ホテル情報
 */
export function getHotelById(hotelId) {
  return HOTELS.find(hotel => hotel.id === hotelId);
}

/**
 * デフォルトのホテルIDを取得
 * @returns {string} デフォルトホテルID
 */
export function getDefaultHotelId() {
  return HOTELS[0].id;
}
