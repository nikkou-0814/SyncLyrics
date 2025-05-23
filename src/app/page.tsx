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
  Link,
  FileUp
} from "lucide-react";

import { LyricLine, SearchResult, ErrorState, TTMLData } from '@/types';
import { parseTTML } from '@/utils/ttml-parser';

const Player = dynamic(() => import('@/components/player'), { ssr: false });

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
  const [ttmlData, setTtmlData] = useState<TTMLData | null>(null);
  const [ttmlPasteValue, setTtmlPasteValue] = useState<string>('');
  const [showTtmlInput, setShowTtmlInput] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('savedUrlQuery');
      const savedQuery = localStorage.getItem('savedSearchQuery');
      const savedTtml = localStorage.getItem('savedTtmlPaste');
      if (savedUrl) setUrlQuery(savedUrl);
      if (savedQuery) setSearchQuery(savedQuery);
      if (savedTtml) setTtmlPasteValue(savedTtml);
    }
  }, []);  
  
  useEffect(() => {
    localStorage.setItem('savedUrlQuery', urlQuery);
  }, [urlQuery]);
  
  useEffect(() => {
    localStorage.setItem('savedSearchQuery', searchQuery);
  }, [searchQuery]);  

  useEffect(() => {
    localStorage.setItem('savedTtmlPaste', ttmlPasteValue);
  }, [ttmlPasteValue]);

  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const getYouTubeTitle = async (videoId: string): Promise<string> => {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (response.ok) {
        const data = await response.json();
        return data.title || 'Unknown Track';
      }
    } catch (error) {
      console.error('YouTube title fetch error:', error);
    }
    return 'Unknown Track';
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
      const res = await fetch('/api/getlyrics', {
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
      const prev = JSON.parse(localStorage.getItem('playerSettings') || '{}');
      localStorage.setItem('playerSettings', JSON.stringify({ ...prev, useTTML: false }));
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

  const handleTtmlPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTtmlPasteValue(e.target.value);
  };
  
  const handleTtmlSubmit = async () => {
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
    
    try {
      const parsed = parseTTML(ttmlPasteValue);
      if (!parsed) {
        setError({
          message: '無効なTTML形式です。',
          advice: '正しいTTML形式であることを確認してください。',
        });
        setIsProcessing(false);
        return;
      }
      
      const youtubeTitle = await getYouTubeTitle(videoId);
      
      const lyricsLines: LyricLine[] = [];
      parsed.divs.forEach(div => {
        div.lines.forEach(line => {
          if (line.text) {
            lyricsLines.push({
              time: line.begin,
              text: line.text
            });
          }
        });
      });
      
      lyricsLines.sort((a, b) => a.time - b.time);
      
      setTtmlData(parsed);
      setLyricsData(lyricsLines);
      setAudioUrl(videoId);
      setSelectedTrack({
        id: 0,
        trackName: youtubeTitle,
        artistName: parsed.songwriter || 'Unknown Artist',
        albumName: '',
        duration: parsed.duration || 0
      });
      setShowPlayer(true);
      const prev = JSON.parse(localStorage.getItem('playerSettings') || '{}');
      localStorage.setItem('playerSettings', JSON.stringify({ ...prev, useTTML: true }));
    } catch (err) {
      console.error('TTML解析エラー:', err);
      setError({
        message: 'TTML解析に失敗しました。',
        advice: err instanceof Error ? err.message : '形式を確認してください。',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleUploadTtml = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setTtmlPasteValue(content);
    };
    reader.readAsText(file);
  };

  const handleBack = () => {
    setShowPlayer(false);
    setSelectedTrack(null);
    setLyricsData(null);
    setTtmlData(null);
  };

  const toggleTtmlInput = () => {
    setShowTtmlInput(!showTtmlInput);
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      {!showPlayer && (
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-center">
              {showTtmlInput ? 'URLを挿入しファイルを選択かペーストして開始してください' : 'URLを挿入し曲を検索してください'}
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
              
              {!showTtmlInput ? (
                <>
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
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={handleSearch}
                      disabled={!searchQuery || isProcessing}
                      className="flex-1"
                    >
                      {isProcessing ? '処理中...' : '検索'}
                    </Button>
                    <Button
                      onClick={toggleTtmlInput}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <FileUp className="h-4 w-4" />
                      TTMLファイル
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Button
                        onClick={toggleTtmlInput}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        ← 通常検索
                      </Button>
                      <span className="text-lg font-semibold text-primary">TTML歌詞</span>
                    </div>
                    
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 space-y-3">
                      <div className="text-center">
                        <label htmlFor="ttmlFile" className="cursor-pointer">
                          <div className="flex flex-col items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                            <div className="p-3 border-2 border-dashed border-current rounded-lg">
                              <FileUp className="h-8 w-8" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium">ファイルを選択</p>
                              <p className="text-sm">(.ttml, .xml)</p>
                            </div>
                          </div>
                          <input
                            type="file"
                            id="ttmlFile"
                            accept=".ttml,.xml"
                            onChange={handleUploadTtml}
                            className="hidden"
                          />
                        </label>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-muted-foreground/25" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">または</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          TTML形式の歌詞をペースト
                        </label>
                        <textarea
                          value={ttmlPasteValue}
                          onChange={handleTtmlPaste}
                          placeholder="TTML形式の歌詞をここにペーストしてください..."
                          className="w-full h-32 p-3 border rounded-md resize-none text-sm font-mono focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleTtmlSubmit}
                      disabled={!ttmlPasteValue || isProcessing}
                      className="w-full h-11"
                    >
                      {isProcessing ? '処理中...' : 'TTML歌詞で開始'}
                    </Button>
                  </div>
                </>
              )}
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{error.message}</AlertTitle>
                <AlertDescription>{error.advice}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          {searchResults && !showTtmlInput && (
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
          ttmlData={ttmlData || undefined}
        />
      )}
    </div>
  );
}
