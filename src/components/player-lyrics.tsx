'use client';

import React, { useEffect, useRef, useState } from 'react';
import LineBreaker from '@/components/linebreak';

interface LyricLine {
  time: number;
  text: string;
}

interface Settings {
  showplayercontrol: boolean;
  fullplayer: boolean;
  fontSize: 'small' | 'medium' | 'large';
  lyricposition: 'left' | 'center' | 'right';
  backgroundblur: 'none' | 'small' | 'medium' | 'large';
  backgroundtransparency: 'none' | 'small' | 'medium' | 'large';
  theme: 'system' | 'dark' | 'light';
  playerposition: 'left' | 'center' | 'right';
  volume: number;
  lyricOffset: number;
}

interface PlayerLyricsProps {
  lyricsData: LyricLine[];
  currentTime: number;
  duration: number;
  currentLineIndex: number;
  isMobile: boolean;
  settings: Settings;
  resolvedTheme: string;
  onLyricClick: (time: number) => void;
  renderInterludeDots: (startTime: number, endTime: number) => JSX.Element | null;
  smoothScrollTo: (
    element: HTMLElement,
    to: number,
    duration: number
  ) => void;
}

const PlayerLyrics: React.FC<PlayerLyricsProps> = ({
  lyricsData,
  duration,
  currentLineIndex,
  isMobile,
  settings,
  onLyricClick,
  renderInterludeDots,
  smoothScrollTo,
}) => {
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const [isLyricsHovered, setIsLyricsHovered] = useState<boolean>(false);

  // 自動スクロール
  useEffect(() => {
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

    const scrollDuration = timeDiff < 0.5 ? 300 : timeDiff < 1 ? 500 : 1000;
  
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
  
      smoothScrollTo(container, targetScrollTop, scrollDuration);
    }
  }, [currentLineIndex, lyricsData, duration, isMobile, smoothScrollTo]);  

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
            const isCurrentLineInterlude =
              lyricsData[currentLineIndex]?.text.trim() === '';

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
              <p
                key={index}
                id={`lyric-${index}`}
                className={`transition-all duration-700 px-2 rounded-lg
                  ${
                    isInterlude
                      ? 'm-0 p-0'
                      : `my-8 
                        ${
                          isActive
                            ? 'text-black dark:text-white font-bold'
                            : 'text-black text-opacity-50 dark:text-white dark:text-opacity-40 hover:text-gray-900 dark:hover:text-gray-300 cursor-pointer'
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
                    'transform 1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s, margin 1s, padding 1s, color 0.5s',
                  wordWrap: 'break-word',
                  wordBreak: 'break-word',
                }}
                onClick={() => onLyricClick(line.time)}
              >
                {isInterlude && isActive
                  ? renderInterludeDots(line.time, endTime)
                  : isInterlude
                  ? null
                  : <LineBreaker text={line.text} />}
              </p>
            );
          })}
          <div style={{ height: window.innerHeight }}></div>
        </div>
      </div>
    </div>
  );
};

export default PlayerLyrics;