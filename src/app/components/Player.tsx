'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import YouTube , { YouTubeProps } from 'react-youtube';

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

interface Settings {
  showplayercontrol: boolean;
  fontSize: 'small' | 'medium' | 'large';
  lyricposition: 'left' | 'center' | 'right';
  backgroundblur: 'small' | 'medium' | 'large';
  theme: 'dark' | 'light';
}

const DEFAULT_SETTINGS: Settings = {
  showplayercontrol: true,
  fontSize: 'medium',
  lyricposition: 'left', 
  backgroundblur: 'large',
  theme: 'dark'
};

const Player: React.FC<PlayerProps> = ({
  lyricsData,
  audioUrl,
  trackName,
  albumName,
  artistName,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const youtubeRef = useRef<YouTube['internalPlayer'] | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(50);
  const [isLyricsHovered, setIsLyricsHovered] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const SCROLL_DURATION = 1000;
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings>(() => {
  const savedSettings = localStorage.getItem('playerSettings');
  return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem('playerSettings', JSON.stringify(newSettings));
  };

  const handleSettingChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    updateSettings({ ...settings, [key]: value });
  };

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

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    youtubeRef.current = event.target;
    setDuration(event.target.getDuration());
  }
  const updateTime = () => {
    if (youtubeRef.current) {
      const time = youtubeRef.current.getCurrentTime();
      setCurrentTime(time);
      let index = -1;
      for (let i = 0; i < lyricsData.length; i++) {
        if (lyricsData[i].time <= time) {
          index = i;
        } else {
          break;
        }
      }
      setCurrentLineIndex(index);
    }
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (event.data === 1) {
      const interval = setInterval(() => {
        updateTime();
      }, 100);
      const stopUpdating = () => {
        clearInterval(interval);
      };
      youtubeRef.current.addEventListener("onStateChange", stopUpdating);
    }
  };

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
    const audio = youtubeRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pauseVideo();
    } else {
      audio.playVideo();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = youtubeRef.current;
    if (!audio) return;
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audio.setVolume(newVolume);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = youtubeRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    audio.seekTo(newTime);
  };

  const handleLyricClick = (time: number) => {
    const audio = youtubeRef.current;
    if (!audio) return;
    audio.seekTo(time);
    setCurrentTime(time);
    if (!isPlaying) {
      audio.playVideo();
    }
  };

  const handleLyricsMouseEnter = () => {
    setIsLyricsHovered(true);
  };

  const handleLyricsMouseLeave = () => {
    setIsLyricsHovered(false);
  };

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

  const themeClasses = {
    dark: {
      background: 'bg-gray-800',
      text: 'text-white',
      secondaryText: 'text-gray-400',
      hoverText: 'hover:text-gray-300',
      inputBg: '#4B5563',
      inputHoverBg: '#1DB954',
      modalBg: 'bg-gray-800',
      buttonBg: 'bg-gray-700',
      buttonActiveBg: 'bg-green-500',
      activelyrics: 'text-white',
      otherlyrics: 'text-white text-opacity-40',
      interludedots: 'rgba(255,255,255,',
      settingbutton: 'hover:bg-white hover:bg-opacity-20'
    },
    light: {
      background: 'bg-white',
      text: 'text-gray-900',
      secondaryText: 'text-gray-600',
      hoverText: 'hover:text-gray-800',
      inputBg: '#D1D5DB',
      inputHoverBg: '#1DB954',
      modalBg: 'bg-white',
      buttonBg: 'bg-gray-300',
      buttonActiveBg: 'bg-green-500',
      activelyrics: 'text-black',
      otherlyrics: 'text-black text-opacity-50',
      interludedots: 'rgba(0,0,0,',
      settingbutton: 'hover:bg-black hover:bg-opacity-15'
    }
  };
  const currentTheme = themeClasses[settings.theme];  

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
      else if (dtExit < 1.5) {
        transformTransition = '1s cubic-bezier(0.19, 1, 0.22, 1)';
        opacityTransition = '0.5s cubic-bezier(0.19, 1, 0.22, 1)';
        parentScale = 0.8;
        opacity = 0;
      }

      dotFills = [1, 1, 1];
    }

    const fontSizeScale = settings.fontSize === 'small' ? -0.1 : settings.fontSize === 'large' ? 0.2 : 0;
    const parentStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      opacity: opacity,
      transition: `transform ${transformTransition}, opacity ${opacityTransition}`,
      position: 'absolute',
      left: settings.lyricposition === 'center' ? '50%' : settings.lyricposition === 'right' ? 'auto' : settings.fontSize === 'small' ? '5px' : settings.fontSize === 'medium' ? '10px' : '15px',
      right: settings.lyricposition === 'right' ? (settings.fontSize === 'small' ? '5px' : settings.fontSize === 'medium' ? '10px' : '15px') : 'auto',
      transform: settings.lyricposition === 'center' ? `translateX(-50%) scale(${parentScale + fontSizeScale})` : `scale(${parentScale + fontSizeScale})`,
    };

    const dotStyle = (fill: number) => {
      const alpha = 0.2 + 0.8 * fill;
      return {
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      backgroundColor: `${currentTheme.interludedots}${alpha})`,
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
        className={`fixed inset-0 flex flex-col justify-center z-50 ${
          settings.lyricposition === 'center'
            ? 'items-center text-center'
            : settings.lyricposition === 'right'
            ? `items-end ${isMobile ? 'right-0' : 'right-20'}`
            : `items-start ${isMobile ? 'left-0' : 'left-20'}`
        }`}
        onMouseEnter={handleLyricsMouseEnter}
        onMouseLeave={handleLyricsMouseLeave}
      >
        <div
          className={`overflow-y-auto w-full max-w-4xl hidden-scrollbar ${
            settings.theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}
          style={{
            height: settings.showplayercontrol 
              ? '89vh'
              : '100vh',
            maskImage: isLyricsHovered
              ? 'none'
              : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 30%, #000 70%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: isLyricsHovered
              ? 'none'
              : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 30%, #000 70%, rgba(0,0,0,0) 100%)',
            marginBottom: settings.showplayercontrol
              ? '98px'
              : '0',
            padding: isMobile ? '20px' : ''
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
              let EndTime = nextTime - 0.5;
              if (EndTime < line.time) {
                EndTime = line.time;
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
                            ? currentTheme.activelyrics
                            : `${currentTheme.otherlyrics} ${currentTheme.hoverText} cursor-pointer`
                        }`
                  }`}
                  style={{
                    opacity,
                    fontSize: {
                      small: '2.0rem',
                      medium: '2.5rem',
                      large: '3.0rem'
                    }[settings.fontSize],
                    fontWeight: 'bold',
                    textAlign: settings.lyricposition,
                    transform:
                      isCurrentLineInterlude && index > currentLineIndex
                        ? 'translateY(55px)'
                        : 'translateY(0)',
                    transition:
                      'transform 1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s, margin 1s, padding 1s, color 0.5s',
                  }}
                  onClick={() => handleLyricClick(line.time)}
                >
                  {isInterlude && isActive
                    ? renderInterludeDots(line.time, EndTime)
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

      <div className={`fixed z-50 bottom-0 w-full h-[100px] flex flex-col justify-between ${settings.showplayercontrol ? 'visible' : 'hidden'} ${currentTheme.background}`}>
        <div className="flex items-center justify-center px-2 mt-3 mx-3">
          <span className={`text-sm ${currentTheme.text}`}>{formatTime(currentTime)}</span>
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
          <span className={`text-sm ${currentTheme.text}`}>{formatTime(duration)}</span>
        </div>

        <div className={`flex items-center justify-between px-4 mb-4 ml-3 relative`}>
          <button onClick={togglePlayPause} className={`${currentTheme.text}`}>
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
          <div className={`absolute left-1/2 transform -translate-x-1/2 text-center flex flex-col items-center justify-center text-nowrap ${currentTheme.text}`}>
            <p className="font-semibold pb-1">{trackName}</p>
            <p className={`text-sm mb-2 ${currentTheme.secondaryText}`}>
              {albumName} - {artistName}
            </p>
          </div>
          <div className="flex items-center mr-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 mr-1 ${currentTheme.text}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M3 9v6h4l5 5V4L7 9H3z" />
            </svg>
            <input
              type="range"
              min="0"
              max="100"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1DB954 ${
                  volume * 100
                }%, ${currentTheme.inputBg} ${volume * 100}%)`,
                transition: 'background 0.3s ease',
              }}
            />
          </div>
        </div>
        {/*<audio ref={audioRef} src={audioUrl} />*/}
      </div>
      <div className='fixed z-0 w-full h-full'>
        <div className={`w-full h-full fixed top-0 left-0 ${settings.theme === 'dark' ? 'bg-black bg-opacity-70' : 'bg-white bg-opacity-30'} ${settings.backgroundblur === 'small' ? 'backdrop-blur-sm' : settings.backgroundblur === 'medium' ? 'backdrop-blur-md' : 'backdrop-blur-lg'}`}></div>
        <YouTube 
          videoId={audioUrl} 
          onReady={onPlayerReady} 
          onPlay={()=>{setIsPlaying(true)}} 
          onPause={()=>{setIsPlaying(false)}} 
          onStateChange={onStateChange} 
          style={{width:"100%",height:"100%"}}
          iframeClassName="w-full h-full" 
        />
      </div>

      <div className="fixed flex items-center mr-3 top-5 right-5 z-50">
        <button 
          onClick={() => setShowSettings(true)}
          className={`ml-4 p-2 rounded-full ${currentTheme.settingbutton} ${currentTheme.text}`}
          style={{transition: 'background 0.2s ease'}}
          >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-7 w-7" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          </button>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${currentTheme.modalBg}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${currentTheme.text}`}>Settings</h2>
              <button 
                onClick={() => setShowSettings(false)}
                className={`${currentTheme.text}`}
                style={{transition: 'color 0.2s ease'}}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className={`${currentTheme.text}`}>Show PlayerControl</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={settings.showplayercontrol}
                    onChange={e => handleSettingChange('showplayercontrol', e.target.checked)}
                  />
                  <div 
                    className={`w-11 h-6 rounded-full peer 
                      transition-colors duration-300 ease-in-out 
                      ${settings.theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} 
                      peer-checked:bg-green-500`}
                  ></div>
                  <div 
                    className={`absolute w-4 h-4 bg-white rounded-full transform transition-transform duration-300 ease-in-out
                      peer-checked:translate-x-6
                      translate-x-1`}
                  ></div>
                </label>
              </div>

                <div className="space-y-2">
                  <p className={`${currentTheme.text}`}>Lyric FontSize</p>
                  <div className="flex gap-2">
                    {['small', 'medium', 'large'].map((size) => (
                      <button
                        key={size}
                        className={`px-4 py-2 rounded transition-all duration-300 ease-in-out ${
                          settings.fontSize === size 
                            ? `${currentTheme.buttonActiveBg} text-white` 
                            : `${currentTheme.buttonBg} ${
                                settings.theme === 'dark' ? 'text-gray-300' : 'text-black'
                              }`
                        }`}
                        onClick={() => handleSettingChange('fontSize', size as Settings['fontSize'])}
                      >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className={`${currentTheme.text}`}>Lyric Position</p>
                  <div className="flex gap-2">
                    {[
                      { code: 'left', label: 'Left' },
                      { code: 'center', label: 'Center' },
                      { code: 'right', label: 'Right' }
                    ].map((item) => (
                      <button
                        key={item.code}
                        className={`px-4 py-2 rounded transition-all duration-300 ease-in-out ${
                          settings.lyricposition === item.code 
                            ? `${currentTheme.buttonActiveBg} text-white` 
                            : `${currentTheme.buttonBg} ${
                                settings.theme === 'dark' ? 'text-gray-300' : 'text-black'
                              }`
                        }`}
                        onClick={() => handleSettingChange('lyricposition', item.code as Settings['lyricposition'])}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className={`${currentTheme.text}`}>BackGround Blur</p>
                  <div className="flex gap-2">
                    {['small', 'medium', 'large'].map((size) => (
                      <button
                        key={size}
                        className={`px-4 py-2 rounded transition-all duration-300 ease-in-out ${
                          settings.backgroundblur === size 
                            ? `${currentTheme.buttonActiveBg} text-white` 
                            : `${currentTheme.buttonBg} ${
                                settings.theme === 'dark' ? 'text-gray-300' : 'text-black'
                              }`
                        }`}
                        onClick={() => handleSettingChange('backgroundblur', size as Settings['backgroundblur'])}
                      >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className={`${currentTheme.text}`}>Theme</p>
                  <div className="flex gap-2">
                    {['dark', 'light'].map((theme) => (
                      <button
                        key={theme}
                        className={`px-4 py-2 rounded transition-all duration-300 ease-in-out ${
                          settings.theme === theme 
                            ? `${currentTheme.buttonActiveBg} text-white` 
                            : `${currentTheme.buttonBg} ${
                                settings.theme === 'dark' ? 'text-gray-300' : 'text-black'
                              }`
                        }`}
                        onClick={() => handleSettingChange('theme', theme as Settings['theme'])}
                      >
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Player;