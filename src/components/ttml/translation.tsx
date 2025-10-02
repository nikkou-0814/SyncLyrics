'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { TranslationWordTimingLyricLineProps } from '@/types';

const TranslationWordTimingLyricLine: React.FC<TranslationWordTimingLyricLineProps> = ({
  backgroundWords,
  currentTime,
  resolvedTheme,
  progressDirection,
  karaokeEnabled,
  persistActive,
  activeColor: activeColorProp,
  inactiveColor: inactiveColorProp,
}) => {
  const isDark = resolvedTheme === 'dark';
  const defaultActive = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
  const defaultInactive = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
  const activeColor = activeColorProp ?? defaultActive;
  const inactiveColor = inactiveColorProp ?? defaultInactive;
  const [animationEnabled, setAnimationEnabled] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setAnimationEnabled(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  const lineBegin = backgroundWords[0]?.begin ?? 0;
  const lineEnd = backgroundWords[backgroundWords.length - 1]?.end ?? 0;
  const lineActivePlain = !karaokeEnabled && ((currentTime >= lineBegin && currentTime < lineEnd) || !!persistActive);

  if (!backgroundWords || backgroundWords.length === 0) return null;

  return (
    <span ref={containerRef} style={{ display: 'inline-block', whiteSpace: 'pre-wrap' }}>
      {backgroundWords.map((word, index) => {
        const wordIsCompleted = currentTime >= word.end;
        const wordIsActive = currentTime >= word.begin && currentTime < word.end;

        if (karaokeEnabled && (progressDirection === 'btt' || progressDirection === 'ttb')) {
          return (
            <span
              key={`tr-word-${index}-${word.begin}-${word.end}`}
              style={{
                display: 'inline-block',
                position: 'relative',
                transform: wordIsActive || wordIsCompleted ? 'translateY(-3px)' : 'translateY(0px)',
                transition: 'transform 1s ease',
                color: inactiveColor,
                whiteSpace: 'pre-wrap',
              }}
            >
              {word.text}
              {(wordIsActive || wordIsCompleted) && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    color: activeColor,
                    clipPath:
                      progressDirection === 'btt'
                        ? `inset(${
                            100 -
                            (wordIsActive
                              ? ((currentTime - word.begin) / (word.end - word.begin)) * 100
                              : 100)
                          }% 0 0 0)`
                        : `inset(0 0 ${
                            100 -
                            (wordIsActive
                              ? ((currentTime - word.begin) / (word.end - word.begin)) * 100
                              : 100)
                          }% 0)`,
                    transition: animationEnabled ? 'clip-path 0.1s linear' : 'none',
                    pointerEvents: 'none',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {word.text}
                </span>
              )}
            </span>
          );
        } else {
          const isLTR = progressDirection === 'ltr';
          let wordProgress = 0;
          if (wordIsActive) {
            const wordDuration = word.end - word.begin;
            wordProgress = (currentTime - word.begin) / wordDuration;
            wordProgress = Math.max(0, Math.min(1, wordProgress));
          } else if (wordIsCompleted) {
            wordProgress = 1;
          }

          const backgroundSize = '200% 100%';
          const position = isLTR ? (1 - wordProgress) * 100 : wordProgress * 100;
          const finalPosition = wordIsActive
            ? `${position}% 0`
            : wordIsCompleted
              ? isLTR
                ? '0% 0'
                : '100% 0'
              : isLTR
                ? '100% 0'
                : '0% 0';

          const bgImage =
            (karaokeEnabled && (wordIsActive || wordIsCompleted))
              ? `linear-gradient(to ${isLTR ? 'right' : 'left'}, ${activeColor}, ${activeColor} 47%, ${inactiveColor} 53%, ${inactiveColor})`
              : 'none';

          return (
            <span
              key={`tr-word-${index}-${word.begin}-${word.end}`}
              style={{
                display: 'inline-block',
                color: (!karaokeEnabled) ? (lineActivePlain ? activeColor : inactiveColor) : ((!wordIsActive && !wordIsCompleted) ? inactiveColor : 'transparent'),
                backgroundImage: bgImage,
                backgroundSize: backgroundSize,
                backgroundPosition: finalPosition,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                transform: (karaokeEnabled && (wordIsActive || wordIsCompleted)) ? 'translateY(-3px)' : 'translateY(0px)',
                transition: animationEnabled
                  ? (karaokeEnabled ? 'background-position 0.1s linear, transform 1.5s ease' : 'background-position 0.1s linear, transform 1.5s ease, color 0.5s ease')
                  : (karaokeEnabled ? 'transform 0.5s ease' : 'transform 0.5s ease, color 0.5s ease'),
                whiteSpace: 'pre-wrap',
              }}
            >
              {word.text}
            </span>
          );
        }
      })}
    </span>
  );
};

export default TranslationWordTimingLyricLine;
