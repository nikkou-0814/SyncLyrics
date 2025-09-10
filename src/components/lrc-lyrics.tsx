'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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

const LrcLyrics: React.FC<PlayerLyricsProps> = ({
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
  const [stageLineKeys, setStageLineKeys] = useState<string[]>([]);
  const preStageKeyRef = useRef<string | null>(null);
  const lastUserScrollTimeRef = useRef<number>(0);
  const scrollCooldownPeriod = 200;

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

    const handleUserScroll = () => {
      if (isProgrammaticScrollingRef.current) return;
      
      const now = Date.now();
      if (now - lastUserScrollTimeRef.current > scrollCooldownPeriod) {
        lastUserScrollTimeRef.current = now;
        
        if (scrollDisableTimerRef.current) {
          clearTimeout(scrollDisableTimerRef.current);
        }
        setIsAutoScrollEnabled(false);

        scrollDisableTimerRef.current = setTimeout(() => {
          setIsAutoScrollEnabled(true);
        }, 2000);
      }
    };

    container.addEventListener('wheel', handleUserScroll, { passive: true });
    container.addEventListener('touchmove', handleUserScroll, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleUserScroll);
      container.removeEventListener('touchmove', handleUserScroll);
    };
  }, []);

  const updateStageLine = useCallback(() => {
    const container = lyricsContainerRef.current;
    if (!container) return;
    if (!isProgrammaticScrollingRef.current) return;
    const nodes = Array.from(
      container.querySelectorAll<HTMLDivElement>('[data-line-past="false"][data-line-key]')
    );
    const scrollTop = container.scrollTop + 1;
    let picked: HTMLDivElement | null = null;
    for (const el of nodes) {
      if (el.offsetTop >= scrollTop) { picked = el; break; }
    }
    if (!picked) return;
    const key = picked.dataset.lineKey || null;
    if (!key) return;
    preStageKeyRef.current = key;
    setStageLineKeys(prev => (prev.includes(key) ? prev : [key, ...prev]));
  }, []);

  useEffect(() => {
    const container = lyricsContainerRef.current;
    if (!container) return;
    const onScroll = () => { if (isProgrammaticScrollingRef.current) requestAnimationFrame(updateStageLine); };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [updateStageLine]);

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

    const scrollDuration = timeDiff < 0.2 ? 150 : timeDiff < 0.3 ? 200 : timeDiff < 0.4 ? 250 : timeDiff < 0.5 ? 300 : timeDiff < 0.6 ? 350 : timeDiff < 0.7 ? 400 : timeDiff < 0.8 ? 450 : timeDiff < 0.9 ? 500 : timeDiff < 1 ? 600 : 850;
  
    if (activeLyric) {
      const containerHeight = container.clientHeight;
      const contentHeight = container.scrollHeight;
      const lyricOffsetTop = activeLyric.offsetTop;
      const lyricHeight = activeLyric.clientHeight;
  
      const offsetPercentage = settings.scrollPositionOffset !== undefined ? settings.scrollPositionOffset / 100 : 0.5;
      
      // モバイルは画面上部、PCなどは中央寄せ
      let targetScrollTop: number;
      if (isMobile) {
        const displayHeight = window.innerHeight;
        const offsetFromTop = displayHeight * offsetPercentage;
        targetScrollTop = lyricOffsetTop - offsetFromTop + lyricHeight / 2;
      } else {
        const scrollOffset = (1 - offsetPercentage) * containerHeight;
        targetScrollTop = lyricOffsetTop - containerHeight / 2 + lyricHeight / 2 + scrollOffset - containerHeight / 2;
      }
  
      // スクロール範囲を超えないように調整
      targetScrollTop = Math.max(
        0,
        Math.min(targetScrollTop, contentHeight - containerHeight)
      );

      isProgrammaticScrollingRef.current = true;

      {
        let stageEnd = nextLyricTime;
        const hasNext = currentLineIndex + 1 < lyricsData.length;
        if (hasNext) stageEnd += 0.7;
        const key = `${currentLyricTime}-${stageEnd}`;
        preStageKeyRef.current = key;
        setStageLineKeys(prev => (prev.includes(key) ? prev : [key, ...prev]));
      }
      
      (smoothScrollTo as (element: HTMLElement, to: number, duration: number) => Promise<void>)(container, targetScrollTop, scrollDuration)
        .finally(() => {
          setTimeout(() => {
            isProgrammaticScrollingRef.current = false;
          }, 50);
        });
    }
  }, [currentLineIndex, lyricsData, duration, isMobile, smoothScrollTo, isAutoScrollEnabled, settings.scrollPositionOffset]);

  useEffect(() => {
    if (currentLineIndex < 0 || currentLineIndex >= lyricsData.length) {
      setStageLineKeys([]);
      preStageKeyRef.current = null;
      return;
    }
    const now = currentTime + settings.lyricOffset;
    const line = lyricsData[currentLineIndex];
    const nextTime =
      currentLineIndex + 1 < lyricsData.length ? lyricsData[currentLineIndex + 1].time : duration;
    let endTime = nextTime - 0.5;
    if (endTime < line.time) endTime = line.time;
    if (currentLineIndex + 1 < lyricsData.length) endTime += 0.7;
    const curKey = `${line.time}-${endTime}`;

    setStageLineKeys(() => {
      const includePre = preStageKeyRef.current && now < line.time
        ? [preStageKeyRef.current]
        : [];
      if (preStageKeyRef.current && now >= line.time) {
        preStageKeyRef.current = null;
      }
      const next = [...includePre, curKey];
      return next;
    });
  }, [currentTime, currentLineIndex, lyricsData, duration, settings.lyricOffset]);

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
          ${isMobile ? 'px-3 w-full' : 'px-20 w-full'}
        `}
        style={{
          maskImage: 'linear-gradient(0deg, rgba(0,0,0,0) 2%, #000 50%, #000 52%, rgba(0,0,0,0) 98%)',
          WebkitMaskImage: 'linear-gradient(0deg, rgba(0,0,0,0) 2%, #000 50%, #000 52%, rgba(0,0,0,0) 98%)',
          marginBottom: isMobile ? '-120px' : settings.fullplayer
            ? settings.showplayercontrol
              ? '120px'
              : '0'
            : '0',
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

            const lineKey = (() => {
              return `${line.time}-${endTime}`;
            })();
            const isStage = stageLineKeys.includes(lineKey) && !isPast;
            const isRightAligned = settings.lyricposition === 'right';
            const stageShiftPx =
              settings.fontSize === 'small' ? (isRightAligned ? -1 : 1)
              : settings.fontSize === 'medium' ? (isRightAligned ? -2 : 2)
              : (isRightAligned ? -2 : 2);

            return (
              <div
                key={index}
                id={`lyric-${index}`}
                className={`transition-all duration-700 px-2 rounded-lg :hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer relative
                  ${
                    isInterlude
                      ? 'm-0 p-0'
                      : `${settings.fontSize === 'small' ? 'my-2' : 'my-4'}
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
                      ? `${settings.fontSize === 'small' ? 'translateY(45px)'
                        : settings.fontSize === 'medium' ? 'translateY(68px)'
                        : 'translateY(83px)'}`
                      : 'translateY(0)',
                  transition:
                    `transform 0.85s ${settings.CustomEasing || 'cubic-bezier(0.22, 1, 0.36, 1)'}, opacity 0.8s, margin 1s, padding 1s, color 0.5s, background-color 0.5s`,
                  wordWrap: 'break-word',
                  wordBreak: 'break-word',
                }}
                onClick={() => { onLyricClick(line.time); setIsAutoScrollEnabled(true);}}
                data-line-active={isActive ? 'true' : 'false'}
                data-line-past={index < currentLineIndex ? 'true' : 'false'}
                data-line-key={lineKey}
                data-line-begin={String(line.time)}
                data-line-end={String(endTime)}
              >
                {isInterlude
                  ? isActive
                  ? renderInterludeDots(line.time, endTime, settings.lyricposition === 'right' ? 'right' : settings.lyricposition === 'center' ? 'center' : 'left')
                  : null
                  : (
                    <span
                      className="inline-block will-change-transform"
                      data-stage-span={isStage ? 'true' : 'false'}
                      style={{
                        transform: isStage ? `translateX(${stageShiftPx}px) scale(1.03)` : 'translateX(0) scale(1.0)',
                        transformOrigin: isRightAligned ? 'right center' : 'left center',
                        transition: `transform ${(() => {
                          const dt = Math.min(Math.max((endTime - line.time), 0.01), 1.0);
                          return dt < 0.2 ? '0.15s'
                                : dt < 0.3 ? '0.2s'
                                : dt < 0.4 ? '0.25s'
                                : dt < 0.5 ? '0.3s'
                                : dt < 0.6 ? '0.35s'
                                : dt < 0.7 ? '0.4s'
                                : dt < 0.8 ? '0.45s'
                                : dt < 0.9 ? '0.5s'
                                : '0.6s';
                        })()} ${settings.CustomEasing || 'cubic-bezier(0.22, 1, 0.36, 1)'}`
                      }}
                    >
                      <div className={settings.fontSize === 'small' ? 'p-3' : settings.fontSize === 'medium' ? 'p-4' : settings.fontSize === 'large' ? 'p-5' : 'p-4'}>
                      {isActive && settings.useKaraokeLyric
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

export default LrcLyrics;
