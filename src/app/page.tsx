'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import '../app/globals.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import {
  Alert,
  AlertTitle,
  AlertDescription
} from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  Search,
  Link
} from "lucide-react";

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
  hash?: string | null;
  album_id?: string | null;
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
  const [selectedService, setSelectedService] = useState<'lrclib' | 'KuGou'>('lrclib');

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
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&service=${selectedService}`);
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
          service: selectedService,
          hash: track.hash,
          album_id: track.album_id,
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
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      {!showPlayer && (
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-center">
              URLを挿入し曲を検索してください
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Link className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="YouTubeのURLを入力"
                  value={urlQuery}
                  onChange={(e) => setUrlQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="曲名を入力"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select
              value={selectedService}
              onValueChange={(value) => setSelectedService(value as 'lrclib' | 'KuGou')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="サービスを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lrclib">lrclib</SelectItem>
                <SelectItem value="KuGou">KuGou</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleSearch}
              disabled={!searchQuery || isProcessing}
              className="w-full"
            >
              {isProcessing ? '処理中...' : '検索'}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{error.message}</AlertTitle>
                <AlertDescription>{error.advice}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          {searchResults && (
            <CardFooter className="flex-col">
              <h2 className="text-xl font-semibold w-full mb-2">検索結果</h2>
              <ScrollArea className="max-h-64 w-full rounded-md border overflow-y-scroll">
                <div className="p-2">
                  {searchResults.map((track) => (
                    <Button
                      key={track.id}
                      variant="ghost"
                      className="w-full justify-start h-auto text-left hover:bg-accent"
                      onClick={() => handleSelectTrack(track)}
                    >
                      <div className="overflow-hidden">
                        <p className="font-medium text-base whitespace-nowrap overflow-hidden text-ellipsis">
                          {track.trackName}
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                          {track.artistName}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardFooter>
          )}
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