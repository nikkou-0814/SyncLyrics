'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackgroundWordTimingLyricLineProps } from '@/types';

const BackgroundWordTimingLyricLine: React.FC<BackgroundWordTimingLyricLineProps & { karaokeEnabled?: boolean; persistActive?: boolean }> = ({
  backgroundWords,
  currentTime,
  resolvedTheme,
  progressDirection,
  fontSize,
  pronunciationWords,
  showPronunciation,
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

  const pronActiveColor = activeColor;
  const pronInactiveColor = inactiveColor;

  const getPronForWord = useCallback((w: { begin: number; end: number }): string => {
    if (!showPronunciation || !pronunciationWords || pronunciationWords.length === 0) return '';
    const overlaps = pronunciationWords
      .filter(pw => Math.min(w.end, pw.end) - Math.max(w.begin, pw.begin) > 0.01)
      .map(pw => pw.text);
    if (overlaps.length > 0) return overlaps.join(' ');
    let best: { t: string; d: number } | null = null;
    for (const pw of pronunciationWords) {
      const d = Math.abs(pw.begin - w.begin);
      if (!best || d < best.d) best = { t: pw.text, d };
    }
    if (best && best.d <= 0.15) return best.t;
    return '';
  }, [showPronunciation, pronunciationWords]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setAnimationEnabled(true);
    });
    
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);
  
  const bgfontSizeValue = {
    small: '1.2rem',
    medium: '1.5rem',
    large: '2.0rem',
  }[fontSize];
  
  const lineBegin = backgroundWords && backgroundWords.length > 0 ? backgroundWords[0].begin : 0;
  const lineEnd = backgroundWords && backgroundWords.length > 0 ? backgroundWords[backgroundWords.length - 1].end : 0;
  const lineActivePlain = !karaokeEnabled && ((currentTime >= lineBegin && currentTime < lineEnd) || !!persistActive);

  // 単語の表示処理
  const renderWords = () => {
    if (!backgroundWords || backgroundWords.length === 0) return null;
    
    return backgroundWords.map((word, index) => {
      const wordIsCompleted = currentTime >= word.end;
      const wordIsActive = currentTime >= word.begin && currentTime < word.end;
      
      // btt/ttb
      if (karaokeEnabled && (progressDirection === 'btt' || progressDirection === 'ttb')) {
        return (
          showPronunciation && pronunciationWords && pronunciationWords.length > 0 ? (
            <span
              key={`bg-word-${index}-${word.begin}-${word.end}`}
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                lineHeight: 1.1,
                whiteSpace: 'pre-wrap'
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  position: 'relative',
                  transform: wordIsActive || wordIsCompleted ? 'translateY(-3px)' : 'translateY(0px)',
                  transition: 'transform 1s ease',
                  color: inactiveColor,
                  whiteSpace: 'pre-wrap',
                  fontSize: bgfontSizeValue,
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
                      clipPath: (
                        progressDirection === 'btt' ? 
                          `inset(${100 - (wordIsActive ? (currentTime - word.begin) / (word.end - word.begin) * 100 : 100)}% 0 0 0)` : 
                          `inset(0 0 ${100 - (wordIsActive ? (currentTime - word.begin) / (word.end - word.begin) * 100 : 100)}% 0)`
                      ),
                      transition: animationEnabled ? 'clip-path 0.1s linear' : 'none',
                      pointerEvents: 'none',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {word.text}
                  </span>
                )}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  position: 'relative',
                  fontSize: '0.48em',
                  color: pronInactiveColor,
                  whiteSpace: 'pre-wrap',
                  textAlign: karaokeEnabled ? 'left' : 'inherit',
                  transform: wordIsActive || wordIsCompleted ? 'translateY(-3px)' : 'translateY(0px)',
                  transition: 'transform 1s ease'
                }}
              >
                {getPronForWord(word)}
                {(wordIsActive || wordIsCompleted) && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      color: pronActiveColor,
                      clipPath: (
                        progressDirection === 'btt' ? 
                          `inset(${100 - (wordIsActive ? (currentTime - word.begin) / (word.end - word.begin) * 100 : 100)}% 0 0 0)` : 
                          `inset(0 0 ${100 - (wordIsActive ? (currentTime - word.begin) / (word.end - word.begin) * 100 : 100)}% 0)`
                      ),
                      transition: animationEnabled ? 'clip-path 0.1s linear' : 'none',
                      pointerEvents: 'none',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {getPronForWord(word)}
                  </span>
                )}
              </span>
            </span>
          ) : (
            <span
              key={`bg-word-${index}-${word.begin}-${word.end}`}
              style={{
                display: 'inline-block',
                position: 'relative',
                transform: wordIsActive || wordIsCompleted ? 'translateY(-3px)' : 'translateY(0px)',
                transition: 'transform 1s ease',
                color: inactiveColor,
                whiteSpace: 'pre-wrap',
                fontSize: bgfontSizeValue,
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
                    clipPath: (
                      progressDirection === 'btt' ? 
                        `inset(${100 - (wordIsActive ? (currentTime - word.begin) / (word.end - word.begin) * 100 : 100)}% 0 0 0)` : 
                        `inset(0 0 ${100 - (wordIsActive ? (currentTime - word.begin) / (word.end - word.begin) * 100 : 100)}% 0)`
                    ),
                    transition: animationEnabled ? 'clip-path 0.1s linear' : 'none',
                    pointerEvents: 'none',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {word.text}
                </span>
              )}
            </span>
          )
        );
      } else {
        // ltr/rtl
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
        const finalPosition = wordIsActive ? `${position}% 0` : (wordIsCompleted ? (isLTR ? '0% 0' : '100% 0') : (isLTR ? '100% 0' : '0% 0'));
        
        const bgImage = (karaokeEnabled && (wordIsActive || wordIsCompleted))
          ? `linear-gradient(to ${isLTR ? 'right' : 'left'}, ${activeColor}, ${activeColor} 47%, ${inactiveColor} 53%, ${inactiveColor})`
          : 'none';
        
        return (
          showPronunciation && pronunciationWords && pronunciationWords.length > 0 ? (
            <span
              key={`bg-word-${index}-${word.begin}-${word.end}`}
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              <span
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
                  fontSize: bgfontSizeValue,
                }}
              >
                {word.text}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.48em',
                  whiteSpace: 'pre-wrap',
                  textAlign: karaokeEnabled ? 'left' : 'inherit',
                  color: (!karaokeEnabled) ? (lineActivePlain ? pronActiveColor : pronInactiveColor) : ((wordIsActive || wordIsCompleted) ? 'transparent' : pronInactiveColor),
                  backgroundImage: (!karaokeEnabled) ? 'none' : ((wordIsActive || wordIsCompleted)
                    ? `linear-gradient(to ${isLTR ? 'right' : 'left'}, ${pronActiveColor}, ${pronActiveColor} 47%, ${pronInactiveColor} 53%, ${pronInactiveColor})`
                    : 'none'),
                  backgroundSize: backgroundSize,
                  backgroundPosition: finalPosition,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  transform: (karaokeEnabled && (wordIsActive || wordIsCompleted)) ? 'translateY(-3px)' : 'translateY(0px)',
                  transition: animationEnabled
                    ? (karaokeEnabled ? 'background-position 0.1s linear, transform 1.5s ease' : 'background-position 0.1s linear, transform 1.5s ease, color 0.5s ease')
                    : (karaokeEnabled ? 'transform 0.5s ease' : 'transform 0.5s ease, color 0.5s ease')
                }}
              >
                {getPronForWord(word)}
              </span>
            </span>
          ) : (
            <span
              key={`bg-word-${index}-${word.begin}-${word.end}`}
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
                fontSize: bgfontSizeValue,
              }}
            >
              {word.text}
            </span>
          )
        );
      }
    });
  };
  
  return (
    <span ref={containerRef} style={{ display: 'inline-block', whiteSpace: 'pre-wrap' }}>
      {renderWords()}
    </span>
  );
};

export default BackgroundWordTimingLyricLine;
