'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import LineBreaker from '@/components/linebreak';
import { TTMLLine, PlayerLyricsProps, TTMLData, WordTimingKaraokeLyricLineProps, KaraokeLyricLineProps, BackgroundWordTimingLyricLineProps } from '@/types';

// カラオケ風歌詞表示用
const KaraokeLyricLine: React.FC<KaraokeLyricLineProps> = ({
  text,
  progressPercentage,
  resolvedTheme,
  isActive,
  progressDirection,
}) => {
  const isDark = resolvedTheme === 'dark';
  const activeColor = isDark ? '#FFFFFF' : '#000000';
  const inactiveColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)';
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    let animationFrameId: number | null = null;
    let timerId: NodeJS.Timeout | null = null;

    if (progressDirection === 'ttb' || progressDirection === 'btt') {
      animationFrameId = requestAnimationFrame(() => setShouldAnimate(true));
    } else {
      timerId = setTimeout(() => setShouldAnimate(true), 50);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (timerId) clearTimeout(timerId);
    };
  }, [isActive, progressDirection]);

  if (progressDirection === 'ttb' || progressDirection === 'btt') {
    const getClipPath = (): string => {
      switch (progressDirection) {
        case 'btt':
          return `inset(${100 - progressPercentage}% 0 0 0)`;
        case 'ttb':
          return `inset(0 0 ${100 - progressPercentage}% 0)`;
        default:
          return `inset(0 0 ${100 - progressPercentage}% 0)`;
      }
    };

    return (
      <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'pre-wrap' }}>
        <span style={{ color: inactiveColor, pointerEvents: 'none' }}>
          <LineBreaker text={text} />
        </span>
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            color: activeColor,
            clipPath: getClipPath(),
            transition: shouldAnimate ? 'clip-path 0.1s linear' : 'none',
            whiteSpace: 'pre-wrap',
            pointerEvents: 'none',
          }}
        >
          <LineBreaker text={text} />
        </span>
      </span>
    );
  }

  const getGradient = (): string => {
    switch (progressDirection) {
      case 'rtl':
        return `linear-gradient(to left, ${activeColor}, ${activeColor} 50%, ${inactiveColor} 50%, ${inactiveColor})`;
      case 'ltr':
      default:
        return `linear-gradient(to right, ${activeColor}, ${activeColor} 50%, ${inactiveColor} 50%, ${inactiveColor})`;
    }
  };

  const getBackgroundSize = (): string => '200% 100%';

  const getBackgroundPosition = (): string => {
    const progress = progressPercentage / 100;
    switch (progressDirection) {
      case 'rtl':
        return `${progress * 100}% 0`;
      case 'ltr':
      default:
        return `${(1 - progress) * 100}% 0`;
    }
  };

  return (
    <span
      style={{
        display: 'inline',
        whiteSpace: 'pre-wrap',
        color: 'transparent',
        backgroundImage: getGradient(),
        backgroundSize: getBackgroundSize(),
        backgroundPosition: getBackgroundPosition(),
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        transition: shouldAnimate ? 'background-position 0.1s linear' : 'none',
        pointerEvents: 'none'
      }}
    >
      <LineBreaker text={text} />
    </span>
  );
};

const WordTimingKaraokeLyricLine: React.FC<WordTimingKaraokeLyricLineProps> = ({
  line,
  currentTime,
  resolvedTheme,
  progressDirection,
  isActive,
  isPast = false,
}) => {
  const isDark = resolvedTheme === 'dark';
  const activeColor = isDark ? '#FFFFFF' : '#000000';
  const inactiveColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)';
  const [animationEnabled, setAnimationEnabled] = useState(false);
  const [delayedIndex, setDelayedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setAnimationEnabled(true);
    });
    
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  const currentActiveWordIndex = isActive ? line.words?.findIndex(word => 
    currentTime >= word.begin && currentTime < word.end
  ) ?? -1 : -1;

  useEffect(() => {
    if (!isActive || !line.words || line.words.length === 0 || currentActiveWordIndex < 0) return;
    
    const timerId = setTimeout(() => {
      setDelayedIndex(currentActiveWordIndex);
    }, 100);
    
    return () => clearTimeout(timerId);
  }, [currentActiveWordIndex, line.words, isActive]);

  if (!line.words || line.words.length === 0) {
    return <span style={{ color: isActive ? activeColor : isPast ? activeColor : inactiveColor }}>{line.text}</span>;
  }
  
  // 単語ごとにハイライトする表示を作成
  const textWithSpans = () => {
    const wordPositions: {start: number, end: number, word: typeof line.words[0]}[] = [];
    let currentPosition = 0;
    
    if (line.words) {
      line.words.forEach(word => {
        const wordIndex = line.text?.indexOf(word.text, currentPosition) ?? -1;
        if (wordIndex !== -1) {
          wordPositions.push({
            start: wordIndex,
            end: wordIndex + word.text.length,
            word
          });
          currentPosition = wordIndex + word.text.length;
        }
      });
    }
    
    // テキストを分割
    const spans: JSX.Element[] = [];
    let lastEnd = 0;
    
    wordPositions.forEach(({start, end, word}, index) => {
      if (start > lastEnd) {
        spans.push(
          <span key={`space-${lastEnd}-${start}`} style={{ color: isPast ? activeColor : inactiveColor, whiteSpace: 'pre-wrap' }}>
            {line.text?.substring(lastEnd, start)}
          </span>
        );
      }
      
      // 単語を追加
      const wordIsCompleted = isActive && currentTime >= word.end;
      const wordIsActive = isActive && currentTime >= word.begin && currentTime < word.end;
      const shouldAnimate = wordIsCompleted || (wordIsActive && (index === delayedIndex));
      
      if (progressDirection === 'ltr' || progressDirection === 'rtl') {
        const isLTR = progressDirection === 'ltr';
        let wordProgress = 0;
        if (wordIsActive) {
          const wordDuration = word.end - word.begin;
          wordProgress = (currentTime - word.begin) / wordDuration;
          wordProgress = Math.max(0, Math.min(1, wordProgress));
        } else if (wordIsCompleted || isPast) {
          wordProgress = 1;
        }
        
        const backgroundSize = '200% 100%';
        const position = isLTR ? (1 - wordProgress) * 100 : wordProgress * 100;
        const finalPosition = isPast 
          ? (isLTR ? '0% 0' : '100% 0') 
          : (isActive ? `${position}% 0` : (isLTR ? '100% 0' : '0% 0'));
        
        const bgImage = wordIsActive || wordIsCompleted || isPast
          ? `linear-gradient(to ${isLTR ? 'right' : 'left'}, ${activeColor}, ${activeColor} 47%, ${inactiveColor} 53%, ${inactiveColor})`
          : 'none';
        
        spans.push(
          <span
            key={`word-${index}-${word.begin}-${word.end}`}
            style={{
              display: 'inline-block',
              color: (!wordIsActive && !wordIsCompleted && !isPast) ? inactiveColor : 'transparent',
              backgroundImage: bgImage,
              backgroundSize: backgroundSize,
              backgroundPosition: finalPosition,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              transform: shouldAnimate && isActive ? 'translateY(-3px)' : 'translateY(0px)',
              transition: animationEnabled ? 'background-position 0.1s linear, transform 1.5s ease' : 'transform 1s ease',
              whiteSpace: 'pre-wrap'
            }}
          >
            {word.text}
          </span>
        );
      } else {
        // btt/ttb
        spans.push(
          <span
            key={`word-${index}-${word.begin}-${word.end}`}
            style={{
              display: 'inline-block',
              position: 'relative',
              transform: shouldAnimate && isActive ? 'translateY(-3px)' : 'translateY(0px)',
              transition: 'transform 1.5s ease',
              color: isPast ? activeColor : inactiveColor,
              whiteSpace: 'pre-wrap'
            }}
          >
            {word.text}
            {(wordIsActive || wordIsCompleted || isPast) && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  color: activeColor,
                  clipPath: isPast ? 'none' : (
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
        );
      }
      
      lastEnd = end;
    });
    
    if (lastEnd < (line.text?.length ?? 0)) {
      spans.push(
        <span key={`space-${lastEnd}-end`} style={{ color: isPast ? activeColor : inactiveColor, whiteSpace: 'pre-wrap' }}>
          {line.text?.substring(lastEnd)}
        </span>
      );
    }
    
    return spans;
  };
  
  return (
    <span ref={containerRef} style={{ display: 'inline-block', whiteSpace: 'pre-wrap' }}>
      {textWithSpans()}
    </span>
  );
};

const BackgroundWordTimingLyricLine: React.FC<BackgroundWordTimingLyricLineProps> = ({
  backgroundWords,
  currentTime,
  resolvedTheme,
  progressDirection,
  fontSize,
}) => {
  const isDark = resolvedTheme === 'dark';
  const activeColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
  const inactiveColor = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
  const [animationEnabled, setAnimationEnabled] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

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
  
  // 単語の表示処理
  const renderWords = () => {
    if (!backgroundWords || backgroundWords.length === 0) return null;
    
    return backgroundWords.map((word, index) => {
      const wordIsCompleted = currentTime >= word.end;
      const wordIsActive = currentTime >= word.begin && currentTime < word.end;
      
      // btt/ttb
      if (progressDirection === 'btt' || progressDirection === 'ttb') {
        return (
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
              fontWeight: 'normal'
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
        
        // 未到達の単語にはグラデーションを適用しない
        const bgImage = wordIsActive || wordIsCompleted
          ? `linear-gradient(to ${isLTR ? 'right' : 'left'}, ${activeColor}, ${activeColor} 48%, ${inactiveColor} 52%, ${inactiveColor})`
          : 'none';
        
        return (
          <span
            key={`bg-word-${index}-${word.begin}-${word.end}`}
            style={{
              display: 'inline-block',
              color: (!wordIsActive && !wordIsCompleted) ? inactiveColor : 'transparent',
              backgroundImage: bgImage,
              backgroundSize: backgroundSize,
              backgroundPosition: finalPosition,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              transform: wordIsActive || wordIsCompleted ? 'translateY(-3px)' : 'translateY(0px)',
              transition: animationEnabled ? 'background-position 0.1s linear, transform 1.5s ease' : 'transform 0.5s ease',
              whiteSpace: 'pre-wrap',
              fontSize: bgfontSizeValue,
              fontWeight: 'bold'
            }}
          >
            {word.text}
          </span>
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

export const TTMLLyrics: React.FC<PlayerLyricsProps> = ({
  ttmlData,
  currentTime,
  isMobile,
  settings,
  onLyricClick,
  smoothScrollTo,
  renderInterludeDots,
  resolvedTheme,
}) => {
  const [isLyricsHovered, setIsLyricsHovered] = useState<boolean>(false);
  const [currentLines, setCurrentLines] = useState<TTMLLine[]>([]);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState<boolean>(true);
  const scrollDisableTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticScrollingRef = useRef<boolean>(false);
  const lastUserScrollTimeRef = useRef<number>(0);
  const lastScrolledLineRef = useRef<TTMLLine | null>(null);
  const lastScrolledActiveLineRef = useRef<TTMLLine | null>(null);
  const [currentGroup, setCurrentGroup] = useState<TTMLLine[]>([]);
  const [groupEnd, setGroupEnd] = useState<number | null>(null);
  const [groupIndex, setGroupIndex] = useState<number>(-1);
  const [interludePeriods, setInterludePeriods] = useState<{start: number, end: number, divIndex: number}[]>([]);
  const [activeInterlude, setActiveInterlude] = useState<{start: number, end: number, divIndex: number} | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [hasWordTiming, setHasWordTiming] = useState<boolean>(false);
  const backgroundRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [backgroundHeights, setBackgroundHeights] = useState<Map<string, number>>(new Map());

  const allLyricLines: TTMLLine[] = useMemo(() => {
    if (!ttmlData) return [];
    const lines: TTMLLine[] = [];
    ttmlData.divs.forEach(div => {
      div.lines.forEach(line => {
        lines.push(line);
      });
    });
    lines.sort((a, b) => a.begin - b.begin);
    
    const processedLines = lines.map(line => ({ ...line, originalEnd: line.end }));
    
    for (let i = 0; i < processedLines.length; i++) {
      const currentLine = processedLines[i];
      if (currentLine.groupEnd !== undefined) continue;
      
      const overlappingLines = [currentLine];
      for (let j = i + 1; j < processedLines.length && overlappingLines.length < 3; j++) {
        const otherLine = processedLines[j];
        if (otherLine.groupEnd !== undefined) continue;
        
        const overlap = Math.max(0, Math.min(currentLine.end, otherLine.end) - Math.max(currentLine.begin, otherLine.begin));
        if (overlap > 0) {
          overlappingLines.push(otherLine);
        }
      }
      
      const maxEnd = Math.max(...overlappingLines.map(line => line.originalEnd || line.end));
      
      overlappingLines.forEach(line => {
        line.groupEnd = maxEnd;
      });
    }
    
    return processedLines;
  }, [ttmlData]);

  useEffect(() => {
    if (!ttmlData) return;
    
    // 単語ごとの同期か
    const hasTiming = ttmlData.timing === 'Word';
    
    // 行ごとの同期か
    const hasWords = allLyricLines.some(line => 
      line.words && line.words.length > 0
    );
    
    setHasWordTiming(hasTiming || hasWords);
  }, [ttmlData, allLyricLines]);

  // 間奏を検出
  useEffect(() => {
    if (!ttmlData) return;
    
    const interludes: {start: number, end: number, divIndex: number}[] = [];
    
    for (let i = 0; i < ttmlData.divs.length - 1; i++) {
      const currentDiv = ttmlData.divs[i];
      const nextDiv = ttmlData.divs[i + 1];
      
      const gapDuration = nextDiv.begin - currentDiv.end;
      
      if (gapDuration >= 5) {
        interludes.push({
          start: currentDiv.end,
          end: nextDiv.begin,
          divIndex: i
        });
      }
    }
    
    setInterludePeriods(interludes);
  }, [ttmlData]);

  // アクティブな間奏を監視
  useEffect(() => {
    if (interludePeriods.length === 0) return;
    
    const now = currentTime + (settings.lyricOffset || 0);
    
    // アクティブな間奏を探す
    const active = interludePeriods.find(
      interlude => now >= interlude.start && now < interlude.end
    );
    
    setActiveInterlude(active || null);
  }, [currentTime, interludePeriods, settings.lyricOffset]);

  // agentが設定されているか
  const hasAgents = useMemo(() => {
    if (!ttmlData) return false;
    const agentIdsInLyrics = allLyricLines.map(line => line.agent).filter(Boolean) as string[];
    
    // エージェントリストが空で行にエージェントIDがある場合は自動生成
    if (ttmlData.agents.length === 0 && agentIdsInLyrics.length > 0) {
      const uniqueAgentIds = [...new Set(agentIdsInLyrics)];
      const generatedAgents = uniqueAgentIds.map(id => ({
        id,
        name: `Singer ${id}`,
        type: /^v\d+$/.test(id) && parseInt(id.slice(1), 10) < 1000 ? 'person' : 'group'
      }));
      
      interface ExtendedTTMLData extends TTMLData {
        _generatedAgents?: typeof generatedAgents;
      }
      
      const extendedData = ttmlData as ExtendedTTMLData;
      extendedData._generatedAgents = generatedAgents;
      Object.assign(ttmlData, { agents: generatedAgents });
    }
    
    // エージェントの条件確認
    const hasMultipleAgents = ttmlData.agents && ttmlData.agents.length > 1;
    const hasAgentLines = agentIdsInLyrics.length > 0;
    
    // エージェントIDが実際に存在するか
    const validAgentIds = new Set(ttmlData.agents.map(a => a.id));
    const allAgentIdsValid = agentIdsInLyrics.every(id => validAgentIds.has(id));
    
    return (hasMultipleAgents || hasAgentLines) && allAgentIdsValid;
  }, [ttmlData, allLyricLines]);

  const divLastLineIndices = useMemo(() => {
    if (!ttmlData) return [];
    
    const indices: number[] = [];
    let lineCount = 0;
    
    ttmlData.divs.forEach((div) => {
      lineCount += div.lines.length;
      indices.push(lineCount - 1);
    });
    
    return indices;
  }, [ttmlData]);

  const getActiveGroup = useCallback((time: number): { group: TTMLLine[], end: number, index: number } => {
    const active: TTMLLine[] = allLyricLines.filter(line => 
      time >= line.begin && time < (line.groupEnd || line.end)
    );
    if (active.length === 0) return { group: [], end: 0, index: -1 };
    const maxEnd = Math.max(...active.map(l => l.groupEnd || l.end));
    const firstIdx = allLyricLines.findIndex(l => l === active[0]);
    return { group: active, end: maxEnd, index: firstIdx };
  }, [allLyricLines]);

  useEffect(() => {
    if (!ttmlData) return;
    
    const adjustedTime = currentTime + (settings.lyricOffset || 0);
    const { group, end, index } = getActiveGroup(adjustedTime);
    const isNewGroup = group.length !== currentGroup.length || 
      group.some((line, i) => !currentGroup[i] || 
      line.begin !== currentGroup[i].begin || 
      line.text !== currentGroup[i].text);
    
    if (isNewGroup) {
      setCurrentGroup(group);
      setGroupEnd(group.length > 0 ? end : null);
      setGroupIndex(index);
      
      const groupWithUnifiedEnd = group.map(line => ({ 
        ...line, 
        end: end, 
        originalEnd: line.originalEnd || line.end 
      }));
      setCurrentLines(groupWithUnifiedEnd);
    }
  }, [currentTime, ttmlData, settings.lyricOffset, getActiveGroup, currentGroup, allLyricLines]);

  useEffect(() => {
    if (!ttmlData) return;
    if (!lyricsContainerRef.current) return;
    if (currentGroup.length === 0 || groupEnd == null) return;
    if (!isAutoScrollEnabled) return;
    if (isProgrammaticScrollingRef.current) return;
    
    const adjustedTime = currentTime + (settings.lyricOffset || 0);
    

    if (adjustedTime >= groupEnd - 0.2 || adjustedTime >= groupEnd) {
      let nextIdx = groupIndex + currentGroup.length;
      while (nextIdx < allLyricLines.length) {
        const nextLine = allLyricLines[nextIdx];
        if (adjustedTime < nextLine.end) break;
        nextIdx++;
      }
      
      // 次の行が間奏か
      const currentDivIndex = divLastLineIndices.findIndex(lastIdx => lastIdx >= groupIndex + currentGroup.length - 1);
      const interludePeriod = interludePeriods.find(ip => ip.divIndex === currentDivIndex);
      
      if (interludePeriod && (adjustedTime >= interludePeriod.start - 0.2 || adjustedTime >= interludePeriod.start) && adjustedTime < interludePeriod.end) {
        // 間奏にスクロール
        const interludeElement = document.getElementById(`interlude-${interludePeriod.start}-${interludePeriod.end}`);
        if (interludeElement) {
          const container = lyricsContainerRef.current;
          const containerHeight = container.clientHeight;
          const contentHeight = container.scrollHeight;
          const interludeOffsetTop = interludeElement.offsetTop;
          const interludeHeight = interludeElement.clientHeight;
          
          // スクロール位置を計算
          const offsetPercentage = settings.scrollPositionOffset !== undefined ? settings.scrollPositionOffset / 100 : 0.5;
          let targetScrollTop = 0;
          if (isMobile) {
            const displayHeight = window.innerHeight;
            const offsetFromTop = displayHeight * offsetPercentage;
            targetScrollTop = interludeOffsetTop - offsetFromTop + interludeHeight / 2;
          } else {
            const scrollOffset = (1 - offsetPercentage) * containerHeight;
            targetScrollTop = interludeOffsetTop - containerHeight / 2 + interludeHeight / 2 + scrollOffset - containerHeight / 2;
          }
          targetScrollTop = Math.max(0, Math.min(targetScrollTop, contentHeight - containerHeight));
          
          const currentScrollTop = container.scrollTop;
          if (Math.abs(targetScrollTop - currentScrollTop) < 10) {
            return;
          }
          
          isProgrammaticScrollingRef.current = true;
          
          const interludeDuration = interludePeriod.end - interludePeriod.start;
          const scrollDuration = interludeDuration < 0.2 ? 150 : interludeDuration < 0.3 ? 200 : interludeDuration < 0.4 ? 250 : interludeDuration < 0.5 ? 300 : interludeDuration < 0.6 ? 350 : interludeDuration < 0.7 ? 400 : interludeDuration < 0.8 ? 450 : interludeDuration < 0.9 ? 500 : interludeDuration < 1 ? 600 : 1000;
          
          (smoothScrollTo as (element: HTMLElement, to: number, duration: number) => Promise<void>)(container, targetScrollTop, scrollDuration)
            .finally(() => {
              setTimeout(() => {
                isProgrammaticScrollingRef.current = false;
              }, 50);
            });
          return;
        }
      }
    }
  }, [currentTime, groupEnd, currentGroup, groupIndex, allLyricLines, isMobile, settings.scrollPositionOffset, smoothScrollTo, ttmlData, settings.lyricOffset, isAutoScrollEnabled, divLastLineIndices, interludePeriods]);

  useEffect(() => {
    const container = lyricsContainerRef.current;
    if (!container) return;

    const handleUserScroll = () => {
      if (isProgrammaticScrollingRef.current) return;
      
      const now = Date.now();
      if (now - lastUserScrollTimeRef.current > 150) {
        lastUserScrollTimeRef.current = now;
        
        if (scrollDisableTimerRef.current) {
          clearTimeout(scrollDisableTimerRef.current);
        }
        setIsAutoScrollEnabled(false);

        scrollDisableTimerRef.current = setTimeout(() => {
          setIsAutoScrollEnabled(true);
        }, 2000);
      }
    };

    container.addEventListener('wheel', handleUserScroll, { passive: true });
    container.addEventListener('touchmove', handleUserScroll, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleUserScroll);
      container.removeEventListener('touchmove', handleUserScroll);
    };
  }, []);

  // 自動スクロール
  useEffect(() => {
    if (!ttmlData) return;
    if (!lyricsContainerRef.current) return;
    if (!isAutoScrollEnabled) return;
    if (isProgrammaticScrollingRef.current) return;
    
    const container = lyricsContainerRef.current;
    const adjustedTime = currentTime + (settings.lyricOffset || 0);
    
    // アクティブな歌詞を探す
    let targetLine: TTMLLine | null = null;
    let isActiveTarget = false;
    for (let i = 0; i < allLyricLines.length; i++) {
      const line = allLyricLines[i];
      const lineEnd = line.groupEnd || line.end;
      
      if (adjustedTime >= line.begin && adjustedTime < lineEnd) {
        targetLine = line;
        isActiveTarget = true;
        break;
      }
      
      if (i < allLyricLines.length - 1) {
        const nextLine = allLyricLines[i + 1];
        if (adjustedTime >= lineEnd && adjustedTime < nextLine.begin) {
          const gap = nextLine.begin - lineEnd;
          if (gap < 1.0 || (adjustedTime - lineEnd) / gap > 0.3) {
            targetLine = nextLine;
            isActiveTarget = false;
            break;
          }
        }
      }
    }
    
    if (!targetLine) return;
    
    if (isActiveTarget) {
      const isSameActiveLine = lastScrolledActiveLineRef.current && lastScrolledActiveLineRef.current.begin === targetLine.begin && lastScrolledActiveLineRef.current.text === targetLine.text;
      
      if (isSameActiveLine) return;
      
      lastScrolledActiveLineRef.current = targetLine;
    }
    
    const now = Date.now();
    const timeSinceLastScroll = now - lastUserScrollTimeRef.current;
    
    const isSameLine = lastScrolledLineRef.current && lastScrolledLineRef.current.begin === targetLine.begin && lastScrolledLineRef.current.text === targetLine.text;
    
    if (isSameLine && timeSinceLastScroll < 100) return;
    
    if (targetLine.backgroundText && isActiveTarget) {
      if (isSameLine && timeSinceLastScroll < 1500) {
        return;
      }
    }
    
    const lineElement = document.getElementById(`ttml-line-${targetLine.begin}-${targetLine.end}`);
    if (!lineElement) return;
    
    let backgroundHeightAdjustment = 0;
    if (targetLine.backgroundText) {
      const backgroundKey = `${targetLine.begin}-${targetLine.end}-bg`;
      const measuredBackgroundHeight = backgroundHeights.get(backgroundKey) || 0;
      
      if (measuredBackgroundHeight > 0) {
        if (targetLine.backgroundPosition === 'above') {
          // バックグラウンドボーカル上部
          const marginAdjustment = -100;
          backgroundHeightAdjustment = -(measuredBackgroundHeight + marginAdjustment);
        } else {
          // バックグラウンドボーカル下部
          const marginAdjustment = 5;
          backgroundHeightAdjustment = measuredBackgroundHeight + marginAdjustment;
        }
      }
    }
    
    // スクロール位置計算
    const containerHeight = container.clientHeight;
    const contentHeight = container.scrollHeight;
    const lyricOffsetTop = lineElement.offsetTop;
    const lyricHeight = lineElement.clientHeight;
    const offsetPercentage = settings.scrollPositionOffset !== undefined ? settings.scrollPositionOffset / 100 : 0.5;
    
    let targetScrollTop = 0;
    if (isMobile) {
      const displayHeight = window.innerHeight;
      const offsetFromTop = displayHeight * offsetPercentage;
      targetScrollTop = lyricOffsetTop - offsetFromTop + lyricHeight / 2 + backgroundHeightAdjustment;
    } else {
      const scrollOffset = (1 - offsetPercentage) * containerHeight;
      targetScrollTop = lyricOffsetTop - containerHeight / 2 + lyricHeight / 2 + scrollOffset - containerHeight / 2 + backgroundHeightAdjustment;
    }
    
    targetScrollTop = Math.max(0, Math.min(targetScrollTop, contentHeight - containerHeight));
    
    const currentScrollTop = container.scrollTop;
    if (Math.abs(targetScrollTop - currentScrollTop) < 5) {
      lastScrolledLineRef.current = targetLine;
      return;
    }
    
    let nextTimeDiff = 1.0;
    const currentLineIdx = allLyricLines.findIndex(line => 
      line.begin === targetLine.begin && line.text === targetLine.text
    );
    
    if (currentLineIdx >= 0) {
      for (let i = currentLineIdx + 1; i < allLyricLines.length; i++) {
        const nextLine = allLyricLines[i];
        const isInCurrentGroup = currentGroup.some(groupLine => 
          groupLine.begin === nextLine.begin && groupLine.text === nextLine.text
        );
        
        if (!isInCurrentGroup) {
          nextTimeDiff = nextLine.begin - targetLine.begin;
          break;
        }
      }
    }
    
    const scrollDuration = nextTimeDiff < 0.2 ? 150 : nextTimeDiff < 0.3 ? 200 : nextTimeDiff < 0.4 ? 250 : nextTimeDiff < 0.5 ? 300 : nextTimeDiff < 0.6 ? 350 : nextTimeDiff < 0.7 ? 400 : nextTimeDiff < 0.8 ? 450 : nextTimeDiff < 0.9 ? 500 : nextTimeDiff < 1 ? 600 : 1000;
    
    isProgrammaticScrollingRef.current = true;
    lastScrolledLineRef.current = targetLine;
    lastUserScrollTimeRef.current = now;
    
    (smoothScrollTo as (element: HTMLElement, to: number, duration: number) => Promise<void>)(container, targetScrollTop, scrollDuration)
      .finally(() => {
        setTimeout(() => {
          isProgrammaticScrollingRef.current = false;
        }, 50);
      });
  }, [allLyricLines, currentGroup, currentTime, settings.lyricOffset, isAutoScrollEnabled, settings.scrollPositionOffset, isMobile, smoothScrollTo, ttmlData, backgroundHeights]);

  useEffect(() => {
    if (currentGroup.length === 0 || groupEnd === null) {
      setProgressPercentage(0);
      return;
    }
    
    const currentFirstLine = currentGroup[0];
    const adjustedTime = currentTime + (settings.lyricOffset || 0);
    
    if (adjustedTime >= currentFirstLine.begin && adjustedTime < groupEnd) {
      const timeDiff = groupEnd - currentFirstLine.begin;
      if (timeDiff <= 0) {
        setProgressPercentage(adjustedTime >= currentFirstLine.begin ? 100 : 0);
        return;
      }
      
      const elapsed = adjustedTime - currentFirstLine.begin;
      const progress = Math.min(Math.max(elapsed / timeDiff, 0), 1) * 100;
      
      setProgressPercentage(progress);
    } else {
      setProgressPercentage(0);
    }
  }, [currentTime, currentGroup, groupEnd, settings.lyricOffset]);

  // バックグラウンドボーカルの高さを測定
  useEffect(() => {
    const measureBackgroundHeights = () => {
      const newHeights = new Map<string, number>();
      allLyricLines.forEach(line => {
        if (line.backgroundText) {
          const key = `${line.begin}-${line.end}-bg`;
          const element = backgroundRefs.current.get(key);
          if (element) {
            newHeights.set(key, element.scrollHeight);
          }
        }
      });
      setBackgroundHeights(newHeights);
    };

    measureBackgroundHeights();
    const timer = setTimeout(measureBackgroundHeights, 100);
    
    return () => clearTimeout(timer);
  }, [allLyricLines, settings.fontSize]);

  const handleLyricsMouseEnter = () => {
    setIsLyricsHovered(true);
  };

  const handleLyricsMouseLeave = () => {
    setIsLyricsHovered(false);
  };

  if (!ttmlData) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 flex flex-col justify-center z-50 
        ${hasAgents ? 'items-center text-center' : 
          settings.lyricposition === 'center' ? 'items-center text-center' : 
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
          ${isMobile ? 'px-5 w-full' : 'px-20 w-full'}
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
        }}
        ref={lyricsContainerRef}
        onMouseEnter={handleLyricsMouseEnter}
        onMouseLeave={handleLyricsMouseLeave}
      >
        <div className="relative">
          <div style={{ height: window.innerHeight }}></div>
          {allLyricLines.map((line, index) => {
            const activeLine = currentLines.find(l => l.begin === line.begin && l.text === line.text) as (TTMLLine & { originalEnd?: number }) | undefined;
            const isActive = !!activeLine;
            const now = currentTime + (settings.lyricOffset || 0);
            
            // グループ内の歌詞かどうかをチェック
            const isInCurrentGroup = currentGroup.some(groupLine => 
              groupLine.begin === line.begin && groupLine.text === line.text
            );
            
            const isGroupActive = currentGroup.length > 0 && groupEnd !== null && now >= currentGroup[0].begin && now < groupEnd;
            const lineEnd = line.groupEnd || line.originalEnd || line.end;
            const isPast = isGroupActive && isInCurrentGroup ? false : lineEnd < now;
            const isDisplaying = isActive || (isGroupActive && isInCurrentGroup);
            const isEmpty = !line.text || line.text.trim() === '';
            const agent = line.agent ? ttmlData.agents.find(a => a.id === line.agent) : null;
            
            let textColor = '';
            if (isDisplaying) {
              textColor = 'text-primary font-bold';
            } else if (isPast) {
              textColor = 'text-black text-opacity-50 dark:text-white dark:text-opacity-40';
            } else {
              textColor = 'text-black text-opacity-50 dark:text-white dark:text-opacity-40';
            }
            
            const opacity = isLyricsHovered ? 1 : isDisplaying ? 1 : isPast ? 0 : 1;
            let textAlignment: 'left' | 'center' | 'right' | 'justify' = 'center';
            if (hasAgents) {
              if (agent) {
                const agentId = agent.id;
                const allAgentIds = allLyricLines
                  .filter(l => !!l.agent)
                  .map(l => l.agent as string);
                const firstAgentId = allAgentIds.length > 0 ? allAgentIds[0] : '';
                
                if (agent.type === 'person') {
                  textAlignment = agentId === firstAgentId ? 'left' : 'right';
                } else if (agent.type === 'group') {
                  const numericMatches = agentId.match(/\d+/);
                  if (numericMatches && numericMatches[0]) {
                    const firstDigit = parseInt(numericMatches[0][0], 10);
                    textAlignment = firstDigit % 2 === 1 ? 'left' : 'right';
                  } else {
                    const asciiValue = agentId.charCodeAt(0);
                    textAlignment = asciiValue % 2 === 1 ? 'left' : 'right';
                  }
                } else {
                  const asciiValue = agentId.charCodeAt(0);
                  textAlignment = asciiValue % 2 === 0 ? 'left' : 'right';
                }
              } else {
                textAlignment = settings.lyricposition;
              }
            } else {
              textAlignment = settings.lyricposition;
            }
            
            // 間奏か
            const isDivEnd = divLastLineIndices.includes(index);
            const interludePeriod = isDivEnd ? 
              interludePeriods.find(ip => ip.divIndex === divLastLineIndices.indexOf(index)) : 
              null;
            
            const shouldRenderInterlude = isDivEnd && interludePeriod !== undefined;
            const lineDivIndex = (() => {
              for (let i = 0; i < divLastLineIndices.length; i++) {
                if (index <= divLastLineIndices[i]) {
                  return i;
                }
              }
              return 0;
            })();
            
            const isAfterInterludeDiv = activeInterlude !== null && 
              lineDivIndex > activeInterlude.divIndex;
            
            return (
              <React.Fragment key={`line-group-${line.begin}-${line.end}-${index}`}>
                <div
                  key={`${line.begin}-${line.end}-${index}`}
                  id={`ttml-line-${line.begin}-${line.end}`}
                  className={`transition-all duration-700 px-2 rounded-lg :hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer relative
                    ${isEmpty ? 'm-0 p-0' : 'my-8'} ${textColor}`}
                  style={{
                    opacity,
                    fontSize: {
                      small: '2.0rem',
                      medium: '3.0rem',
                      large: '4.0rem',
                    }[settings.fontSize],
                    fontWeight: 'bold',
                    textAlign: textAlignment,
                    transform: isAfterInterludeDiv
                      ? `${settings.fontSize === 'small' ? 'translateY(55px)'
                        : settings.fontSize === 'medium' ? 'translateY(70px)'
                        : 'translateY(80px)'}`
                      : 'translateY(0)',
                    transition: `transform ${(() => {
                      let nextTimeDiff = 1.0;
                      const currentLineIdx = allLyricLines.findIndex(l => l.begin === line.begin && l.text === line.text);
                      if (currentLineIdx >= 0 && currentLineIdx + 1 < allLyricLines.length) {
                        nextTimeDiff = allLyricLines[currentLineIdx + 1].begin - line.begin;
                      }
                      return nextTimeDiff < 0.2 ? '0.15s' : nextTimeDiff < 0.3 ? '0.2s' : nextTimeDiff < 0.4 ? '0.25s' : nextTimeDiff < 0.5 ? '0.3s' : nextTimeDiff < 0.6 ? '0.35s' : nextTimeDiff < 0.7 ? '0.4s' : nextTimeDiff < 0.8 ? '0.45s' : nextTimeDiff < 0.9 ? '0.5s' : nextTimeDiff < 1 ? '0.6' : '1s';
                    })()} ${settings.CustomEasing || 'cubic-bezier(0.19, 1, 0.22, 1)'}, opacity 0.8s, margin 1s, padding 1s, color 0.5s, background-color 0.5s`,
                    wordWrap: 'break-word',
                    wordBreak: 'break-word',
                  }}
                  onClick={() => { onLyricClick(line.begin); setIsAutoScrollEnabled(true); }}
                >
                  {!isEmpty && (
                    <div>
                      {line.backgroundText && (() => {
                        const backgroundStartTime = line.backgroundWords && line.backgroundWords.length > 0 
                          ? line.backgroundWords[0].begin 
                          : null;
                        const mainStartTime = line.words && line.words.length > 0 
                          ? line.words[0].begin 
                          : line.begin;
                        
                        const shouldShowAbove = backgroundStartTime !== null 
                          ? backgroundStartTime < mainStartTime
                          : line.backgroundPosition === 'above';
                        
                        if (!shouldShowAbove) return null;
                        
                        const backgroundKey = `${line.begin}-${line.end}-bg`;
                        const actualHeight = backgroundHeights.get(backgroundKey) || 0;
                        
                        return (
                          <div 
                            style={{
                              opacity: isDisplaying ? 1 : 0,
                              maxHeight: isDisplaying ? `${actualHeight > 0 ? actualHeight : 200}px` : '0px',
                              marginBottom: isDisplaying ? '10px' : '0px',
                              overflow: 'hidden',
                              filter: isDisplaying ? 'none' : 'blur(20px)',
                              transition: `${isDisplaying ? 'filter 0.4s ease-in-out' : 'filter 0.2s ease-in-out'}, opacity 0.2s ease-in-out, max-height 1s ${settings.CustomEasing || 'cubic-bezier(0.19, 1, 0.22, 1)'}, margin-bottom 1s ${settings.CustomEasing || 'cubic-bezier(0.19, 1, 0.22, 1)'}`,
                              pointerEvents: 'none',
                              textAlign: textAlignment
                            }}
                          >
                            <div 
                              ref={(el) => {
                                if (el) {
                                  backgroundRefs.current.set(backgroundKey, el);
                                }
                              }}
                            >
                              {line.backgroundWords && line.backgroundWords.length > 0 ? (
                                <BackgroundWordTimingLyricLine
                                  backgroundWords={line.backgroundWords}
                                  currentTime={currentTime + (settings.lyricOffset || 0)}
                                  resolvedTheme={resolvedTheme}
                                  progressDirection={settings.lyricProgressDirection}
                                  fontSize={settings.fontSize}
                                />
                              ) : (
                                <span style={{ 
                                  fontSize: {
                                    small: '1.2rem',
                                    medium: '1.5rem',
                                    large: '2.0rem',
                                  }[settings.fontSize],
                                  color: resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                                  fontWeight: 'normal',
                                  pointerEvents: 'none'
                                }}>
                                  <LineBreaker text={line.backgroundText} />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      {settings.useKaraokeLyric ? (
                        hasWordTiming && settings.useWordTiming && line.words && line.words.length > 0 ? (
                          <WordTimingKaraokeLyricLine
                            line={line}
                            currentTime={currentTime + (settings.lyricOffset || 0)}
                            resolvedTheme={resolvedTheme}
                            progressDirection={settings.lyricProgressDirection}
                            isActive={isDisplaying}
                            isPast={isPast}
                          />
                        ) : (
                          isDisplaying ? (
                            <KaraokeLyricLine
                              text={line.text || ''}
                              progressPercentage={progressPercentage}
                              resolvedTheme={resolvedTheme}
                              isActive={isDisplaying}
                              progressDirection={settings.lyricProgressDirection}
                            />
                          ) : (
                            <span style={{ pointerEvents: 'none' }}>
                              <LineBreaker text={line.text || ''} />
                            </span>
                          )
                        )
                      ) : (
                        <span style={{ pointerEvents: 'none' }}>
                          <LineBreaker text={line.text || ''} />
                        </span>
                      )}
                      {line.backgroundText && (() => {
                        const backgroundStartTime = line.backgroundWords && line.backgroundWords.length > 0 
                          ? line.backgroundWords[0].begin 
                          : null;
                        const mainStartTime = line.words && line.words.length > 0 
                          ? line.words[0].begin 
                          : line.begin;
                        
                        const shouldShowAbove = backgroundStartTime !== null 
                          ? backgroundStartTime < mainStartTime
                          : line.backgroundPosition === 'above';
                        
                        if (shouldShowAbove) return null;
                        
                        const backgroundKey = `${line.begin}-${line.end}-bg`;
                        const actualHeight = backgroundHeights.get(backgroundKey) || 0;
                        
                        return (
                          <div 
                            style={{
                              opacity: isDisplaying ? 1 : 0,
                              maxHeight: isDisplaying ? `${actualHeight > 0 ? actualHeight : 200}px` : '0px',
                              marginTop: isDisplaying ? '5px' : '0px',
                              overflow: 'hidden',
                              filter: isDisplaying ? 'none' : 'blur(20px)',
                              transition: `${isDisplaying ? 'filter 0.4s ease-in-out' : 'filter 0.2s ease-in-out'}, opacity 0.2s ease-in-out, max-height 1s ${settings.CustomEasing || 'cubic-bezier(0.19, 1, 0.22, 1)'}, margin-top 1s ${settings.CustomEasing || 'cubic-bezier(0.19, 1, 0.22, 1)'}`,
                              pointerEvents: 'none',
                              textAlign: textAlignment
                            }}
                          >
                            <div 
                              ref={(el) => {
                                if (el) {
                                  backgroundRefs.current.set(backgroundKey, el);
                                }
                              }}
                            >
                              {line.backgroundWords && line.backgroundWords.length > 0 ? (
                                <BackgroundWordTimingLyricLine
                                  backgroundWords={line.backgroundWords}
                                  currentTime={currentTime + (settings.lyricOffset || 0)}
                                  resolvedTheme={resolvedTheme}
                                  progressDirection={settings.lyricProgressDirection}
                                  fontSize={settings.fontSize}
                                />
                              ) : (
                                <span style={{ 
                                  fontSize: {
                                    small: '1.2rem',
                                    medium: '1.5rem',
                                    large: '2.0rem',
                                  }[settings.fontSize],
                                  color: resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                                  fontWeight: 'normal',
                                  pointerEvents: 'none'
                                }}>
                                  <LineBreaker text={line.backgroundText} />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {shouldRenderInterlude && interludePeriod && 
                  (currentTime + (settings.lyricOffset || 0) >= interludePeriod.start && 
                    currentTime + (settings.lyricOffset || 0) < interludePeriod.end && 
                    renderInterludeDots) ? 
                    (() => {
                      let nextPosition: 'left' | 'center' | 'right' = settings.lyricposition;
                      if (interludePeriod.divIndex + 1 < ttmlData.divs.length) {
                        const nextDiv = ttmlData.divs[interludePeriod.divIndex + 1];
                        if (nextDiv.lines.length > 0) {
                          const firstLineInNextDiv = nextDiv.lines[0];
                          // エージェント情報から位置を確認
                          if (hasAgents && firstLineInNextDiv.agent) {
                            const agent = ttmlData.agents.find(a => a.id === firstLineInNextDiv.agent);
                            if (agent) {
                              const agentId = agent.id;
                              const firstAgentId = allLyricLines.find(l => l.agent)?.agent || '';
                              
                              if (agent.type === 'person') {
                                nextPosition = agentId === firstAgentId ? 'left' : 'right';
                              } else if (agent.type === 'group') {
                                const numericMatches = agentId.match(/\d+/);
                                if (numericMatches && numericMatches[0]) {
                                  const firstDigit = parseInt(numericMatches[0][0], 10);
                                  nextPosition = firstDigit % 2 === 1 ? 'left' : 'right';
                                } else {
                                  const asciiValue = agentId.charCodeAt(0);
                                  nextPosition = asciiValue % 2 === 1 ? 'left' : 'right';
                                }
                              }
                            }
                          }
                        }
                      }
                      return (
                        <div id={`interlude-${interludePeriod.start}-${interludePeriod.end}`}>
                          {renderInterludeDots(interludePeriod.start, interludePeriod.end, nextPosition)}
                        </div>
                      );
                    })() 
                  : null
                }
              </React.Fragment>
            );
          })}
          <div style={{ height: window.innerHeight }}></div>
        </div>
      </div>
    </div>
  );
};

export default TTMLLyrics;
