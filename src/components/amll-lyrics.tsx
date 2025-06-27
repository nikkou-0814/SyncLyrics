'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LyricPlayer, type LyricPlayerRef } from '@applemusic-like-lyrics/react';
import type { LyricLine, LyricLineMouseEvent } from '@applemusic-like-lyrics/core';
import { AMLLLyricsProps, TTMLLine } from '@/types';

const AMLLLyrics: React.FC<AMLLLyricsProps> = ({
  ttmlData,
  currentTime,
  settings,
  resolvedTheme,
  onLyricClick,
  isMobile,
}) => {
  const lyricPlayerRef = useRef<LyricPlayerRef>(null);
  const [lyricLines, setLyricLines] = useState<LyricLine[]>([]);

  useEffect(() => {
    if (!ttmlData || !ttmlData.divs) return;

    const convertedLines: LyricLine[] = [];
    
    let primaryAgent: string | undefined;
    if (ttmlData.agents && ttmlData.agents.length > 0) {
      for (const div of ttmlData.divs) {
        for (const line of div.lines) {
          if (line.agent) {
            primaryAgent = line.agent;
            break;
          }
        }
        if (primaryAgent) break;
      }
    }

    ttmlData.divs.forEach((div) => {
      div.lines.forEach((line: TTMLLine) => {
        const isDuetLine = !!(
          line.agent && 
          primaryAgent && 
          line.agent !== primaryAgent
        );
        if (line.words && line.words.length > 0) {
          // 単語レベルのタイミングがある場合
          const words = line.words.map((word) => ({
            word: word.text,
            startTime: word.begin * 1000,
            endTime: word.end * 1000,
          }));

          convertedLines.push({
            words,
            startTime: line.begin * 1000,
            endTime: line.end * 1000,
            translatedLyric: '',
            romanLyric: '',
            isBG: false,
            isDuet: isDuetLine,
          });

          if (line.backgroundWords && line.backgroundWords.length > 0) {
            const backgroundWords = line.backgroundWords.map((word) => ({
              word: word.text,
              startTime: word.begin * 1000,
              endTime: word.end * 1000,
            }));

            convertedLines.push({
              words: backgroundWords,
              startTime: line.backgroundWords[0].begin * 1000,
              endTime: line.backgroundWords[line.backgroundWords.length - 1].end * 1000,
              translatedLyric: '',
              romanLyric: '',
              isBG: true,
              isDuet: false,
            });
          } else if (line.backgroundText) {
            convertedLines.push({
              words: [
                {
                  word: line.backgroundText,
                  startTime: line.begin * 1000,
                  endTime: line.end * 1000,
                },
              ],
              startTime: line.begin * 1000,
              endTime: line.end * 1000,
              translatedLyric: '',
              romanLyric: '',
              isBG: true,
              isDuet: false,
            });
          }
        } else if (line.text) {
          // 行レベルのタイミングのみの場合
          const isDuetLine = !!(
            line.agent && 
            primaryAgent && 
            line.agent !== primaryAgent
          );
          
          convertedLines.push({
            words: [
              {
                word: line.text,
                startTime: line.begin * 1000,
                endTime: line.end * 1000,
              },
            ],
            startTime: line.begin * 1000,
            endTime: line.end * 1000,
            translatedLyric: '',
            romanLyric: '',
            isBG: false,
            isDuet: isDuetLine,
          });

          if (line.backgroundWords && line.backgroundWords.length > 0) {
            const backgroundWords = line.backgroundWords.map((word) => ({
              word: word.text,
              startTime: word.begin * 1000,
              endTime: word.end * 1000,
            }));

            convertedLines.push({
              words: backgroundWords,
              startTime: line.backgroundWords[0].begin * 1000,
              endTime: line.backgroundWords[line.backgroundWords.length - 1].end * 1000,
              translatedLyric: '',
              romanLyric: '',
              isBG: true,
              isDuet: false,
            });
          } else if (line.backgroundText) {
            convertedLines.push({
              words: [
                {
                  word: line.backgroundText,
                  startTime: line.begin * 1000,
                  endTime: line.end * 1000,
                },
              ],
              startTime: line.begin * 1000,
              endTime: line.end * 1000,
              translatedLyric: '',
              romanLyric: '',
              isBG: true,
              isDuet: false,
            });
          }
        }
      });
    });

    setLyricLines(convertedLines);
  }, [ttmlData]);

  const handleLyricClick = (line: LyricLineMouseEvent) => {
    if (lyricLines[line.lineIndex]) {
      const timeInSeconds = lyricLines[line.lineIndex].startTime / 1000;
      onLyricClick(timeInSeconds);
    }
  };

  const [, setIsLyricsHovered] = useState<boolean>(false);

  const handleLyricsMouseEnter = () => {
    setIsLyricsHovered(true);
  };

  const handleLyricsMouseLeave = () => {
    setIsLyricsHovered(false);
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: settings.lyricposition === 'left' ? 'flex-start' : 
                settings.lyricposition === 'right' ? 'flex-end' : 'center',
    width: '100%',
  };

  const lyricPlayerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    pointerEvents: 'auto',
    textAlign: settings.lyricposition === 'left' ? 'left' : 
                settings.lyricposition === 'right' ? 'right' : 'center',
    paddingLeft: isMobile ? '' : (settings.lyricposition === 'left' ? '80px' : '40px'),
    paddingRight: isMobile ? '' : (settings.lyricposition === 'right' ? '80px' : '40px'),
  };

  if (!ttmlData || lyricLines.length === 0) {
    return null;
  }

  const adjustedTime = Math.round((currentTime + settings.lyricOffset) * 1000);

  return (
    <div 
      style={containerStyle}
      onMouseEnter={handleLyricsMouseEnter}
      onMouseLeave={handleLyricsMouseLeave}
    >
      <div style={lyricPlayerStyle}>
        <LyricPlayer
          ref={lyricPlayerRef}
          lyricLines={lyricLines}
          currentTime={adjustedTime}
          onLyricLineClick={handleLyricClick}
          alignPosition={(settings.scrollPositionOffset !== undefined ? settings.scrollPositionOffset / 100 : 0.5)}
          enableSpring={settings.amllEnableSpring ?? true}
          enableBlur={settings.amllEnableBlur ?? true}
          enableScale={settings.amllEnableScale ?? true}
          hidePassedLines={settings.amllHidePassedLines ?? false}
          style={{
            '--amll-color-primary': resolvedTheme === 'dark' ? '#ffffff' : '#000000',
            '--amll-color-secondary': resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)',
            '--amll-color-accent': '#007AFF',
            '--amll-font-size': 
              settings.fontSize === 'small' ? '2.0rem' :
              settings.fontSize === 'large' ? '4.0rem' : '3.0rem',
            '--amll-font-weight': 'bold',
            '--amll-text-align': settings.lyricposition === 'left' ? 'left' : 
                                settings.lyricposition === 'right' ? 'right' : 'center',
            width: '100%',
            height: '100%',
            fontSize: settings.fontSize === 'small' ? '2.0rem' :
                      settings.fontSize === 'large' ? '4.0rem' : '3.0rem',
            fontWeight: 'bold',
            textAlign: settings.lyricposition === 'left' ? 'left' : 
                      settings.lyricposition === 'right' ? 'right' : 'center',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

export default AMLLLyrics;
