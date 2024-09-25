'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

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
}

const Player: React.FC<PlayerProps> = ({
  lyricsData,
  audioUrl,
  trackName,
  albumName,
  artistName,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isLyricsHovered, setIsLyricsHovered] = useState<boolean>(false);

  // Memoize cubicBezier to prevent unnecessary re-creations
  const cubicBezier = useCallback(
    (p1x: number, p1y: number, p2x: number, p2y: number) => {
      // Constants
      const NEWTON_ITERATIONS = 4;
      const NEWTON_MIN_SLOPE = 0.001;
      const SUBDIVISION_PRECISION = 0.0000001;
      const SUBDIVISION_MAX_ITERATIONS = 10;
  
      // Coefficients for the cubic bezier curve
      const ax = 3.0 * p1x - 3.0 * p2x + 1.0;
      const bx = 3.0 * p2x - 6.0 * p1x;
      const cx = 3.0 * p1x;
  
      const ay = 3.0 * p1y - 3.0 * p2y + 1.0;
      const by = 3.0 * p2y - 6.0 * p1y;
      const cy = 3.0 * p1y;
  
      // Functions to calculate the curve
      const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
      const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
      const sampleCurveDerivativeX = (t: number) => (3.0 * ax * t + 2.0 * bx) * t + cx;
  
      // Solve for t given x
      const solveCurveX = (x: number) => {
        let t0 = 0.0;
        let t1 = 1.0;
        let t2 = x;
  
        // Use Newton-Raphson method
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
  
        // Use bisection method if Newton-Raphson fails
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
  
        // Return the best guess
        return t2;
      };
  
      return (t: number) => sampleCurveY(solveCurveX(t));
    },
    []
  );
  

  // Memoize smoothScrollTo to prevent unnecessary re-creations
  const smoothScrollTo = useCallback(
    (element: HTMLElement, to: number, duration: number) => {
      const start = element.scrollTop;
      const change = to - start;
      const startTime = performance.now();

      // cubic-bezier(0.22, 1, 0.36, 1) タイミング関数を定義
      const bezier = cubicBezier(0.22, 1, 0.36, 1);

      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1); // 進行状況が 1 を超えないように
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // 現在の再生時間に基づいて現在の歌詞行を更新
      let index = -1;
      for (let i = 0; i < lyricsData.length; i++) {
        if (lyricsData[i].time <= audio.currentTime) {
          index = i;
        } else {
          break;
        }
      }

      setCurrentLineIndex(index);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [lyricsData]);

  useEffect(() => {
    if (!lyricsContainerRef.current) return;
    const container = lyricsContainerRef.current;
    const activeLyric = document.getElementById(`lyric-${currentLineIndex}`);
    if (activeLyric) {
      const containerHeight = container.clientHeight;
      const contentHeight = container.scrollHeight;
      const lyricOffsetTop = activeLyric.offsetTop;
      const lyricHeight = activeLyric.clientHeight;

      let targetScrollTop = lyricOffsetTop - containerHeight / 2 + lyricHeight / 2;

      // targetScrollTop を有効な範囲内に制限
      targetScrollTop = Math.max(0, Math.min(targetScrollTop, contentHeight - containerHeight));

      // カスタムスムーススクロールを実行
      smoothScrollTo(container, targetScrollTop, 500);
    }
  }, [currentLineIndex, smoothScrollTo]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audio.volume = newVolume;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    audio.currentTime = newTime;
  };

  // 歌詞行をクリックしたときに特定の時間にジャンプ
  const handleLyricClick = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
    if (!isPlaying) {
      audio.play();
    }
  };

  // 歌詞のホバー状態を管理
  const handleLyricsMouseEnter = () => {
    setIsLyricsHovered(true);
  };

  const handleLyricsMouseLeave = () => {
    setIsLyricsHovered(false);
  };

  // 時間を mm:ss 形式にフォーマット
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // 進行状況に基づいた動的なスライダー背景
  const sliderBackground = () => {
    if (duration === 0) return '#4B5563'; // Tailwind の gray-700
    const percentage = (currentTime / duration) * 100;
    return `linear-gradient(to right, #1DB954 ${percentage}%, #4B5563 ${percentage}%)`;
  };

  return (
    <>
      {/* 歌詞表示 */}
      <div
        className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 text-white"
        onMouseEnter={handleLyricsMouseEnter}
        onMouseLeave={handleLyricsMouseLeave}
      >
        <div
          className="overflow-y-auto w-full max-w-2xl"
          style={{
            height: '89vh', // 歌詞表示の高さを調整
            maskImage: isLyricsHovered
              ? 'none'
              : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 30%, #000 70%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: isLyricsHovered
              ? 'none'
              : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 30%, #000 70%, rgba(0,0,0,0) 100%)',
            marginBottom: '98px',
          }}
          ref={lyricsContainerRef}
        >
          <div className="relative">
            <div className="h-96"></div>
            {lyricsData.map((line, index) => {
              const isActive = index === currentLineIndex;
              const isPast = index < currentLineIndex;

              // ホバー時には全ての行が完全な不透明度
              // それ以外の場合、過去の行は非表示、現在の行は完全に表示、未来の行はデフォルトの不透明度
              const opacity = isLyricsHovered
                ? 1
                : isActive
                ? 1
                : isPast
                ? 0
                : 1;

              // 現在の行がインタールードかどうかを判定
              const isInterlude = line.text.trim() === '';

              return (
                <p
                  key={index}
                  id={`lyric-${index}`}
                  className={`text-center my-4 transition-all duration-300 px-2 ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300 cursor-pointer'
                  }`}
                  style={{
                    opacity: opacity,
                    fontSize: '2.0rem',
                    fontWeight: 'bold',
                  }}
                  onClick={() => handleLyricClick(line.time)}
                >
                  {isInterlude ? (
                    // アクティブなインタールードの場合のみドットを表示
                    <span
                      className={`flex space-x-2 justify-center transition-all duration-500 ${
                        isActive
                          ? 'animate-fade-in-scale m-10'
                          : 'animate-fade-out-scale opacity-0 scale-0 m-0'
                      }`}
                    >
                      <span className="h-5 w-5 bg-white rounded-full"></span>
                      <span className="h-5 w-5 bg-white rounded-full"></span>
                      <span className="h-5 w-5 bg-white rounded-full"></span>
                    </span>
                  ) : (
                    line.text
                  )}
                </p>
              );
            })}
            <div className="h-96"></div>
          </div>
        </div>
      </div>

      {/* プレイヤーコントロール */}
      <div className="fixed bottom-0 w-full bg-gray-800 h-[100px] flex flex-col justify-between">
        {/* プログレスバー */}
        <div className="flex items-center justify-center px-2 mt-3 mx-3">
          <span className="text-sm text-white">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleProgressChange}
            className="flex-1 mx-3 h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: sliderBackground(),
              transition: 'background 0.3s ease',
            }}
          />
          <span className="text-sm text-white">{formatTime(duration)}</span>
        </div>

        {/* トラック情報とコントロール */}
        <div className="flex items-center justify-between px-4 mb-4 ml-3">
          {/* 左側の再生/一時停止ボタン */}
          <button onClick={togglePlayPause} className="text-white">
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M5 3h4v18H5V3zm10 0h4v18h-4V3z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </button>

          {/* 中央のトラック情報 */}
          <div className="absolute left-1/2 transform -translate-x-1/2 text-center flex flex-col">
            <p className="text-white font-semibold">{trackName}</p>
            <p className="text-gray-400 text-sm">
              {albumName} - {artistName}
            </p>
          </div>

          {/* 右側のボリュームコントロール */}
          <div className="flex items-center mr-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white mr-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M3 9v6h4l5 5V4L7 9H3z" />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1DB954 ${
                  volume * 100
                }%, #4B5563 ${volume * 100}%)`,
                transition: 'background 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* オーディオ要素 */}
        <audio ref={audioRef} src={audioUrl} />
      </div>
    </>
  );
};

export default Player;
