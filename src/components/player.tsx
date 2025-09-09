'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import PlayerLyrics from '@/components/lrc-lyrics';
import TTMLLyrics from '@/components/ttml-lyrics';
import AMLLLyrics from '@/components/amll-lyrics';
import PlayerControls from '@/components/player-controls';
import SettingsSidebar from '@/components/settings-dialog';
import { toast } from 'sonner';
import { PlayerProps, Settings } from '@/types';

const DEFAULT_SETTINGS: Settings = {
  showplayercontrol: true,
  fullplayer: false,
  fontSize: 'medium',
  lyricposition: 'left',
  backgroundblur: 10,
  backgroundtransparency: 50,
  theme: 'dark',
  playerposition: 'right',
  volume: 50,
  lyricOffset: 0,
  useKaraokeLyric: true,
  lyricProgressDirection: 'ltr',
  CustomEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  scrollPositionOffset: 50,
  useTTML: false,
  useWordTiming: true,
  useAMLL: true,
  amllEnableSpring: true,
  amllEnableBlur: true,
  amllEnableScale: true,
  amllHidePassedLines: false,
  amllSpringParams: {
    mass: 1,
    tension: 280,
    friction: 60,
  },
};

const Player: React.FC<PlayerProps> = ({
  lyricsData,
  audioUrl,
  trackName,
  albumName,
  artistName,
  onBack,
  ttmlData,
}) => {
  const youtubeRef = useRef<YouTube['internalPlayer'] | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(50);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileControlsVisible, setMobileControlsVisible] = useState<boolean>(true);
  const [lastInteractionTime, setLastInteractionTime] = useState<number>(Date.now());
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setTheme, resolvedTheme } = useTheme();
  const theme = resolvedTheme || 'system';
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [wasFullPlayerManuallySet, setWasFullPlayerManuallySet] = useState(false);
  const didShowToastRef = useRef(false);
  const [settings, setSettings] = useState<Settings>(() => {
    const savedSettings = localStorage.getItem('playerSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    return DEFAULT_SETTINGS;
  });

  const processedLyricsData = useMemo(() => {
    if (lyricsData.length > 0 && lyricsData[0].time >= 5) {
      return [{ time: 0, text: '' }, ...lyricsData];
    }
    return lyricsData;
  }, [lyricsData]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prevSettings) => {
      const updatedSettings = { ...DEFAULT_SETTINGS, ...prevSettings, ...newSettings };
      localStorage.setItem('playerSettings', JSON.stringify(updatedSettings));
      return updatedSettings;
    });
  };

  useEffect(() => {
    setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    if (settings?.lyricOffset !== 0 && !didShowToastRef.current) {
      toast.error(`タイミング調整が ${settings.lyricOffset} 秒に設定されています。`);
      didShowToastRef.current = true;
    }
  }, [settings.lyricOffset]);

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

  // モバイル版でのコントロール表示管理
  useEffect(() => {
    if (!isMobile) return;

    // 再生停止時は常に表示
    if (!isPlaying) {
      setMobileControlsVisible(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      return;
    }

    // 再生中は5秒後に非表示
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    hideTimeoutRef.current = setTimeout(() => {
      setMobileControlsVisible(false);
    }, 5000);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isMobile, isPlaying, lastInteractionTime]);

  // モバイル版でのコントロール表示切り替え
  const handleMobileControlsToggle = () => {
    if (!isMobile) return;
    
    setMobileControlsVisible(true);
    setLastInteractionTime(Date.now());
    
    // 再生中の場合は5秒後に再度非表示
    if (isPlaying) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        setMobileControlsVisible(false);
      }, 5000);
    }
  };

  // 設定変更
  const handleSettingChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (key === 'theme') {
      if (value === 'dark' || value === 'light' || value === 'system') {
        setTheme(value);
      }
    }
    if (key === 'fullplayer') {
      setWasFullPlayerManuallySet(true);
    }
    
    if (key === 'useAMLL' && value === true) {
      updateSettings({ [key]: value, useTTML: true });
      return;
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
    const adjustedTime = time - settings.lyricOffset;
    youtubeRef.current.seekTo(adjustedTime);
    setCurrentTime(adjustedTime);
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
  const parseCubicBezier = (easing: string): [number, number, number, number] => {
    if (!easing || typeof easing !== 'string') {
      return [0.22, 1, 0.36, 1];
    }
    const cleaned = easing.replace('cubic-bezier(', '').replace(')', '');
    const parts = cleaned.split(',').map(s => parseFloat(s.trim()));
    if (parts.length !== 4 || parts.some(isNaN)) {
      throw new Error("Invalid cubic-bezier format");
    }
    return [parts[0], parts[1], parts[2], parts[3]];
  };

  const smoothScrollTo = useCallback(
    (element: HTMLElement, to: number, duration: number): Promise<void> => {
      return new Promise((resolve) => {
        const start = element.scrollTop;
        const change = to - start;
        
        if (Math.abs(change) < 5) {
          resolve();
          return;
        }
        
        const startTime = performance.now();
        let p1x = 0.22, p1y = 1, p2x = 0.36, p2y = 1;
        try {
          const easingValues = parseCubicBezier(settings.CustomEasing || 'cubic-bezier(0.22, 1, 0.36, 1)');
          [p1x, p1y, p2x, p2y] = easingValues;
        } catch (e) {
          console.error("Invalid CustomEasing, falling back to default.", e);
        }
        const bezier = cubicBezier(p1x, p1y, p2x, p2y);

        let lastScrollTop = start;
        const animateScroll = (currentT: number) => {
          const elapsed = currentT - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = bezier(progress);
          const newScrollTop = start + change * ease;
          
          if (Math.abs(newScrollTop - lastScrollTop) >= 1) {
            element.scrollTop = newScrollTop;
            lastScrollTop = newScrollTop;
          }
          
          if (elapsed < duration) {
            requestAnimationFrame(animateScroll);
          } else {
            element.scrollTop = to;
            resolve();
          }
        };
        requestAnimationFrame(animateScroll);
      });
    },
    [cubicBezier, settings.CustomEasing]
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

  const updateTime = () => {
    if (!youtubeRef.current) return;
    const time = youtubeRef.current.getCurrentTime();
    const adjustedTime = time + settings.lyricOffset;
    let index = -1;
    for (let i = 0; i < processedLyricsData.length; i++) {
      if (processedLyricsData[i].time <= adjustedTime) {
        index = i;
      } else {
        break;
      }
    }
    setCurrentTime(time);
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

  const renderInterludeDots = (startTime: number, endTime: number, alignment: 'left' | 'center' | 'right' = 'center') => {
    const total = endTime - startTime;
    if (total < 1) return null;
    if (total <= 0) return null;
    const dt = (currentTime + settings.lyricOffset) - startTime;
    if (dt < 0 || dt >= total) return null;

    const appearEnd = 2;
    const exitStart = settings.useTTML && ttmlData ? total - 1.0 : total - 1.1;
    let parentScale = 1.0;
    let opacity = 1.0;
    const transitionDuration = Math.min(Math.max(total * 0.4, 2), 6);
    let transformTransition = `${transitionDuration}s cubic-bezier(0.22, 1, 0.36, 1)`;
    let opacityTransition = '0.5s cubic-bezier(0.22, 1, 0.36, 1)';
    let dotFills: [number, number, number] = [0, 0, 0];
    const availableDuration = exitStart - appearEnd - 2;
    const pulseCycleDuration = 5;
    const pulseCount = Math.max(1, Math.floor(availableDuration / pulseCycleDuration));
    const actualPulseDuration = availableDuration / pulseCount;

    if (dt < exitStart - 1) {
      const appearRatio = dt < appearEnd ? dt / appearEnd : 1;
      opacity = appearRatio;

      if (dt < appearEnd) {
        opacityTransition = '5s cubic-bezier(0.22, 1, 0.36, 1)';
        parentScale = 0.9 + (0.2 * dt / appearEnd);
      } else if (dt < exitStart - 2) {
        const pulseTime = dt - appearEnd;
        
        if (pulseTime < 1) {
          parentScale = 1.1;
        } else {
          const adjustedPulseTime = pulseTime - 1;
          const timeInCycle = adjustedPulseTime % actualPulseDuration;
          
          const cooldownTime = actualPulseDuration * 0.2;
          
          if (timeInCycle < cooldownTime) {
            parentScale = 0.9;
          } else {
            const pulsePhase = (timeInCycle - cooldownTime) / (actualPulseDuration - cooldownTime);
            parentScale = 0.9 + 0.2 * Math.sin(pulsePhase * Math.PI);
          }
        }
      } else {
        parentScale = 0.9;
      }

      const midDuration = Math.max(0, total - 1);
      let ratio = dt / midDuration;
      if (ratio > 1) ratio = 1;
      const leftFill = Math.min(1, ratio * 3);
      const centerFill = ratio < 1 / 3 ? 0 : Math.min(1, (ratio - 1 / 3) * 3);
      const rightFill = ratio < 2 / 3 ? 0 : Math.min(1, (ratio - 2 / 3) * 3);
      dotFills = [leftFill, centerFill, rightFill];
    }
    else if (dt >= exitStart - 1 && dt < exitStart) {
      dotFills = [1, 1, 1];
      parentScale = 0.9;
    }

    if (dt >= exitStart) {
      const dtExit = dt - exitStart;
      dotFills = [1, 1, 1];

      if (dtExit < 0.8) {
        transformTransition = '2.5s cubic-bezier(0.22, 1, 0.36, 1)';
        parentScale = 1.1;
        opacity = 1;
      } else if (dtExit < 1.2) {
        transformTransition = '1s cubic-bezier(0.22, 1, 0.36, 1)'
        opacityTransition = '0.5s cubic-bezier(0.22, 1, 0.36, 1)'
        parentScale = 0.8;
        opacity = 0;
      }
    }

    const fontSizeScale =
      settings.fontSize === 'small'
        ? -0.1
        : settings.fontSize === 'large'
        ? 0.2
        : 0;

    const parentStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      opacity,
      transition: `transform ${transformTransition}, opacity ${opacityTransition}`,
      position: 'absolute',
      marginTop:
        settings.fontSize === 'small'
          ? '10px'
          : settings.fontSize === 'medium'
          ? '20px'
          : '25px',
      left:
        alignment === 'center'
          ? '50%'
          : alignment === 'right'
          ? 'auto'
          : settings.fontSize === 'small'
          ? '5px'
          : settings.fontSize === 'medium'
          ? '10px'
          : '15px',
      right:
        alignment === 'right'
          ? settings.fontSize === 'small'
            ? '5px'
            : settings.fontSize === 'medium'
            ? '10px'
            : '15px'
          : 'auto',
      transform:
        alignment === 'center'
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
        margin: '0 5px',
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

  // YouTubeのコントロールを非表示
  const opts = {
    playerVars: {
      controls: 0,
    },
  };

  return (
    <>
      {settings.useTTML && ttmlData && settings.useAMLL ? (
        <AMLLLyrics
          ttmlData={ttmlData}
          currentTime={currentTime}
          settings={settings}
          onLyricClick={handleLyricClick}
          isMobile={isMobile}
          isPlaying={isPlaying}
          resolvedTheme={theme}
        />
      ) : settings.useTTML && ttmlData ? (
        <TTMLLyrics
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
          ttmlData={ttmlData}
        />
      ) : (
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
      )}

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
        mobileControlsVisible={mobileControlsVisible}
        onMobileControlsToggle={handleMobileControlsToggle}
      />

      <div className="fixed z-0 w-full h-full">
        <div
          className="w-full h-full fixed top-0 left-0"
          style={{
            backgroundColor: resolvedTheme === 'dark' 
              ? `rgba(0, 0, 0, ${settings.backgroundtransparency / 100})`
              : `rgba(255, 255, 255, ${settings.backgroundtransparency / 100})`,
            backdropFilter: settings.backgroundblur > 0 ? `blur(${settings.backgroundblur}px)` : 'none',
          }}
        />
        <YouTube
          videoId={audioUrl}
          opts={opts}
          onReady={onPlayerReady}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onStateChange={onStateChange}
          style={{ width: '100%', height: '100%' }}
          iframeClassName="w-full h-full"
        />
      </div>

      <SettingsSidebar
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
        className="fixed top-4 left-4 z-50 h-12 w-12 rounded-full hover:bg-background/50 hover:dark:bg-background/30 hover:backdrop-blur-sm text-foreground/90 hover:text-foreground transition-all duration-200 drop-shadow-sm"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowSettings(true)}
        className="fixed top-4 right-4 z-50 h-12 w-12 rounded-full hover:bg-background/50 hover:dark:bg-background/30 hover:backdrop-blur-sm text-foreground/90 hover:text-foreground transition-all duration-200 drop-shadow-sm"
      >
        <MoreHorizontal className="h-6 w-6" />
      </Button>
    </>
  );
};

export default Player;
