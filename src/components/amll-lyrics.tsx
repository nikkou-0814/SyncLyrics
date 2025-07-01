'use client';

import React, { useEffect, useState } from 'react';
import { LyricPlayer } from '@applemusic-like-lyrics/react';
import type { LyricLineMouseEvent, LyricLine, LyricWord } from '@applemusic-like-lyrics/core';
import { AMLLLyricsProps } from '@/types';

const AMLLLyrics: React.FC<AMLLLyricsProps> = ({
  ttmlData,
  currentTime,
  settings,
  onLyricClick,
  isMobile,
  isPlaying,
  resolvedTheme,
}) => {
  const [lyricLines, setLyricLines] = useState<LyricLine[]>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  useEffect(() => {
    if (!ttmlData || !ttmlData.divs) return;

    try {
      const lines: LyricLine[] = [];
      let primaryAgent: string | undefined;
      if (ttmlData.agents && ttmlData.agents.length > 0) {
        primaryAgent = ttmlData.agents[0].id;
      } else {
        outerLoop: for (const div of ttmlData.divs) {
          for (const line of div.lines) {
            if (line.agent) {
              primaryAgent = line.agent;
              break outerLoop;
            }
          }
        }
      }
      
      for (const div of ttmlData.divs) {
        for (const line of div.lines) {
          const isDuetLine = !!(
            line.agent && 
            primaryAgent && 
            line.agent !== primaryAgent
          );

          // メイン歌詞行
          if (line.text && line.text.trim()) {
            const words: LyricWord[] = line.words ? line.words.map(word => ({
              startTime: Math.floor(word.begin * 1000),
              endTime: Math.floor(word.end * 1000),
              word: word.text,
            })) : [{
              startTime: Math.floor(line.begin * 1000),
              endTime: Math.floor(line.end * 1000),
              word: line.text,
            }];

            const hasMultipleAgents = ttmlData?.agents && ttmlData.agents.length > 1;
            const shouldBeDuet = isDuetLine || (!hasMultipleAgents && settings.lyricposition === 'right');

            const mainLine = {
              words,
              translatedLyric: '',
              romanLyric: '',
              startTime: Math.floor(line.begin * 1000),
              endTime: Math.floor(line.end * 1000),
              isBG: false,
              isDuet: shouldBeDuet,
            };

            lines.push(mainLine);

            if (line.backgroundWords && line.backgroundWords.length > 0) {
              const bgWords: LyricWord[] = line.backgroundWords.map(word => ({
                startTime: Math.floor(word.begin * 1000),
                endTime: Math.floor(word.end * 1000),
                word: word.text,
              }));

              const bgStartTime = Math.floor(line.begin * 1000);
              const bgEndTime = Math.floor(line.end * 1000);

              lines.push({
                words: bgWords,
                translatedLyric: '',
                romanLyric: '',
                startTime: bgStartTime,
                endTime: bgEndTime,
                isBG: true,
                isDuet: false,
              });
            } else if (line.backgroundText && line.backgroundText.trim()) {
              const bgStartTime = Math.floor(line.begin * 1000);
              const bgEndTime = Math.floor(line.end * 1000);

              lines.push({
                words: [{
                  startTime: bgStartTime,
                  endTime: bgEndTime,
                  word: line.backgroundText,
                }],
                translatedLyric: '',
                romanLyric: '',
                startTime: bgStartTime,
                endTime: bgEndTime,
                isBG: true,
                isDuet: false,
              });
            }
          }
        }
      }

      lines.sort((a, b) => a.startTime - b.startTime);
      setLyricLines(lines);
    } catch (error) {
      console.error('AMLL歌詞データの変換に失敗しました:', error);
      setLyricLines([]);
    }
  }, [ttmlData, settings.lyricposition]);

  useEffect(() => {
    const timeMs = Math.floor((currentTime + (settings.lyricOffset || 0)) * 1000);
    setCurrentTimeMs(timeMs);
  }, [currentTime, settings.lyricOffset]);

  const handleLyricLineClick = (event: LyricLineMouseEvent) => {
    let timeInSeconds: number | null = null;
    
    if (typeof event.lineIndex === 'number' && lyricLines[event.lineIndex]) {
      timeInSeconds = lyricLines[event.lineIndex].startTime / 1000;
    }
    
    if (timeInSeconds !== null && timeInSeconds >= 0) {
      onLyricClick(timeInSeconds);
    }
  };

  const springParams = settings.amllSpringParams || {
    mass: 1,
    tension: 300,
    friction: 30,
  };

  const getAlignPosition = () => {
    if (settings.scrollPositionOffset !== undefined) {
      return settings.scrollPositionOffset / 100;
    }
    
    return isMobile ? 0.3 : 0.5;
  };

  const getJustifyContent = () => {
    // エージェントが複数ある場合は左寄せ
    if (ttmlData?.agents && ttmlData.agents.length > 1) {
      return "flex-start";
    }
    
    // TTMLデータ内に実際に複数のエージェントが含まれているかチェック
    const uniqueAgents = new Set();
    ttmlData?.divs?.forEach(div => {
      div.lines.forEach(line => {
        if (line.agent) {
          uniqueAgents.add(line.agent);
        }
      });
    });
    
    if (uniqueAgents.size > 1) {
      return "flex-start";
    }
    
    switch (settings.lyricposition) {
      case 'left':
        return "flex-start";
      case 'right':
        return "flex-end";
      default:
        return "center";
    }
  };

  const getTextAlign = () => {
    // エージェントが複数ある場合は左寄せ
    if (ttmlData?.agents && ttmlData.agents.length > 1) {
      return "left";
    }
    
    const uniqueAgents = new Set();
    ttmlData?.divs?.forEach(div => {
      div.lines.forEach(line => {
        if (line.agent) {
          uniqueAgents.add(line.agent);
        }
      });
    });
    
    if (uniqueAgents.size > 1) {
      return "left";
    }
    
    switch (settings.lyricposition) {
      case 'left':
        return "left";
      case 'right':
        return "right";
      default:
        return "center";
    }
  };

  return (
    <div
      className={`amll-container
        ${settings.lyricposition === 'center' ? 'amll-center' : 
          settings.lyricposition === 'right' ? 'amll-right' : 'amll-left'}
      `}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: getJustifyContent(),
        height: settings.fullplayer ? '92vh' : '100vh',
        marginBottom: settings.fullplayer && settings.showplayercontrol ? '92px' : '0',
        fontSize: {
          small: '2.0rem',
          medium: '3.0rem', 
          large: '4.0rem',
        }[settings.fontSize],
        fontWeight: 'bold',
        padding: isMobile ? '' : '0 80px',
        color: 'var(--foreground)',
      }}
    >
      <div style={{ 
        width: '100%',
        height: '100%',
      }}>
        <LyricPlayer
          lyricLines={lyricLines}
          currentTime={currentTimeMs}
          disabled={!isPlaying}
          playing={isPlaying}
          alignAnchor="center"
          alignPosition={getAlignPosition()}
          enableSpring={settings.amllEnableSpring ?? true}
          enableBlur={settings.amllEnableBlur ?? true}
          enableScale={settings.amllEnableScale ?? true}
          hidePassedLines={settings.amllHidePassedLines ?? false}
          linePosXSpringParams={springParams}
          linePosYSpringParams={springParams}
          lineScaleSpringParams={springParams}
          onLyricLineClick={handleLyricLineClick}
          bottomLine={null}
          style={{
            width: '100%',
            height: '100%',
            textAlign: getTextAlign() as 'left' | 'center' | 'right',
            '--amll-lyric-view-color': resolvedTheme === 'dark' 
              ? 'rgba(255, 255, 255, 0.9)' 
              : 'rgba(0, 0, 0, 0.9)',
            '--amll-lyric-view-color-inactive': resolvedTheme === 'dark' 
              ? 'rgba(255, 255, 255, 0.4)' 
              : 'rgba(0, 0, 0, 0.5)',
            '--amll-lyric-view-color-bg': resolvedTheme === 'dark' 
              ? 'rgba(255, 255, 255, 0.3)' 
              : 'rgba(0, 0, 0, 0.3)',
            '--amll-lyric-view-color-duet': resolvedTheme === 'dark' 
              ? 'rgba(173, 216, 230, 0.9)' 
              : 'rgba(70, 130, 180, 0.9)',
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

export default AMLLLyrics;
