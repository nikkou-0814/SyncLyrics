// src/app/page.tsx

'use client';

import { useState } from 'react';
import Player from './components/Player';
import '../app/globals.css';

interface LyricLine {
  time: number;
  text: string;
}

interface SearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  // const [selectedTrack, setSelectedTrack] = useState<SearchResult | null>(null); // Removed
  const [lyricsData, setLyricsData] = useState<LyricLine[] | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery) {
      setError('曲名を入力してください');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // パラメータを 'q' に変更
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '検索に失敗しました');
        setIsProcessing(false);
        return;
      }

      setSearchResults(data.results);
    } catch (err) {
      console.error(err);
      setError('検索中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectTrack = async (track: SearchResult) => {
    if (!audioFile) {
      setError('音楽ファイルをアップロードしてください');
      return;
    }

    setIsProcessing(true);
    setError(null);
    // setSelectedTrack(track); // Removed since 'selectedTrack' is no longer used

    try {
      const res = await fetch('/api/get-lyrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          track_name: track.trackName,
          artist_name: track.artistName,
          album_name: track.albumName,
          duration: track.duration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '歌詞の取得に失敗しました');
        setIsProcessing(false);
        return;
      }

      setLyricsData(data.lyricsData);

      // アップロードされた音声ファイルのURLを生成
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
    } catch (err) {
      console.error(err);
      setError('歌詞の取得中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
      setAudioUrl(URL.createObjectURL(e.target.files[0]));
      setLyricsData(null);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-900 text-white p-4">
      {!lyricsData && (
        <div className="w-full max-w-md">
          <h1 className="text-2xl mb-4 text-center">音楽を挿入し曲名を検索してください</h1>
          {/* 音楽ファイルのアップロード */}
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="w-full mb-4"
          />
          {/* 曲名の検索 */}
          <input
            type="text"
            placeholder="曲名を入力"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full mb-4 p-2 rounded text-black"
          />
          <button
            onClick={handleSearch}
            disabled={!searchQuery || isProcessing}
            className={`w-full py-2 px-4 rounded ${
              !searchQuery || isProcessing
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isProcessing ? '検索中...' : '検索'}
          </button>
          {error && <p className="mt-4 text-red-500 text-center">{error}</p>}

          {searchResults && (
            <div className="mt-4">
              <h2 className="text-xl mb-2">検索結果:</h2>
              <ul>
                {searchResults.map((track) => (
                  <li
                    key={track.id}
                    className="mb-2 p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700"
                    onClick={() => handleSelectTrack(track)}
                  >
                    <p className="text-lg">{track.trackName}</p>
                    <p className="text-sm text-gray-400">{track.artistName}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {isProcessing && !lyricsData && (
        <div className="mt-8 flex items-center justify-center">
          <svg
            className="animate-spin h-8 w-8 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          <span className="ml-2">処理中...</span>
        </div>
      )}

      {lyricsData && audioUrl && (
        <Player lyricsData={lyricsData} audioUrl={audioUrl} />
      )}
    </div>
  );
}
