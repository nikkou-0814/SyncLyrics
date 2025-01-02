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
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const SCROLL_DURATION = 1000;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

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

        let targetScrollTop =
          lyricOffsetTop - containerHeight / 2 + lyricHeight / 2;
        targetScrollTop = Math.max(
          0,
          Math.min(targetScrollTop, contentHeight - containerHeight)
        );
        smoothScrollTo(container, targetScrollTop, SCROLL_DURATION);
      
    }
  }, [currentLineIndex, lyricsData, smoothScrollTo]);

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

  const handleLyricClick = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
    if (!isPlaying) {
      audio.play();
    }
  };

  const handleLyricsMouseEnter = () => setIsLyricsHovered(true);
  const handleLyricsMouseLeave = () => setIsLyricsHovered(false);

  const formatTime = (time: number): string => {
    const m = Math.floor(time / 60).toString().padStart(2, '0');
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const sliderBackground = () => {
    if (duration === 0) return '#4B5563';
    const percentage = (currentTime / duration) * 100;
    return `linear-gradient(to right, #1DB954 ${percentage}%, #4B5563 ${percentage}%)`;
  };

  const renderInterludeDots = (startTime: number, endTime: number) => {
    const total = endTime - startTime;
    if (total <= 0) return null;

    const dt = currentTime - startTime;

    if (dt < 0) return null;
    if (dt >= total) return null;

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
      dotFills = [0, 0, 0];
    }
    else if (dt < exitStart) {
      const dtMid = dt - appearEnd; 
      const midDuration = Math.max(0, total - (appearEnd + 1));

      let ratio = 0;
      if (midDuration > 0) {
        ratio = dtMid / midDuration;
        if (ratio > 1) ratio = 1;
      }
      const leftFill = Math.min(1, ratio * 3);
      const centerFill = ratio < 1 / 3 ? 0 : Math.min(1, (ratio - 1 / 3) * 3);
      const rightFill = ratio < 2 / 3 ? 0 : Math.min(1, (ratio - 2 / 3) * 3);
      dotFills = [leftFill, centerFill, rightFill];

      const modT = dtMid % 4;
      if (modT < 2) {
        parentScale = 1.1;
      } else {
        parentScale = 1.0;
      }

      opacity = 1;
    }
    else {
      const dtExit = dt - exitStart;

      if (dtExit < 0.5) {
        transformTransition = '1s cubic-bezier(0.19, 1, 0.22, 1)';
        parentScale = 1.3;
        opacity = 1;
      }
      else if (dtExit < 1.3) {
        transformTransition = '1s cubic-bezier(0.19, 1, 0.22, 1)';
        opacityTransition = '0.5s cubic-bezier(0.19, 1, 0.22, 1)';
        parentScale = 0.7;
        opacity = 0;
      }

      dotFills = [1, 1, 1];
    }

    const parentStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      transform: `${isMobile ? `scale(${parentScale - 0.2})` : `translateX(-50%) scale(${parentScale})`}`,
      opacity: opacity,
      transition: `transform ${transformTransition}, opacity ${opacityTransition}`,
      position: 'absolute',
      left: isMobile ? '0' : '50%'
    };

    const dotStyle = (fill: number) => {
      const alpha = 0.2 + 0.8 * fill;
      return {
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: `rgba(255,255,255,${alpha})`,
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
      <div
        className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 text-white"
        onMouseEnter={handleLyricsMouseEnter}
        onMouseLeave={handleLyricsMouseLeave}
      >
        <div
          className="overflow-y-auto w-full max-w-2xl hidden-scrollbar"
          style={{
            height: '89vh',
            maskImage: isLyricsHovered
              ? 'none'
              : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 30%, #000 70%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: isLyricsHovered
              ? 'none'
              : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 30%, #000 70%, rgba(0,0,0,0) 100%)',
            marginBottom: '98px',
            padding: isMobile ? '20px' : '',
          }}
          ref={lyricsContainerRef}
        >
          <div className="relative">
            <div style={{ height: '500px' }}></div>

              {lyricsData.map((line, index) => {
                const isActive = index === currentLineIndex;
                const isPast = index < currentLineIndex;
                const isInterlude = line.text.trim() === '';
                const isCurrentLineInterlude = lyricsData[currentLineIndex]?.text.trim() === '';

                let nextTime = duration;
                if (index + 1 < lyricsData.length) {
                  nextTime = lyricsData[index + 1].time;
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
                    className={`transition-all duration-700 px-2 active:bg-[rgba(255,255,255,0.1)] rounded-lg ${
                      isInterlude
                        ? 'm-0 p-0'
                        : `my-8 ${
                            isActive
                              ? 'text-white'
                              : 'text-gray-500 hover:text-gray-300 cursor-pointer'
                          }`
                    }${isMobile ? ' text-left' : ' text-center'}`}
                    style={{
                      opacity,
                      fontSize: isMobile ? '2.0rem' : '2.5rem',
                      fontWeight: 'bold',
                      transform:
                        isCurrentLineInterlude && index > currentLineIndex
                          ? 'translateY(55px)'
                          : 'translateY(0)',
                      transition:
                        'transform 1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s, margin 0.3s, padding 0.3s',
                    }}
                    onClick={() => handleLyricClick(line.time)}
                  >
                    {isInterlude && isActive
                      ? renderInterludeDots(line.time, nextTime)
                      : isInterlude
                      ? null
                      : line.text}
                  </p>
                );
              })}
            <div style={{ height: '500px' }}></div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 w-full bg-gray-800 h-[100px] flex flex-col justify-between">
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

        <div className="flex items-center justify-between px-4 mb-4 ml-3 relative">
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
          <div className="absolute left-1/2 transform -translate-x-1/2 text-center flex flex-col items-center justify-center text-nowrap">
            <p className="text-white font-semibold pb-1">{trackName}</p>
            <p className="text-gray-400 text-sm mb-2">
              {albumName} - {artistName}
            </p>
          </div>
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
        <audio ref={audioRef} src={audioUrl} />
      </div>
    </>
  );
};

export default Player;