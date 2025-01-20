'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo, } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import PlayerLyrics from '@/components/player-lyrics';
import PlayerControls from '@/components/player-controls';
import SettingsDialog from '@/components/settings-dialog';

interface LyricLine {
  time: number;
  text: string;
}

interface PlayerProps {
  lyricsData: LyricLine[];
  audioUrl: string;
  trackName: string;
  albumName: string;
  artistName: string;
  onBack: () => void;
}

interface Settings {
  showplayercontrol: boolean;
  fullplayer: boolean;
  fontSize: 'small' | 'medium' | 'large';
  lyricposition: 'left' | 'center' | 'right';
  backgroundblur: 'none' | 'small' | 'medium' | 'large';
  theme: 'system' | 'dark' | 'light';
  playerposition: 'left' | 'center' | 'right';
  volume: number;
}

const DEFAULT_SETTINGS: Settings = {
  showplayercontrol: true,
  fullplayer: false,
  fontSize: 'medium',
  lyricposition: 'left',
  backgroundblur: 'medium',
  theme: 'system',
  playerposition: 'right',
  volume: 50,
};

const Player: React.FC<PlayerProps> = ({
  lyricsData,
  audioUrl,
  trackName,
  albumName,
  artistName,
  onBack,
}) => {
  const youtubeRef = useRef<YouTube['internalPlayer'] | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(50);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const { setTheme, resolvedTheme } = useTheme();
  const theme = resolvedTheme || 'system';
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [wasFullPlayerManuallySet, setWasFullPlayerManuallySet] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => {
    const savedSettings = localStorage.getItem('playerSettings');
    return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
  });

  // 最初の歌詞まで5秒以上ある場合に間奏とする
  const processedLyricsData = useMemo(() => {
    if (lyricsData.length > 0 && lyricsData[0].time >= 5) {
      return [{ time: 0, text: '' }, ...lyricsData];
    }
    return lyricsData;
  }, [lyricsData]);

  // 設定をlocalStorageに保存
  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prevSettings) => {
      const updatedSettings = { ...prevSettings, ...newSettings };
      localStorage.setItem('playerSettings', JSON.stringify(updatedSettings));
      return updatedSettings;
    });
  };

  useEffect(() => {
    setVolume(settings.volume);
  }, [settings.volume]);

  // 画面サイズによって自動でfullplayerへ切り替え
  useEffect(() => {
    const handleResize = () => {
      const isCurrentlyMobile = window.innerWidth <= 768;
      setIsMobile(isCurrentlyMobile);

      if (!wasFullPlayerManuallySet) {
        if (isCurrentlyMobile) {
          updateSettings({ fullplayer: true });
        } else {
          updateSettings({ fullplayer: false });
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [wasFullPlayerManuallySet]);

  // 設定変更
  const handleSettingChange = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    if (key === 'theme') {
      if (value === 'dark' || value === 'light' || value === 'system') {
        setTheme(value);
      }
    }
    if (key === 'fullplayer') {
      setWasFullPlayerManuallySet(true);
    }
    updateSettings({ [key]: value });
  };

  // 再生・一時停止
  const togglePlayPause = () => {
    if (!youtubeRef.current) return;
    if (isPlaying) {
      youtubeRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      youtubeRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  // 曲頭にスキップ
  const handleSkipBack = () => {
    if (!youtubeRef.current) return;
    youtubeRef.current.seekTo(0);
    setCurrentTime(0);
  };

  // 曲末にスキップ
  const handleSkipForward = () => {
    if (!youtubeRef.current) return;
    youtubeRef.current.seekTo(duration);
    setCurrentTime(duration);
  };

  // 音量変更
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (youtubeRef.current) {
      youtubeRef.current.setVolume(newVolume);
    }
    updateSettings({ volume: newVolume });
  };

  // スライダー操作
  const handleProgressChange = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (youtubeRef.current) {
      youtubeRef.current.seekTo(newTime);
    }
  };

  // クリックで指定時刻に移動
  const handleLyricClick = (time: number) => {
    if (!youtubeRef.current) return;
    youtubeRef.current.seekTo(time);
    setCurrentTime(time);
    if (!isPlaying) {
      youtubeRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  // 計算
  const cubicBezier = useCallback(
    (p1x: number, p1y: number, p2x: number, p2y: number) => {
      const NEWTON_ITERATIONS = 4;
      const NEWTON_MIN_SLOPE = 0.001;
      const SUBDIVISION_PRECISION = 0.0000001;
      const SUBDIVISION_MAX_ITERATIONS = 10;

      const ax = 3.0 * p1x - 3.0 * p2x + 1.0;
      const bx = 3.0 * p2x - 6.0 * p1x;
      const cx = 3.0 * p1x;

      const ay = 3.0 * p1y - 3.0 * p2y + 1.0;
      const by = 3.0 * p2y - 6.0 * p1y;
      const cy = 3.0 * p1y;

      const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
      const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
      const sampleCurveDerivativeX = (t: number) =>
        (3.0 * ax * t + 2.0 * bx) * t + cx;

      const solveCurveX = (x: number) => {
        let t2 = x;
        for (let i = 0; i < NEWTON_ITERATIONS; i++) {
          const x2 = sampleCurveX(t2) - x;
          const d2 = sampleCurveDerivativeX(t2);
          if (Math.abs(x2) < SUBDIVISION_PRECISION) {
            return t2;
          }
          if (Math.abs(d2) < NEWTON_MIN_SLOPE) {
            break;
          }
          t2 -= x2 / d2;
        }

        let t0 = 0.0;
        let t1 = 1.0;
        t2 = x;

        for (let i = 0; i < SUBDIVISION_MAX_ITERATIONS; i++) {
          const x2 = sampleCurveX(t2) - x;
          if (Math.abs(x2) < SUBDIVISION_PRECISION) {
            return t2;
          }
          if (x2 > 0.0) {
            t1 = t2;
          } else {
            t0 = t2;
          }
          t2 = (t1 + t0) / 2.0;
        }
        return t2;
      };

      return (t: number) => sampleCurveY(solveCurveX(t));
    },
    []
  );

  // スクロール
  const smoothScrollTo = useCallback(
    (element: HTMLElement, to: number, duration: number) => {
      const start = element.scrollTop;
      const change = to - start;
      const startTime = performance.now();
      const bezier = cubicBezier(0.22, 1, 0.36, 1);

      const animateScroll = (currentT: number) => {
        const elapsed = currentT - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = bezier(progress);
        element.scrollTop = start + change * ease;
        if (elapsed < duration) {
          requestAnimationFrame(animateScroll);
        }
      };
      requestAnimationFrame(animateScroll);
    },
    [cubicBezier]
  );

  // YouTubeプレーヤー関連
  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    youtubeRef.current = event.target;
    setDuration(event.target.getDuration());
    event.target.setVolume(settings.volume);
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (event.data === 1) {
      const interval = setInterval(() => {
        updateTime();
      }, 100);
      const stopUpdating = () => {
        clearInterval(interval);
      };
      youtubeRef.current?.addEventListener('onStateChange', stopUpdating);
    }
  };

  // 現在時刻を取得し歌詞の現在行を更新
  const updateTime = () => {
    if (!youtubeRef.current) return;
    const time = youtubeRef.current.getCurrentTime();
    setCurrentTime(time);

    let index = -1;
    for (let i = 0; i < processedLyricsData.length; i++) {
      if (processedLyricsData[i].time <= time) {
        index = i;
      } else {
        break;
      }
    }
    setCurrentLineIndex(index);
  };

  // 時刻フォーマット
  const formatTime = (time: number): string => {
    const m = Math.floor(time / 60).toString().padStart(2, '0');
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getInterludeDotsColor = (): string => {
    return resolvedTheme === 'dark' ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
  };

  // 間奏
  const renderInterludeDots = (startTime: number, endTime: number) => {
    const total = endTime - startTime;
    if (total <= 0) return null;
    const dt = currentTime - startTime;
    if (dt < 0 || dt >= total) return null;

    const appearEnd = 2;
    const exitStart = total - 1;
    let parentScale = 1.0;
    let opacity = 1.0;
    let transformTransition = '4s cubic-bezier(0.19, 1, 0.22, 1)';
    let opacityTransition = '0.5s cubic-bezier(0.19, 1, 0.22, 1)';
    let dotFills: [number, number, number] = [0, 0, 0];

    if (dt < appearEnd) {
      const ratio = dt / appearEnd;
      opacity = ratio;
    }

    if (dt < exitStart) {
      const midDuration = Math.max(0, total - (0 + 1));
      let ratio = 0;
      if (midDuration > 0) {
        ratio = (dt - 0) / midDuration;
        if (ratio > 1) ratio = 1;
      }
      const leftFill = Math.min(1, ratio * 3);
      const centerFill = ratio < 1 / 3 ? 0 : Math.min(1, (ratio - 1 / 3) * 3);
      const rightFill = ratio < 2 / 3 ? 0 : Math.min(1, (ratio - 2 / 3) * 3);
      dotFills = [leftFill, centerFill, rightFill];

      const modT = (dt - 0) % 4;
      parentScale = modT < 2 ? 1.1 : 1.0;
    }

    if (dt >= exitStart) {
      const dtExit = dt - exitStart;
      if (dtExit < 0.5) {
        transformTransition = '1s cubic-bezier(0.19, 1, 0.22, 1)';
        parentScale = 1.3;
        opacity = 1;
      } else if (dtExit < 1.5) {
        transformTransition = '1s cubic-bezier(0.19, 1, 0.22, 1)';
        opacityTransition = '0.5s cubic-bezier(0.19, 1, 0.22, 1)';
        parentScale = 0.8;
        opacity = 0;
      }

      dotFills = [1, 1, 1];
    }

    const fontSizeScale =
      settings.fontSize === 'small' ? -0.1 : settings.fontSize === 'large' ? 0.2 : 0;
    const parentStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      opacity,
      transition: `transform ${transformTransition}, opacity ${opacityTransition}`,
      position: 'absolute',
      marginTop:
        settings.fontSize === 'small'
          ? '5px'
          : settings.fontSize === 'medium'
          ? '10px'
          : '15px',
      left:
        settings.lyricposition === 'center'
          ? '50%'
          : settings.lyricposition === 'right'
          ? 'auto'
          : settings.fontSize === 'small'
          ? '5px'
          : settings.fontSize === 'medium'
          ? '10px'
          : '15px',
      right:
        settings.lyricposition === 'right'
          ? settings.fontSize === 'small'
            ? '5px'
            : settings.fontSize === 'medium'
            ? '10px'
            : '15px'
          : 'auto',
      transform:
        settings.lyricposition === 'center'
          ? `translateX(-50%) scale(${parentScale + fontSizeScale})`
          : `scale(${parentScale + fontSizeScale})`,
    };

    const dotStyle = (fill: number) => {
      const alpha = 0.2 + 0.8 * fill;
      return {
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: `${getInterludeDotsColor()}${alpha})`,
        margin: '0 6px',
        transition: `background-color ${transformTransition}`,
      } as React.CSSProperties;
    };

    return (
      <div style={parentStyle}>
        <span style={dotStyle(dotFills[0])} />
        <span style={dotStyle(dotFills[1])} />
        <span style={dotStyle(dotFills[2])} />
      </div>
    );
  };

  return (
    <>
      <PlayerLyrics
        lyricsData={processedLyricsData}
        currentTime={currentTime}
        duration={duration}
        currentLineIndex={currentLineIndex}
        isMobile={isMobile}
        settings={settings}
        resolvedTheme={theme}
        onLyricClick={handleLyricClick}
        renderInterludeDots={renderInterludeDots}
        smoothScrollTo={smoothScrollTo}
      />

      <PlayerControls
        isPlaying={isPlaying}
        togglePlayPause={togglePlayPause}
        handleSkipBack={handleSkipBack}
        handleSkipForward={handleSkipForward}
        volume={volume}
        handleVolumeChange={handleVolumeChange}
        handleProgressChange={handleProgressChange}
        currentTime={currentTime}
        duration={duration}
        isMobile={isMobile}
        trackName={trackName}
        artistName={artistName}
        albumName={albumName}
        settings={settings}
        formatTime={formatTime}
      />

      <div className="fixed z-0 w-full h-full">
        <div
          className={`w-full h-full fixed top-0 left-0 ${
            resolvedTheme === 'dark'
              ? 'bg-black bg-opacity-70'
              : 'bg-white bg-opacity-30'
          } ${
            settings.backgroundblur === 'small'
              ? 'backdrop-blur-sm'
              : settings.backgroundblur === 'medium'
              ? 'backdrop-blur-md'
              : settings.backgroundblur === 'large'
              ? 'backdrop-blur-lg'
              : ''
          }`}
        />
        <YouTube
          videoId={audioUrl}
          onReady={onPlayerReady}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onStateChange={onStateChange}
          style={{ width: '100%', height: '100%' }}
          iframeClassName="w-full h-full"
        />
      </div>

      <SettingsDialog
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        settings={settings}
        handleSettingChange={handleSettingChange}
        isMobile={isMobile}
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="fixed top-4 left-4 z-50 text-gray-900 dark:text-white"
      >
        <ArrowLeft size={30} style={{ width: '25px', height: '25px' }} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowSettings(true)}
        className="fixed top-4 right-4 z-50 text-gray-900 dark:text-white"
      >
        <MoreHorizontal size={30} style={{ width: '30px', height: '30px' }} />
      </Button>
    </>
  );
};

export default Player;