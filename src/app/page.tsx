'use client';

import React, { useEffect, useState } from 'react';
import Player from './components/Player';
import '../app/globals.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { useTheme } from 'next-themes';

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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [urlQuery, setUrlQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SearchResult | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricLine[] | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, [setTheme]);

  if (!mounted) {
    return <div className="w-full h-full min-h-screen bg-transparent"></div>;
  }

  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleSearch = async () => {
    if (!searchQuery) {
      setError('曲名を入力してください');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
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
    if (!urlQuery) {
      setError('YouTubeのURLを入力してください');
      return;
    }

    const videoId = extractVideoId(urlQuery);
    if (!videoId) {
      setError('有効なYouTube URLを入力してください');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSelectedTrack(track);
    setAudioUrl(videoId);

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
      setShowPlayer(true);
    } catch (err) {
      console.error(err);
      setError('歌詞の取得中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    setShowPlayer(false);
    setSelectedTrack(null);
    setLyricsData(null);
  };

  return (
    <div className={`w-full h-full min-h-screen flex flex-col items-center justify-center p-4 relative ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {!showPlayer && (
        <Card className="w-full max-w-md">
          <div className="p-4">
            <h1 className="text-2xl mb-4 text-center">URLを挿入し曲名を検索してください</h1>
            <Input
              type="text"
              placeholder="YouTubeのURLを入力"
              value={urlQuery}
              onChange={(e) => setUrlQuery(e.target.value)}
              className="w-full mb-4"
            />
            <Input
              type="text"
              placeholder="曲名を入力"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full mb-4"
            />
            <Button
              onClick={handleSearch}
              disabled={!searchQuery || isProcessing}
              className="w-full mb-4"
            >
              {isProcessing ? '処理中...' : '検索'}
            </Button>
            {error && <Alert variant="destructive" className="mt-4">{error}</Alert>}
            {searchResults && (
              <div className="mt-4">
                <h2 className="text-xl mb-2">検索結果:</h2>
                <ul>
                  {searchResults.map((track) => (
                    <li
                      key={track.id}
                      className={`mb-2 p-2 rounded cursor-pointer transition-all ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'}`}
                      onClick={() => handleSelectTrack(track)}
                    >
                      <p className="text-lg">{track.trackName}</p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{track.artistName}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {showPlayer && lyricsData && selectedTrack && audioUrl && (
        <Player
          lyricsData={lyricsData}
          audioUrl={audioUrl}
          trackName={selectedTrack.trackName}
          albumName={selectedTrack.albumName}
          artistName={selectedTrack.artistName}
          onBack={handleBack}
        />
      )}
    </div>
  );
}