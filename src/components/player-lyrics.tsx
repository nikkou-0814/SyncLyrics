'use client';

import React, { useEffect, useRef, useState } from 'react';
import LineBreaker from '@/components/linebreak';
import { PlayerLyricsProps, KaraokeLyricLineProps } from '@/types';

const KaraokeLyricLine: React.FC<KaraokeLyricLineProps> = ({
  text,
  progressPercentage,
  resolvedTheme,
  isActive,
  progressDirection,
}) => {
  const isDark = resolvedTheme === 'dark';
  const activeColor = isDark ? '#FFFFFF' : '#000000';
  const inactiveColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)';
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    let animationFrameId: number | null = null;
    let timerId: NodeJS.Timeout | null = null;

    if (progressDirection === 'ttb' || progressDirection === 'btt') {
      animationFrameId = requestAnimationFrame(() => setShouldAnimate(true));
    } else {
      timerId = setTimeout(() => setShouldAnimate(true), 50);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (timerId) clearTimeout(timerId);
    };
  }, [isActive, progressDirection]);

  if (progressDirection === 'ttb' || progressDirection === 'btt') {
    const getClipPath = (): string => {
      switch (progressDirection) {
        case 'btt':
          return `inset(${100 - progressPercentage}% 0 0 0)`;
        case 'ttb':
          return `inset(0 0 ${100 - progressPercentage}% 0)`;
        default:
          return `inset(0 0 ${100 - progressPercentage}% 0)`;
      }
    };

    return (
      <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'pre-wrap' }}>
        <span style={{ color: inactiveColor, pointerEvents: 'none' }}>
          <LineBreaker text={text} />
        </span>
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            color: activeColor,
            clipPath: getClipPath(),
            transition: shouldAnimate ? 'clip-path 0.1s linear' : 'none',
            whiteSpace: 'pre-wrap',
            pointerEvents: 'none',
          }}
        >
          <LineBreaker text={text} />
        </span>
      </span>
    );
  }

  const getGradient = (): string => {
    switch (progressDirection) {
      case 'rtl':
        return `linear-gradient(to left, ${activeColor}, ${activeColor} 50%, ${inactiveColor} 50%, ${inactiveColor})`;
      case 'ltr':
      default:
        return `linear-gradient(to right, ${activeColor}, ${activeColor} 50%, ${inactiveColor} 50%, ${inactiveColor})`;
    }
  };

  const getBackgroundSize = (): string => '200% 100%';

  const getBackgroundPosition = (): string => {
    const progress = progressPercentage / 100;
    switch (progressDirection) {
      case 'rtl':
        return `${progress * 100}% 0`;
      case 'ltr':
      default:
        return `${(1 - progress) * 100}% 0`;
    }
  };

  return (
    <span
      style={{
        display: 'inline',
        whiteSpace: 'pre-wrap',
        color: 'transparent',
        backgroundImage: getGradient(),
        backgroundSize: getBackgroundSize(),
        backgroundPosition: getBackgroundPosition(),
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        transition: shouldAnimate ? 'background-position 0.1s linear' : 'none',
        pointerEvents: 'none'
      }}
    >
      <LineBreaker text={text} />
    </span>
  );
};

const PlayerLyrics: React.FC<PlayerLyricsProps> = ({
  lyricsData,
  currentTime,
  duration,
  currentLineIndex,
  isMobile,
  settings,
  resolvedTheme,
  onLyricClick,
  renderInterludeDots,
  smoothScrollTo,
}) => {
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const [isLyricsHovered, setIsLyricsHovered] = useState<boolean>(false);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState<boolean>(true);
  const scrollDisableTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticScrollingRef = useRef<boolean>(false);

  useEffect(() => {
    if (currentLineIndex < 0 || currentLineIndex >= lyricsData.length) return;
    
    const currentLyricTime = lyricsData[currentLineIndex].time;
    const nextLyricTime = 
      currentLineIndex + 1 < lyricsData.length
        ? lyricsData[currentLineIndex + 1].time
        : duration;
    
    const timeDiff = nextLyricTime - currentLyricTime;
    if (timeDiff <= 0) {
      setProgressPercentage(currentTime >= currentLyricTime ? 100 : 0);
      return;
    }
    
    const elapsed = (currentTime + settings.lyricOffset) - currentLyricTime;
    const progress = Math.min(Math.max(elapsed / timeDiff, 0), 1) * 100;
    
    setProgressPercentage(progress);
  }, [currentTime, currentLineIndex, lyricsData, duration, settings.lyricOffset]);

  useEffect(() => {
    const container = lyricsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isProgrammaticScrollingRef.current) return;
      if (scrollDisableTimerRef.current) {
        clearTimeout(scrollDisableTimerRef.current);
      }
      setIsAutoScrollEnabled(false);

      scrollDisableTimerRef.current = setTimeout(() => {
        setIsAutoScrollEnabled(true);
      }, 5000);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 自動スクロール
  useEffect(() => {
    if (!isAutoScrollEnabled) return;
    if (!lyricsContainerRef.current) return;
    if (currentLineIndex < 0 || currentLineIndex >= lyricsData.length) return;
  
    const container = lyricsContainerRef.current;
    const activeLyric = document.getElementById(`lyric-${currentLineIndex}`);

    // 次の歌詞との時間差を計算
    const currentLyricTime = lyricsData[currentLineIndex].time;
    const nextLyricTime =
      currentLineIndex + 1 < lyricsData.length
        ? lyricsData[currentLineIndex + 1].time
        : duration;
  
    const timeDiff = nextLyricTime - currentLyricTime;

    const scrollDuration = timeDiff < 0.2 ? 150 : timeDiff < 0.3 ? 200 : timeDiff < 0.4 ? 250 : timeDiff < 0.5 ? 300 : timeDiff < 0.6 ? 350 : timeDiff < 0.7 ? 400 : timeDiff < 0.8 ? 450 : timeDiff < 0.9 ? 500 : timeDiff < 1 ? 600 : 1000;
  
    if (activeLyric) {
      const containerHeight = container.clientHeight;
      const contentHeight = container.scrollHeight;
      const lyricOffsetTop = activeLyric.offsetTop;
      const lyricHeight = activeLyric.clientHeight;
  
      // モバイルは画面上部、PCなどは中央寄せ
      let targetScrollTop: number;
      if (isMobile) {
        const displayHeight = window.innerHeight;
        const offsetFromTop = displayHeight * 0.3;
        targetScrollTop = lyricOffsetTop - offsetFromTop + lyricHeight / 2;
      } else {
        targetScrollTop =
          lyricOffsetTop - containerHeight / 2 + lyricHeight / 2;
      }
  
      // スクロール範囲を超えないように調整
      targetScrollTop = Math.max(
        0,
        Math.min(targetScrollTop, contentHeight - containerHeight)
      );

      isProgrammaticScrollingRef.current = true;
      (smoothScrollTo as (element: HTMLElement, to: number, duration: number) => Promise<void>)(container, targetScrollTop, scrollDuration)
        .then(() => {
          isProgrammaticScrollingRef.current = false;
        });
    }
  }, [currentLineIndex, lyricsData, duration, isMobile, smoothScrollTo, isAutoScrollEnabled]);

  const handleLyricsMouseEnter = () => {
    setIsLyricsHovered(true);
  };

  const handleLyricsMouseLeave = () => {
    setIsLyricsHovered(false);
  };

  return (
    <div
      className={`fixed inset-0 flex flex-col justify-center z-50 
        ${settings.lyricposition === 'center' ? 'items-center text-center' : 
          settings.lyricposition === 'right' ? `items-end ${isMobile ? 'right-0' : 'right-20'}` : 
          `items-start ${isMobile ? 'left-0' : 'left-20'}`}
        text-gray-900 dark:text-white
      `}
    >
      <div
        className={`overflow-y-auto hidden-scrollbar
          ${settings.theme === 'dark' ? 'text-white' : 'text-gray-900'}
          ${settings.fullplayer ? 'h-[92vh]' : 'h-full'}
          ${settings.fullplayer && settings.showplayercontrol ? 'mb-20' : ''}
          ${isMobile ? 'p-5 w-5/6' : 'w-4/5'}
        `}
        style={{
          maskImage: isMobile || isLyricsHovered
            ? 'linear-gradient(0deg, rgba(0,0,0,0) 0%, #000 30%, #000 70%, rgba(0,0,0,0) 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 20%, #000 80%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: isMobile || isLyricsHovered
            ? 'linear-gradient(0deg, rgba(0,0,0,0) 0%, #000 30%, #000 70%, rgba(0,0,0,0) 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 20%, #000 80%, rgba(0,0,0,0) 100%)',
          marginBottom: settings.fullplayer
            ? settings.showplayercontrol
              ? '92px'
              : '0'
            : '0',
          padding: isMobile ? '20px' : '',
          maxWidth: '1000px'
        }}
        ref={lyricsContainerRef}
        onMouseEnter={handleLyricsMouseEnter}
        onMouseLeave={handleLyricsMouseLeave}
      >
        <div className="relative">
          <div style={{ height: window.innerHeight }}></div>
          {lyricsData.map((line, index) => {
            const isActive = index === currentLineIndex;
            const isPast = index < currentLineIndex;
            const isInterlude = line.text.trim() === '';
            const isCurrentLineInterlude = lyricsData[currentLineIndex]?.text.trim() === '';

            let nextTime = duration;
            if (index + 1 < lyricsData.length) {
              nextTime = lyricsData[index + 1].time;
            }

            let endTime = nextTime - 0.5;
            if (endTime < line.time) {
              endTime = line.time;
            }
            if (index + 1 < lyricsData.length) {
              endTime += 0.7;
            }

            const opacity = isLyricsHovered
              ? 1
              : isActive
              ? 1
              : isPast
              ? 0
              : 1;

            return (
              <div
                key={index}
                id={`lyric-${index}`}
                className={`transition-all duration-700 px-2 rounded-lg :hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer
                  ${
                    isInterlude
                      ? 'm-0 p-0'
                      : `my-8 
                        ${
                          isActive
                            ? 'font-bold'
                            : 'text-black text-opacity-50 dark:text-white dark:text-opacity-40 hover:text-gray-900 dark:hover:text-gray-300'
                        }`
                  }`}
                style={{
                  opacity,
                  fontSize: {
                    small: '2.0rem',
                    medium: '3.0rem',
                    large: '4.0rem',
                  }[settings.fontSize],
                  fontWeight: 'bold',
                  textAlign: settings.lyricposition,
                  transform:
                    isCurrentLineInterlude && index > currentLineIndex
                      ? `${settings.fontSize === 'small' ? 'translateY(55px)'
                        : settings.fontSize === 'medium' ? 'translateY(70px)'
                        : 'translateY(80px)'}`
                      : 'translateY(0)',
                  transition:
                    `transform 1s ${settings.CustomEasing || 'cubic-bezier(0.19, 1, 0.22, 1)'}, opacity 0.8s, margin 1s, padding 1s, color 0.5s, background-color 0.5s`,
                  wordWrap: 'break-word',
                  wordBreak: 'break-word',
                }}
                onClick={() => { onLyricClick(line.time); setIsAutoScrollEnabled(true);}}
              >
                {isInterlude
                  ? isActive
                    ? renderInterludeDots(line.time, endTime)
                    : null
                  : isActive && settings.useKaraokeLyric
                  ? (
                    <KaraokeLyricLine
                      text={line.text}
                      progressPercentage={progressPercentage}
                      resolvedTheme={resolvedTheme}
                      isActive={isActive}
                      progressDirection={settings.lyricProgressDirection}
                    />
                  )
                  : (
                    <span style={{ pointerEvents: 'none' }}>
                      <LineBreaker text={line.text} />
                    </span>
                  )
                }
              </div>
            );
          })}
          <div style={{ height: window.innerHeight }}></div>
        </div>
      </div>
    </div>
  );
};

export default PlayerLyrics;
