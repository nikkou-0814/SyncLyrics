'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import '../app/globals.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
const Player = dynamic(() => import('@/components/player'), { ssr: false });

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

interface ErrorState {
  message: string;
  advice: string;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [urlQuery, setUrlQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SearchResult | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricLine[] | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [showPlayer, setShowPlayer] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('savedUrlQuery');
      const savedQuery = localStorage.getItem('savedSearchQuery');
      if (savedUrl) setUrlQuery(savedUrl);
      if (savedQuery) setSearchQuery(savedQuery);
    }
  }, []);  
  
  useEffect(() => {
    localStorage.setItem('savedUrlQuery', urlQuery);
  }, [urlQuery]);
  
  useEffect(() => {
    localStorage.setItem('savedSearchQuery', searchQuery);
  }, [searchQuery]);  

  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleSearch = async () => {
    if (!searchQuery) {
      setError({
        message: '曲名を入力してください。',
        advice: '曲名が空白になっています。曲名を入力してください。',
      });
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data: { results: SearchResult[] } = await res.json();
      if (!res.ok) {
        setError({
          message: '検索に失敗しました。',
          advice: `${res.status} (${res.statusText})`,
        });
        return;
      }
      if (data.results.length === 0) {
        setError({
          message: '一致する検索結果はありませんでした。',
          advice: '別のキーワードを試してみるか、英語などにしてみてください。',
        });
        setSearchResults(null);
      } else {
        setSearchResults(data.results);
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error(err);
        setError({
          message: '検索中にエラーが発生しました。',
          advice: `詳細: ${err.message}`,
        });
      } else {
        console.error('予期しないエラー:', err);
        setError({
          message: '予期しないエラーが発生しました。',
          advice: '再読み込みなどをしてみてください。',
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectTrack = async (track: SearchResult) => {
    if (!urlQuery) {
      setError({
        message: 'YouTubeのURLを入力してください。',
        advice: '有効なYouTube URLを入力してください。',
      });
      return;
    }
    const videoId = extractVideoId(urlQuery);
    if (!videoId) {
      setError({
        message: '有効なYouTube URLではありません。',
        advice: 'URLを確認し、有効なYouTubeリンクを入力してください。',
      });
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
      const data: { lyricsData: LyricLine[] } = await res.json();
      if (!res.ok) {
        setError({
          message: '歌詞の取得に失敗しました。',
          advice: `${res.status} (${res.statusText})`,
        });
        return;
      }
      setLyricsData(data.lyricsData);
      setShowPlayer(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err);
        setError({
          message: '歌詞の取得中にエラーが発生しました。',
          advice: err.message,
        });
      } else {
        console.error('予期しないエラー:', err);
        setError({
          message: '予期しないエラーが発生しました。',
          advice: '再読み込みなどをしてみてください。',
        });
      }
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
    <div
      className={`w-full h-full min-h-screen flex flex-col items-center justify-center p-4 relative 
        dark:bg-gray-900 dark:text-white bg-white text-gray-900
      `}
    >
      {!showPlayer && (
        <Card className="w-full max-w-md">
          <div className="p-4">
            <h1 className="text-2xl mb-4 text-center">URLを挿入し曲を検索してください</h1>
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
            {error && (
              <Alert variant="destructive" className="mt-4">
                <p>{error.message}</p>
                <p className="text-sm mt-2">{error.advice}</p>
              </Alert>
            )}
            {searchResults && (
              <div className="mt-4">
                <h2 className="text-xl mb-2">検索結果</h2>
                <ul>
                  {searchResults.map((track) => (
                    <li
                      key={track.id}
                      className={`mb-2 p-2 rounded cursor-pointer transition-all 
                        dark:bg-gray-800 dark:hover:bg-gray-700 bg-gray-200 hover:bg-gray-300'}
                      `}
                      onClick={() => handleSelectTrack(track)}
                    >
                      <p className="text-lg whitespace-nowrap overflow-hidden text-ellipsis">
                        {track.trackName}
                      </p>
                      <p
                        className={`text-sm whitespace-nowrap overflow-hidden text-ellipsis 
                          dark:text-gray-400 text-gray-600
                        `}
                      >
                        {track.artistName}
                      </p>
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