// src/app/components/LyricsDisplay.tsx

import { useEffect, useRef } from 'react';

interface LyricLine {
  time: number;
  text: string;
}

interface LyricsDisplayProps {
  lyricsData: LyricLine[];
  currentTime: number;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ lyricsData, currentTime }) => {
  const currentLineIndex = lyricsData.findIndex((line, index) => {
    const nextLine = lyricsData[index + 1];
    if (nextLine) {
      return currentTime >= line.time && currentTime < nextLine.time;
    }
    return currentTime >= line.time;
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentLineIndex !== -1 && containerRef.current) {
      const activeLine = containerRef.current.children[currentLineIndex] as HTMLElement;
      if (activeLine) {
        activeLine.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentLineIndex]);

  return (
    <div ref={containerRef} className="w-full max-w-2xl overflow-y-auto h-96">
      {lyricsData.map((line, index) => (
        <p
          key={index}
          className={`text-center mb-2 text-lg transition-colors duration-300 ${
            index === currentLineIndex ? 'text-blue-500' : 'text-white'
          }`}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
};

export default LyricsDisplay;
