import React, { useRef, useState, useEffect } from 'react';

interface LyricLine {
  time: number;
  text: string;
}

interface PlayerProps {
  lyricsData: LyricLine[];
  audioUrl: string;
}

const Player: React.FC<PlayerProps> = ({ lyricsData, audioUrl }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);

  const lineHeight = 60; // 歌詞行の高さ（px）

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // 現在の時間に合わせて歌詞の行を更新
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
    const activeLyric = document.getElementById(`lyric-${currentLineIndex}`);
    if (activeLyric) {
      activeLyric.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLineIndex]);

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
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
      audio.play();
    }
  };

  // 時間表示のフォーマット
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // 次の歌詞までの時間を計算
  const nextLyricTime =
    lyricsData[currentLineIndex + 1]?.time || audioRef.current?.duration || 0;
  const timeUntilNextLyric = nextLyricTime - currentTime;

  // スライダーの背景を動的に設定
  const sliderBackground = () => {
    if (duration === 0) return '#4B5563'; // Tailwindのgray-700
    const percentage = (currentTime / duration) * 100;
    return `linear-gradient(to right, #1DB954 ${percentage}%, #4B5563 ${percentage}%)`;
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* 歌詞表示部分 */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden group">
        <div
          className="w-full max-w-2xl text-center overflow-y-auto"
          style={{ height: '60vh' }}
        >
          <div
            className="transition-transform duration-500 ease-custom"
            style={{
              transform: `translateY(-${currentLineIndex * lineHeight}px)`,
            }}
          >
            {lyricsData.map((line, index) => {
              const isCurrentLine = index === currentLineIndex;
              const isPastLine = index < currentLineIndex;
              const isInterludeLine = isCurrentLine && !line.text.trim();

              const opacityClass = isCurrentLine
                ? 'opacity-100'
                : isPastLine
                ? 'opacity-0 transition-opacity duration-500'
                : 'opacity-60 group-hover:opacity-80 transition-opacity duration-300';

              const textColorClass = isCurrentLine
                ? 'text-white'
                : 'text-gray-500';

              return (
                <p
                  key={index}
                  id={`lyric-${index}`}
                  className={`my-2 text-2xl cursor-pointer ${opacityClass} ${textColorClass}`}
                  style={{ height: `${lineHeight}px` }}
                  onClick={() => handleLyricClick(line.time)}
                >
                  {isInterludeLine ? (
                    <DotsProgress duration={timeUntilNextLyric} />
                  ) : (
                    line.text || '\u00A0'
                  )}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      {/* プレイヤーコントロール */}
      <div className="w-full bg-gray-900 p-4 flex flex-col items-center">
        {/* 進捗バー */}
        <div className="w-full flex items-center">
          <span className="text-sm text-white">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleProgressChange}
            className="flex-1 mx-4 h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: sliderBackground(),
              transition: 'background 0.3s ease',
            }}
          />
          <span className="text-sm text-white">
            {formatTime(duration)}
          </span>
        </div>

        {/* コントロールボタン */}
        <div className="flex items-center justify-center mt-4">
          {/* 再生/一時停止ボタン */}
          <button onClick={togglePlayPause} className="mx-4">
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M5 3h4v18H5V3zm10 0h4v18h-4V3z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </button>
        </div>

        {/* 音量調整ボタン */}
        <div className="flex items-center mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-white mr-2"
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
            className="w-32 h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #1DB954 ${volume * 100}%, #4B5563 ${volume * 100}%)`,
              transition: 'background 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* オーディオ要素 */}
      <audio ref={audioRef} src={audioUrl} />
    </div>
  );
};

// DotsProgress コンポーネント
const DotsProgress: React.FC<{ duration: number }> = ({ duration }) => {
  const dotCount = 3;
  const interval = duration / dotCount;

  return (
    <div className="flex items-center justify-center space-x-2">
      {[...Array(dotCount)].map((_, i) => (
        <div
          key={i}
          className="w-4 h-4 bg-gray-500 rounded-full animate-dotAnimation"
          style={{
            animationDelay: `${i * interval}s`,
          }}
        ></div>
      ))}
    </div>
  );
};

export default Player;
