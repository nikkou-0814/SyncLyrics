'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import '../app/globals.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Search, Link, FileUp, Trash2, Pencil, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LyricLine, SearchResult, ErrorState, TTMLData, PlayerState, PlaybackHistoryEntry, HistoryDisplayItem } from '@/types';
import { parseTTML } from '@/utils/ttml-parser';

const Player = dynamic(() => import('@/components/player'), { ssr: false });

const createLyricsSignature = (lyrics: LyricLine[]): string => {
  return lyrics
    .map((line) => (line.text ?? '').trim())
    .filter((text) => text.length > 0)
    .map((text) => text.replace(/\s+/g, ' ').toLowerCase())
    .join('|');
};

const getFirstLyricLine = (lyrics: LyricLine[], fallbackSnapshot?: string): string => {
  const first = lyrics.find((line) => (line.text ?? '').trim().length > 0);
  if (first) {
    return first.text.trim();
  }

  if (fallbackSnapshot && fallbackSnapshot.trim().length > 0) {
    const firstNonEmpty = fallbackSnapshot.split('\n').find((line) => line.trim().length > 0);
    if (firstNonEmpty) {
      return firstNonEmpty.trim();
    }
  }

  return '';
};

const getLyricsSnapshot = (lyrics: LyricLine[]): string => {
  return lyrics
    .map((line) => (line.text ?? '').trim())
    .filter((text) => text.length > 0)
    .join('\n');
};

const getBackgroundLyricsSnapshot = (ttml?: TTMLData | null): string => {
  if (!ttml) return '';

  const lines: string[] = [];
  const seen = new Set<string>();

  ttml.divs.forEach((div) => {
    div.lines.forEach((line) => {
      const candidates: Array<string | undefined> = [
        line.backgroundText,
        line.backgroundPronunciationText,
      ];

      if (line.backgroundWords && line.backgroundWords.length > 0) {
        const joined = line.backgroundWords
          .map((word) => (word.text ?? '').trim())
          .filter((text) => text.length > 0)
          .join(' ');
        candidates.push(joined);
      }

      if (line.spans && line.spans.length > 0) {
        const spanJoined = line.spans
          .filter((span) => span.isBackground)
          .map((span) => (span.text ?? '').trim())
          .filter((text) => text.length > 0)
          .join(' ');
        candidates.push(spanJoined);
      }

      candidates.forEach((candidate) => {
        const normalised = (candidate ?? '').replace(/\s+/g, ' ').trim();
        if (!normalised) {
          return;
        }
        if (seen.has(normalised)) {
          return;
        }
        seen.add(normalised);
        lines.push(normalised);
      });
    });
  });

  return lines.join('\n');
};

const isWordTimingTTML = (ttml?: TTMLData | null): boolean => {
  if (!ttml) return false;
  if (ttml.timing === 'Word') return true;
  return ttml.divs.some((div) =>
    div.lines.some((line) => {
      if (line.timing === 'Word') return true;
      if (line.words && line.words.length > 0) return true;
      if (line.pronunciationWords && line.pronunciationWords.length > 0) return true;
      if (line.backgroundWords && line.backgroundWords.length > 0) return true;
      if (line.translationWords1 && line.translationWords1.length > 0) return true;
      if (line.translationWords2 && line.translationWords2.length > 0) return true;
      return false;
    })
  );
};

const determineLyricTiming = (state: PlayerState): 'line' | 'word' => {
  if (state.mode === 'ttml' && isWordTimingTTML(state.ttmlData)) {
    return 'word';
  }
  return 'line';
};

export default function Home() {
  const router = useRouter();
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
  const [playbackHistory, setPlaybackHistory] = useState<PlaybackHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [entryPendingDelete, setEntryPendingDelete] = useState<PlaybackHistoryEntry | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editedTrackName, setEditedTrackName] = useState<string>('');
  const [historyTitleError, setHistoryTitleError] = useState<string | null>(null);
  const ignoreHistorySelectRef = useRef(false);

  const markHistorySelectIgnored = useCallback(() => {
    ignoreHistorySelectRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const body = document.body;
    if (!body) {
      return;
    }
    if (!showDeleteDialog && body.style.pointerEvents === 'none') {
      body.style.pointerEvents = '';
    }
    return () => {
      if (body.style.pointerEvents === 'none') {
        body.style.pointerEvents = '';
      }
    };
  }, [showDeleteDialog]);

  const filteredHistoryItems = useMemo<HistoryDisplayItem[]>(() => {
    if (!historySearch.trim()) {
      return playbackHistory.map((entry) => ({
        entry,
        displayLine: entry.firstLine || '歌詞情報なし',
        highlightRange: null,
        trackHighlightRange: null,
        artistHighlightRange: null,
      }));
    }

    const keyword = historySearch.trim().toLowerCase();

    return playbackHistory.reduce<HistoryDisplayItem[]>((acc, entry) => {
      const trackName = entry.trackName || '';
      const artistName = entry.artistName || '';
      const firstLine = entry.firstLine || '';
      const lyricsSnapshot = entry.lyricsSnapshot || '';
      const backgroundSnapshot =
        entry.backgroundLyricsSnapshot && entry.backgroundLyricsSnapshot.length > 0
          ? entry.backgroundLyricsSnapshot
          : entry.mode === 'ttml'
            ? getBackgroundLyricsSnapshot(entry.playerState?.ttmlData)
            : '';

      const trackMatchIndex = trackName.toLowerCase().indexOf(keyword);
      const artistMatchIndex = artistName.toLowerCase().indexOf(keyword);
      const firstLineMatchIndex = firstLine.toLowerCase().indexOf(keyword);

      let lyricsMatchLine: string | null = null;
      let lyricsMatchIndex = -1;
      if (lyricsSnapshot) {
        const lines = lyricsSnapshot.split('\n');
        for (const line of lines) {
          const idx = line.toLowerCase().indexOf(keyword);
          if (idx !== -1) {
            lyricsMatchLine = line;
            lyricsMatchIndex = idx;
            break;
          }
        }
      }

      let backgroundMatchLine: string | null = null;
      let backgroundMatchIndex = -1;
      if (backgroundSnapshot) {
        const lines = backgroundSnapshot.split('\n');
        for (const line of lines) {
          const idx = line.toLowerCase().indexOf(keyword);
          if (idx !== -1) {
            backgroundMatchLine = line;
            backgroundMatchIndex = idx;
            break;
          }
        }
      }

      if (
        trackMatchIndex === -1 &&
        artistMatchIndex === -1 &&
        firstLineMatchIndex === -1 &&
        lyricsMatchIndex === -1 &&
        backgroundMatchIndex === -1
      ) {
        return acc;
      }

      let displayLine = firstLine;
      let highlightRange: { start: number; end: number } | null = null;
      let trackHighlightRange: { start: number; end: number } | null = null;
      let artistHighlightRange: { start: number; end: number } | null = null;

      if (backgroundMatchLine !== null) {
        displayLine = backgroundMatchLine;
        highlightRange = {
          start: backgroundMatchIndex,
          end: backgroundMatchIndex + keyword.length,
        };
      } else if (lyricsMatchLine !== null) {
        displayLine = lyricsMatchLine;
        highlightRange = {
          start: lyricsMatchIndex,
          end: lyricsMatchIndex + keyword.length,
        };
      } else if (firstLineMatchIndex !== -1) {
        displayLine = firstLine;
        highlightRange = {
          start: firstLineMatchIndex,
          end: firstLineMatchIndex + keyword.length,
        };
      } else if (!displayLine) {
        displayLine = firstLine || lyricsSnapshot || '歌詞情報なし';
      }

      if (trackMatchIndex !== -1 && trackName.length > 0) {
        trackHighlightRange = {
          start: trackMatchIndex,
          end: trackMatchIndex + keyword.length,
        };
      }

      if (artistMatchIndex !== -1 && artistName.length > 0) {
        artistHighlightRange = {
          start: artistMatchIndex,
          end: artistMatchIndex + keyword.length,
        };
      }

      displayLine = displayLine || '歌詞情報なし';

      acc.push({
        entry,
        displayLine,
        highlightRange,
        trackHighlightRange,
        artistHighlightRange,
      });

      return acc;
    }, []);
  }, [historySearch, playbackHistory]);

  const renderHighlightedText = useCallback(
    (
      text: string,
      highlightRange: { start: number; end: number } | null,
      fallbackText: string = '歌詞情報なし'
    ) => {
      const safeText = text ?? '';

      if (
        !highlightRange ||
        highlightRange.start < 0 ||
        highlightRange.start >= safeText.length
      ) {
        return safeText || fallbackText;
      }

      const start = Math.max(0, Math.min(highlightRange.start, safeText.length));
      const end = Math.max(start, Math.min(highlightRange.end, safeText.length));

      if (start === end) {
        return safeText || fallbackText;
      }

      return (
        <>
          {safeText.slice(0, start)}
          <span className="rounded-sm bg-primary/20 px-0.5 font-semibold text-primary">
            {safeText.slice(start, end)}
          </span>
          {safeText.slice(end)}
        </>
      );
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('playbackHistory');
      if (stored) {
        const parsed: PlaybackHistoryEntry[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const normalised = parsed.map((entry) => {
            const lyricsSnapshot =
              entry.lyricsSnapshot && entry.lyricsSnapshot.length > 0
                ? entry.lyricsSnapshot
                : getLyricsSnapshot(entry.playerState?.lyricsData || []);
            const backgroundSnapshot =
              entry.mode === 'ttml'
                ? entry.backgroundLyricsSnapshot && entry.backgroundLyricsSnapshot.length > 0
                  ? entry.backgroundLyricsSnapshot
                  : getBackgroundLyricsSnapshot(entry.playerState?.ttmlData)
                : undefined;
            const firstLine =
              entry.firstLine && entry.firstLine.trim().length > 0
                ? entry.firstLine
                : getFirstLyricLine(entry.playerState?.lyricsData || [], lyricsSnapshot) || '歌詞情報なし';
            const lyricTiming =
              entry.lyricTiming === 'word' || entry.lyricTiming === 'line'
                ? entry.lyricTiming
                : determineLyricTiming(entry.playerState);
            return {
              ...entry,
              lyricsSnapshot,
              firstLine,
              lyricTiming,
              backgroundLyricsSnapshot:
                backgroundSnapshot && backgroundSnapshot.trim().length > 0 ? backgroundSnapshot : undefined,
            };
          });
          setPlaybackHistory(normalised);
          localStorage.setItem('playbackHistory', JSON.stringify(normalised));
        } else {
          setPlaybackHistory([]);
        }
      }
    } catch (err) {
      console.error('Failed to load playback history:', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'playbackHistory') return;
      if (!event.newValue) {
        setPlaybackHistory([]);
        return;
      }
      try {
        const parsed: PlaybackHistoryEntry[] = JSON.parse(event.newValue);
        if (Array.isArray(parsed)) {
          const normalised = parsed.map((entry) => {
            const lyricsSnapshot =
              entry.lyricsSnapshot && entry.lyricsSnapshot.length > 0
                ? entry.lyricsSnapshot
                : getLyricsSnapshot(entry.playerState?.lyricsData || []);
            const backgroundSnapshot =
              entry.mode === 'ttml'
                ? entry.backgroundLyricsSnapshot && entry.backgroundLyricsSnapshot.length > 0
                  ? entry.backgroundLyricsSnapshot
                  : getBackgroundLyricsSnapshot(entry.playerState?.ttmlData)
                : undefined;
            const lyricTiming =
              entry.lyricTiming === 'word' || entry.lyricTiming === 'line'
                ? entry.lyricTiming
                : determineLyricTiming(entry.playerState);
            return {
              ...entry,
              lyricsSnapshot,
              firstLine:
                entry.firstLine && entry.firstLine.trim().length > 0
                  ? entry.firstLine
                  : getFirstLyricLine(entry.playerState?.lyricsData || [], lyricsSnapshot) || '歌詞情報なし',
              lyricTiming,
              backgroundLyricsSnapshot:
                backgroundSnapshot && backgroundSnapshot.trim().length > 0 ? backgroundSnapshot : undefined,
            };
          });
          setPlaybackHistory(normalised);
        } else {
          setPlaybackHistory([]);
        }
      } catch (err) {
        console.error('Failed to sync playback history:', err);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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

  const saveHistoryEntry = useCallback((state: PlayerState, youtubeUrl: string) => {
    if (typeof window === 'undefined') return;
    const signature = createLyricsSignature(state.lyricsData || []);
    if (!signature) return;
    const lyricsSnapshot = getLyricsSnapshot(state.lyricsData || []);
    const firstLine = getFirstLyricLine(state.lyricsData || [], lyricsSnapshot) || '歌詞情報なし';
    const lyricTiming = determineLyricTiming(state);
    const timestamp = new Date().toISOString();
    const backgroundLyricsSnapshotRaw =
      state.mode === 'ttml' ? getBackgroundLyricsSnapshot(state.ttmlData) : '';
    const backgroundLyricsSnapshot =
      backgroundLyricsSnapshotRaw.trim().length > 0 ? backgroundLyricsSnapshotRaw : undefined;

    setPlaybackHistory((prevHistory) => {
      const existingIndex = prevHistory.findIndex((entry) => entry.lyricsSignature === signature);
      if (existingIndex !== -1) {
        const existing = prevHistory[existingIndex];
        const updatedEntry: PlaybackHistoryEntry = {
          ...existing,
          playerState: state,
          youtubeUrl,
          videoId: state.audioUrl,
          trackName: state.selectedTrack.trackName,
          artistName: state.selectedTrack.artistName,
          firstLine,
          lyricsSnapshot,
          lyricTiming,
          createdAt: timestamp,
          backgroundLyricsSnapshot: backgroundLyricsSnapshot ?? existing.backgroundLyricsSnapshot,
        };
        const reordered = [
          updatedEntry,
          ...prevHistory.filter((_, index) => index !== existingIndex),
        ];
        localStorage.setItem('playbackHistory', JSON.stringify(reordered));
        return reordered;
      }

      const newEntry: PlaybackHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mode: state.mode,
        playerState: state,
        youtubeUrl,
        videoId: state.audioUrl,
        trackName: state.selectedTrack.trackName,
        artistName: state.selectedTrack.artistName,
        firstLine,
        lyricsSignature: signature,
        lyricsSnapshot,
        lyricTiming,
        createdAt: timestamp,
        backgroundLyricsSnapshot,
      };

      const updated = [newEntry, ...prevHistory];
      localStorage.setItem('playbackHistory', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleHistorySelect = useCallback((entry: PlaybackHistoryEntry) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('currentPlayerState', JSON.stringify(entry.playerState));
    const targetPath = entry.mode === 'ttml' ? '/ttmlplay' : '/lrcplay';
    router.push(targetPath);
  }, [router]);

  const handleHistoryEntryClick = useCallback(
    (entry: PlaybackHistoryEntry, event: React.MouseEvent<HTMLDivElement>) => {
      if (ignoreHistorySelectRef.current) {
        ignoreHistorySelectRef.current = false;
        return;
      }
      if (editingEntryId === entry.id) return;
      const target = event.target as HTMLElement | null;
      if (target && target.closest('[data-history-interactive="true"]')) {
        return;
      }
      handleHistorySelect(entry);
    },
    [editingEntryId, handleHistorySelect]
  );

  const handleHistoryDelete = useCallback((entryId: string) => {
    setPlaybackHistory((prevHistory) => {
      const updated = prevHistory.filter((entry) => entry.id !== entryId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('playbackHistory', JSON.stringify(updated));
      }
      return updated;
    });
    if (editingEntryId === entryId) {
      setEditingEntryId(null);
      setEditedTrackName('');
      setHistoryTitleError(null);
    }
  }, [editingEntryId]);

  const handlePromptDeleteHistoryEntry = useCallback((entry: PlaybackHistoryEntry) => {
    setHistoryTitleError(null);
    setEntryPendingDelete(entry);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    setShowDeleteDialog(open);
    if (!open) {
      ignoreHistorySelectRef.current = false;
    }
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!entryPendingDelete) return;
    handleHistoryDelete(entryPendingDelete.id);
    handleDeleteDialogOpenChange(false);
  }, [entryPendingDelete, handleHistoryDelete, handleDeleteDialogOpenChange]);

  const handleStartEditHistoryTitle = useCallback((entry: PlaybackHistoryEntry) => {
    setEditingEntryId(entry.id);
    setEditedTrackName(entry.trackName || '');
    setHistoryTitleError(null);
  }, []);

  const handleCancelEditHistoryTitle = useCallback((
    event?: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    setEditingEntryId(null);
    setEditedTrackName('');
    setHistoryTitleError(null);
  }, []);

  const handleSaveEditedHistoryTitle = useCallback(
    (entryId: string, newTitleRaw: string, event?: React.MouseEvent<HTMLButtonElement>) => {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      const trimmedTitle = newTitleRaw.trim();
      if (!trimmedTitle) {
        setHistoryTitleError('曲名を入力してください。');
        return;
      }

      setPlaybackHistory((prevHistory) => {
        const updated = prevHistory.map((entry) => {
          if (entry.id !== entryId) {
            return entry;
          }
          const updatedEntry: PlaybackHistoryEntry = {
            ...entry,
            trackName: trimmedTitle,
            playerState: {
              ...entry.playerState,
              selectedTrack: {
                ...entry.playerState.selectedTrack,
                trackName: trimmedTitle,
              },
            },
          };
          return updatedEntry;
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('playbackHistory', JSON.stringify(updated));
        }
        return updated;
      });

      setEditingEntryId(null);
      setEditedTrackName('');
      setHistoryTitleError(null);
    },
    []
  );

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
      const prev = JSON.parse(localStorage.getItem('playerSettings') || '{}');
      if (prev && typeof prev === 'object' && 'useTTML' in prev) {
        delete prev.useTTML;
        localStorage.setItem('playerSettings', JSON.stringify(prev));
      }

      const state = {
        mode: 'lrc' as const,
        lyricsData: data.lyricsData,
        audioUrl: videoId,
        selectedTrack: track,
        ttmlData: null,
      };
      localStorage.setItem('currentPlayerState', JSON.stringify(state));
      saveHistoryEntry(state, urlQuery);
      router.push('/lrcplay');
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
      const selected = {
        id: 0,
        trackName: youtubeTitle,
        artistName: parsed.songwriter || 'Unknown Artist',
        albumName: '',
        duration: parsed.duration || 0
      } as SearchResult;
      setSelectedTrack(selected);
      const prev = JSON.parse(localStorage.getItem('playerSettings') || '{}');
      if (prev && typeof prev === 'object' && 'useTTML' in prev) {
        delete prev.useTTML;
        localStorage.setItem('playerSettings', JSON.stringify(prev));
      }

      const state = {
        mode: 'ttml' as const,
        lyricsData: lyricsLines,
        audioUrl: videoId,
        selectedTrack: selected,
        ttmlData: parsed,
      };
      localStorage.setItem('currentPlayerState', JSON.stringify(state));
      saveHistoryEntry(state, urlQuery);
      router.push('/ttmlplay');
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

            <div className="space-y-3">
              <Button
                onClick={() => setShowHistory((prev) => !prev)}
                variant="outline"
                className="w-full"
              >
                {showHistory ? '再生履歴を隠す' : '再生履歴を表示'}
              </Button>
              {showHistory && (
                <div className="space-y-3">
                  <Input
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                    placeholder="履歴を検索..."
                    className="w-full"
                  />

                  <div className="rounded-md border overflow-hidden">
                    {filteredHistoryItems.length === 0 ? (
                      <p className="py-6 text-sm text-center text-muted-foreground">
                        {historySearch ? '一致する履歴がありません。' : '再生履歴はまだありません。'}
                      </p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        <div className="p-2 space-y-2">
                          {filteredHistoryItems.map(
                            ({
                              entry,
                              displayLine,
                              highlightRange,
                              trackHighlightRange,
                              artistHighlightRange,
                            }) => (
                            <div
                              key={entry.id}
                              role="button"
                              tabIndex={0}
                              onPointerDownCapture={(event) => {
                                const target = event.target as HTMLElement | null;
                                if (target && target.closest('[data-history-interactive="true"]')) {
                                  ignoreHistorySelectRef.current = true;
                                } else {
                                  ignoreHistorySelectRef.current = false;
                                }
                              }}
                              onClick={(event) => handleHistoryEntryClick(entry, event)}
                              onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') {
                                  return;
                                }
                                if (ignoreHistorySelectRef.current) {
                                  ignoreHistorySelectRef.current = false;
                                  return;
                                }
                                const target = event.target as HTMLElement | null;
                                if (target && target.closest('[data-history-interactive="true"]')) {
                                  return;
                                }
                                event.preventDefault();
                                handleHistorySelect(entry);
                              }}
                              className="relative w-full cursor-pointer rounded-md border bg-background p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  {editingEntryId === entry.id ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Input
                                          data-history-interactive="true"
                                          value={editedTrackName}
                                          onChange={(event) => {
                                            if (historyTitleError) {
                                              setHistoryTitleError(null);
                                            }
                                            setEditedTrackName(event.target.value);
                                          }}
                                          onPointerDown={(event) => {
                                            event.stopPropagation();
                                            markHistorySelectIgnored();
                                          }}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            markHistorySelectIgnored();
                                          }}
                                          onKeyDown={(event) => {
                                            event.stopPropagation();
                                            markHistorySelectIgnored();
                                            if (event.key === 'Enter') {
                                              event.preventDefault();
                                              handleSaveEditedHistoryTitle(entry.id, editedTrackName);
                                            } else if (event.key === 'Escape') {
                                              event.preventDefault();
                                              handleCancelEditHistoryTitle(event);
                                            }
                                          }}
                                          placeholder="曲名を入力"
                                          autoFocus
                                        />
                                        <div className="flex items-center gap-2 shrink-0">
                                          <Button
                                            data-history-interactive="true"
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={(event) => {
                                              markHistorySelectIgnored();
                                              handleSaveEditedHistoryTitle(entry.id, editedTrackName, event);
                                            }}
                                          >
                                            保存
                                          </Button>
                                          <Button
                                            data-history-interactive="true"
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={(event) => {
                                              markHistorySelectIgnored();
                                              handleCancelEditHistoryTitle(event);
                                            }}
                                          >
                                            キャンセル
                                          </Button>
                                        </div>
                                      </div>
                                      {historyTitleError && (
                                        <p className="text-xs text-destructive">
                                          {historyTitleError}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="font-semibold text-base truncate">
                                      {renderHighlightedText(
                                        entry.trackName || 'タイトル未設定',
                                        trackHighlightRange,
                                        'タイトル未設定'
                                      )}
                                    </p>
                                  )}
                                  <p className="mt-1 text-sm text-muted-foreground truncate">
                                    {renderHighlightedText(
                                      displayLine || '歌詞情報なし',
                                      highlightRange,
                                      '歌詞情報なし'
                                    )}
                                  </p>
                                </div>
                                <div className="relative flex items-center gap-1 shrink-0">
                                  {editingEntryId !== entry.id && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          data-history-interactive="true"
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="-mr-1 -mt-2 text-muted-foreground hover:text-primary"
                                          onPointerDown={(event) => {
                                            event.stopPropagation();
                                            markHistorySelectIgnored();
                                          }}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            markHistorySelectIgnored();
                                          }}
                                          onKeyDown={(event) => {
                                            event.stopPropagation();
                                            markHistorySelectIgnored();
                                          }}
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-44">
                                        <DropdownMenuItem
                                          data-history-interactive="true"
                                          className="flex items-center gap-2 text-muted-foreground focus:text-accent-foreground"
                                          onSelect={(event) => {
                                            event.stopPropagation();
                                            markHistorySelectIgnored();
                                            handleStartEditHistoryTitle(entry);
                                          }}
                                        >
                                          <Pencil className="h-4 w-4" />
                                          <span>タイトルを編集</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          data-history-interactive="true"
                                          className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                                          onSelect={(event) => {
                                            event.stopPropagation();
                                            markHistorySelectIgnored();
                                            handlePromptDeleteHistoryEntry(entry);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                          <span>履歴を削除</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>
                              <div className='flex items-center justify-between'>
                                <p className="mt-2 text-xs text-muted-foreground truncate">
                                  {renderHighlightedText(
                                    entry.artistName || '',
                                    artistHighlightRange,
                                    entry.artistName || ''
                                  )}
                                </p>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {entry.mode === 'ttml' ? 'TTML' : 'LRC'}
                                  </span>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {entry.mode === 'ttml'
                                      ? entry.lyricTiming === 'word'
                                        ? '単語同期'
                                        : '行同期'
                                      : '行同期'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          {searchResults && !showTtmlInput && (
            <CardFooter className="flex-col">
              <h2 className="text-xl font-semibold w-full mb-2">検索結果</h2>
              <div className="max-h-64 w-full rounded-md border overflow-y-auto">
                <div className="p-2">
                  {searchResults.map((track) => (
                    <Button
                      key={track.id}
                      variant="ghost"
                      className="flex w-full flex-col items-start justify-start gap-1 h-auto overflow-hidden text-left hover:bg-accent"
                      onClick={() => handleSelectTrack(track)}
                    >
                      <div className="w-full min-w-0 overflow-hidden text-left">
                        <p className="w-full font-medium text-base truncate">
                          {track.trackName}
                        </p>
                        <p className="w-full text-sm text-muted-foreground truncate">
                          {track.artistName}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
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

      <Dialog open={showDeleteDialog} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>再生履歴を削除しますか？</DialogTitle>
            <DialogDescription>
              {entryPendingDelete
                ? `${entryPendingDelete.trackName}（${entryPendingDelete.mode === 'ttml' ? (entryPendingDelete.lyricTiming === 'word' ? 'TTML・単語同期' : 'TTML・行同期') : 'LRC・行同期'}）の履歴が削除されます。`
                : '選択された履歴を削除します。'}
            </DialogDescription>
          </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => handleDeleteDialogOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={!entryPendingDelete}
              >
                削除する
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
