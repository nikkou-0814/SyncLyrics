'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import LineBreaker from '@/components/linebreak';
import BackgroundWordTimingLyricLine from '@/components/ttml/background';
import PronunciationKaraokeLyricLine from '@/components/ttml/pronunciation';
import TranslationWordTimingLyricLine from '@/components/ttml/translation';
import { TTMLLine, PlayerLyricsProps, TTMLData, WordTimingKaraokeLyricLineProps, KaraokeLyricLineProps } from '@/types';

// カラオケ風歌詞表示用
const KaraokeLyricLine: React.FC<KaraokeLyricLineProps> = ({
  text,
  progressPercentage,
  resolvedTheme,
  isActive,
  progressDirection,
  activeColor: activeColorProp,
  inactiveColor: inactiveColorProp,
}) => {
  const isDark = resolvedTheme === 'dark';
  const defaultActive = isDark ? '#FFFFFF' : '#000000';
  const defaultInactive = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)';
  const activeColor = activeColorProp ?? defaultActive;
  const inactiveColor = inactiveColorProp ?? defaultInactive;
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
    const clipPath =
      progressDirection === 'btt'
        ? `inset(${100 - progressPercentage}% 0 0 0)`
        : `inset(0 0 ${100 - progressPercentage}% 0)`;

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
            clipPath,
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

  const gradient =
    progressDirection === 'rtl'
      ? `linear-gradient(to left, ${activeColor}, ${activeColor} 50%, ${inactiveColor} 50%, ${inactiveColor})`
      : `linear-gradient(to right, ${activeColor}, ${activeColor} 50%, ${inactiveColor} 50%, ${inactiveColor})`;

  const backgroundPosition =
    progressDirection === 'rtl' ? `${progressPercentage}% 0` : `${100 - progressPercentage}% 0`;

  return (
    <span
      style={{
        display: 'inline',
        whiteSpace: 'pre-wrap',
        color: 'transparent',
        backgroundImage: gradient,
        backgroundSize: '200% 100%',
        backgroundPosition,
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
  showPronunciation = false,
  activeColor: activeColorProp,
  inactiveColor: inactiveColorProp,
}) => {
  const isDark = resolvedTheme === 'dark';
  const defaultActive = isDark ? '#FFFFFF' : '#000000';
  const defaultInactive = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)';
  const activeColor = activeColorProp ?? defaultActive;
  const inactiveColor = inactiveColorProp ?? defaultInactive;
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

  const pronMap = useMemo(() => {
    if (!showPronunciation || !line.pronunciationWords || !line.words) return null;
    const res = new Array(line.words.length).fill('');
    for (let i = 0; i < line.words.length; i++) {
      const w = line.words[i];
      const overlaps: string[] = [];
      for (const pw of line.pronunciationWords) {
        const overlap = Math.min(w.end, pw.end) - Math.max(w.begin, pw.begin);
        if (overlap > 0.01) overlaps.push(pw.text);
      }
      if (overlaps.length === 0) {
        let best: { pw: (typeof line.pronunciationWords)[number]; d: number } | null = null;
        for (const pw of line.pronunciationWords) {
          const d = Math.abs(pw.begin - w.begin);
          if (best == null || d < best.d) best = { pw, d };
        }
        if (best && best.d <= 0.15) {
          overlaps.push(best.pw.text);
        }
      }
      res[i] = overlaps.join(' ');
    }
    return res;
  }, [showPronunciation, line]);

  if (!line.words || line.words.length === 0) {
    return <span style={{ color: isActive ? activeColor : inactiveColor }}>{line.text}</span>;
  }
  
  // 単語ごとにハイライトする表示
  const textWithSpans = (() => {
    type AugWord = NonNullable<TTMLLine['words']>[number] & { __origIndex: number };
    const wordPositions: { start: number; end: number; word: AugWord }[] = [];
    let currentPosition = 0;
    
    if (line.words) {
      line.words.forEach((word, wIdx) => {
        let wordIndex = line.text?.indexOf(word.text, currentPosition) ?? -1;
        let actualWordText = word.text;
        
        if (wordIndex === -1) {
          const trimmedWord = word.text.trim();
          wordIndex = line.text?.indexOf(trimmedWord, currentPosition) ?? -1;
          
          if (wordIndex !== -1) {
            let endPosition = wordIndex + trimmedWord.length;
            const remainingText = line.text?.substring(endPosition) || '';
            const trailingSpaces = remainingText.match(/^\s*/)?.[0] || '';
            endPosition += trailingSpaces.length;
            
            actualWordText = line.text?.substring(wordIndex, endPosition) || word.text;
          }
        }
        
        if (wordIndex !== -1) {
          wordPositions.push({
            start: wordIndex,
            end: wordIndex + actualWordText.length,
            word: {
              ...word,
              text: actualWordText,
              __origIndex: wIdx
            }
          });
          currentPosition = wordIndex + actualWordText.length;
        }
      });
    }
    
    // テキストを分割
    const spans: JSX.Element[] = [];
    let lastEnd = 0;
    
    wordPositions.forEach(({start, end, word}, index) => {
      if (start > lastEnd) {
        // 過去の行は非アクティブ色に戻す
        spans.push(
          <span key={`space-${lastEnd}-${start}`} style={{ color: inactiveColor, whiteSpace: 'pre-wrap' }}>
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
        } else if (wordIsCompleted) {
          wordProgress = 1;
        }
        
        const backgroundSize = '200% 100%';
        const position = isLTR ? (1 - wordProgress) * 100 : wordProgress * 100;
        const finalPosition = isActive ? `${position}% 0` : (isLTR ? '100% 0' : '0% 0');
        
        const showGradient = isActive && !isPast && (wordIsActive || wordIsCompleted);
        const bgImage = showGradient
          ? `linear-gradient(to ${isLTR ? 'right' : 'left'}, ${activeColor}, ${activeColor} 47%, ${inactiveColor} 53%, ${inactiveColor})`
          : 'none';
        
        spans.push(
          showPronunciation && (line.pronunciationWords && line.pronunciationWords.length > 0)
            ? (
              <span
                key={`word-${index}-${word.begin}-${word.end}`}
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    color: showGradient ? 'transparent' : inactiveColor,
                    backgroundImage: bgImage,
                    backgroundSize: backgroundSize,
                    backgroundPosition: showGradient ? finalPosition : (isLTR ? '100% 0' : '0% 0'),
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    transform: shouldAnimate && isActive ? 'translateY(-3px)' : 'translateY(0px)',
                    transition: animationEnabled ? 'background-position 0.1s linear, transform 1.5s ease' : 'transform 1s ease',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {word.text}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.6em',
                    whiteSpace: 'pre-wrap',
                    textAlign: 'left',
                    color: showGradient ? 'transparent' : inactiveColor,
                    backgroundImage: showGradient ? `linear-gradient(to ${isLTR ? 'right' : 'left'}, ${activeColor}, ${activeColor} 47%, ${inactiveColor} 53%, ${inactiveColor})` : 'none',
                    backgroundSize: backgroundSize,
                    backgroundPosition: showGradient ? finalPosition : (isLTR ? '100% 0' : '0% 0'),
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    transition: animationEnabled ? 'background-position 0.1s linear' : 'none'
                  }}
                >
                  {pronMap ? (pronMap[word.__origIndex] || '') : (line.pronunciationWords && line.pronunciationWords[index] ? line.pronunciationWords[index].text : '')}
                </span>
              </span>
            ) : (
              <span
                key={`word-${index}-${word.begin}-${word.end}`}
                style={{
                  display: 'inline-block',
                  color: showGradient ? 'transparent' : inactiveColor,
                  backgroundImage: bgImage,
                  backgroundSize: backgroundSize,
                  backgroundPosition: showGradient ? finalPosition : (isLTR ? '100% 0' : '0% 0'),
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  transform: shouldAnimate && isActive ? 'translateY(-3px)' : 'translateY(0px)',
                  transition: animationEnabled ? 'background-position 0.1s linear, transform 1.5s ease' : 'transform 1s ease',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {word.text}
              </span>
            )
        );
      } else {
        // btt/ttb
        spans.push(
          showPronunciation && (line.pronunciationWords && line.pronunciationWords.length > 0)
            ? (
              <span
                key={`word-${index}-${word.begin}-${word.end}`}
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    position: 'relative',
                    transform: shouldAnimate && isActive ? 'translateY(-3px)' : 'translateY(0px)',
                    transition: 'transform 1.5s ease',
                    color: inactiveColor,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {word.text}
                  {(isActive && !isPast && (wordIsActive || wordIsCompleted)) && (
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
                  fontSize: '0.6em',
                  color: inactiveColor,
                  whiteSpace: 'pre-wrap',
                  textAlign: 'left'
                }}
              >
                  {pronMap ? (pronMap[word.__origIndex] || '') : (line.pronunciationWords && line.pronunciationWords[index] ? line.pronunciationWords[index].text : '')}
                  {(isActive && !isPast && (wordIsActive || wordIsCompleted)) && (
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
                      {pronMap ? (pronMap[word.__origIndex] || '') : (line.pronunciationWords && line.pronunciationWords[index] ? line.pronunciationWords[index].text : '')}
                    </span>
                  )}
                </span>
              </span>
            ) : (
              <span
                key={`word-${index}-${word.begin}-${word.end}`}
                style={{
                  display: 'inline-block',
                  position: 'relative',
                  transform: shouldAnimate && isActive ? 'translateY(-3px)' : 'translateY(0px)',
                  transition: 'transform 1.5s ease',
                  color: inactiveColor,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {word.text}
                {(isActive && !isPast && (wordIsActive || wordIsCompleted)) && (
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
      }
      
      lastEnd = end;
    });
    
    if (lastEnd < (line.text?.length ?? 0)) {
      spans.push(
        <span key={`space-${lastEnd}-end`} style={{ color: inactiveColor, whiteSpace: 'pre-wrap' }}>
          {line.text?.substring(lastEnd)}
        </span>
      );
    }
    
    return spans;
  })();
  
  return (
    <span ref={containerRef} style={{ display: 'inline-block', whiteSpace: 'pre-wrap' }}>
      {textWithSpans}
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
  mobileControlsVisible,
}) => {
  const SAME_BEGIN_EPS = 0.12;
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
  const interludeHoldRef = useRef<boolean>(false);
  const lastInterludeKeyRef = useRef<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [hasWordTiming, setHasWordTiming] = useState<boolean>(false);
  const activeLyricColor = settings.useCustomColors ? settings.activeLyricColor : (resolvedTheme === 'dark' ? '#FFFFFF' : '#000000');
  const inactiveLyricColor = settings.useCustomColors ? settings.inactiveLyricColor : (resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.5)');
  const backgroundRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [backgroundHeights, setBackgroundHeights] = useState<Map<string, number>>(new Map());
  const mainRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [stageLineKeys, setStageLineKeys] = useState<string[]>([]);
  const preStageKeyRef = useRef<string | null>(null);

  const updateStageLine = useCallback(() => {
    if (activeInterlude) {
      preStageKeyRef.current = null;
      setStageLineKeys(prev => (prev.length ? [] : prev));
      return;
    }
    const container = lyricsContainerRef.current;
    if (!container) return;
    if (!isProgrammaticScrollingRef.current) return;
    const nodes = Array.from(
      container.querySelectorAll<HTMLDivElement>('[data-line-past="false"][data-line-key]')
    );
    const scrollTop = container.scrollTop + 1;
    let picked: HTMLDivElement | null = null;
    for (const el of nodes) {
      if (el.offsetTop >= scrollTop) { picked = el; break; }
    }
    if (!picked) return;
    const key = picked.dataset.lineKey || null;
    if (!key) return;
    preStageKeyRef.current = key;
    setStageLineKeys(prev => (prev.includes(key) ? prev : [key, ...prev]));
  }, [activeInterlude]);

  const allLyricLines: TTMLLine[] = useMemo(() => {
    if (!ttmlData) return [];
    const lines: TTMLLine[] = [];
    ttmlData.divs.forEach(div => {
      div.lines.forEach(line => {
        lines.push(line);
      });
    });
    lines.sort((a, b) => a.begin - b.begin);
    
    const shortLineGroupThreshold = Math.min(5, Math.max(0, settings.shortLineGroupThreshold ?? 0.6));
    const processedLines = lines.map(line => ({ ...line, originalEnd: line.end }));
    const groupIds = new Array(processedLines.length).fill(-1);
    let nextGroupId = 0;
    
    for (let i = 0; i < processedLines.length; i++) {
      if (groupIds[i] !== -1) continue;
      
      const currentLine = processedLines[i];
      const overlappingIndices = [i];
      for (let j = i + 1; j < processedLines.length && overlappingIndices.length < 3; j++) {
        if (groupIds[j] !== -1) continue;
        const otherLine = processedLines[j];
        
        const overlap = Math.max(0, Math.min(currentLine.end, otherLine.end) - Math.max(currentLine.begin, otherLine.begin));
        if (overlap > 0) {
          overlappingIndices.push(j);
        }
      }
      
      const groupId = nextGroupId++;
      overlappingIndices.forEach(idx => {
        groupIds[idx] = groupId;
      });
    }

    const parent = Array.from({ length: nextGroupId }, (_, i) => i);
    const find = (x: number): number => {
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    };
    const union = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };
    
    for (let i = 0; i < processedLines.length - 1; i++) {
      const line = processedLines[i];
      const lineDuration = (line.originalEnd || line.end) - line.begin;
      if (lineDuration < shortLineGroupThreshold) {
        if (groupIds[i] !== -1 && groupIds[i + 1] !== -1) {
          union(groupIds[i], groupIds[i + 1]);
        }
      }
    }
    
    const groupMaxEnd = new Map<number, number>();
    for (let i = 0; i < processedLines.length; i++) {
      const root = find(groupIds[i]);
      const lineEnd = processedLines[i].originalEnd || processedLines[i].end;
      const currentMax = groupMaxEnd.get(root);
      if (currentMax == null || lineEnd > currentMax) {
        groupMaxEnd.set(root, lineEnd);
      }
    }
    
    for (let i = 0; i < processedLines.length; i++) {
      const root = find(groupIds[i]);
      const maxEnd = groupMaxEnd.get(root);
      if (maxEnd != null) {
        processedLines[i].groupEnd = maxEnd;
      }
    }
    
    return processedLines;
  }, [ttmlData, settings.shortLineGroupThreshold]);

  const getNextTimeDiffSkippingCluster = useCallback((baseLine: TTMLLine): number => {
    const baseIdx = allLyricLines.findIndex(l => l.begin === baseLine.begin && l.text === baseLine.text);
    if (baseIdx < 0) return 1.0;
    for (let i = baseIdx + 1; i < allLyricLines.length; i++) {
      const next = allLyricLines[i];
      const inSameGroup = currentGroup.some(g => g.begin === next.begin && g.text === next.text);
      const gap = next.begin - baseLine.begin;
      if (inSameGroup) continue;
      if (gap < SAME_BEGIN_EPS) continue;
      return Math.max(gap, 0.01);
    }
    return 1.0;
  }, [allLyricLines, currentGroup]);

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

  // 1回だけセンタリング
  const centerInterludeOnce = useCallback((period: { start: number; end: number; divIndex: number }) => {
    const container = lyricsContainerRef.current;
    if (!container) return;
    const el = document.getElementById(`interlude-${period.start}-${period.end}`);
    if (!el) return;

    const containerHeight = container.clientHeight;
    const contentHeight = container.scrollHeight;
    const interludeOffsetTop = el.offsetTop;
    const interludeHeight = el.clientHeight;
    const offsetPercentage = settings.scrollPositionOffset !== undefined
      ? settings.scrollPositionOffset / 100
      : 0.5;

    const anchorBase = (isMobile ? window.innerHeight : containerHeight);
    const anchorY = anchorBase * offsetPercentage;
    let targetScrollTop = interludeOffsetTop - anchorY + interludeHeight / 2;
    targetScrollTop = Math.max(0, Math.min(targetScrollTop, contentHeight - containerHeight));

    const ilLen = Math.max(0, period.end - period.start);
    const duration = ilLen < 0.2 ? 150
                    : ilLen < 0.5 ? 300
                    : ilLen < 1.0 ? 500
                    : 800;

    isProgrammaticScrollingRef.current = true;
    (smoothScrollTo as (element: HTMLElement, to: number, duration: number) => Promise<void>)(container, targetScrollTop, duration)
      .finally(() => {
        setTimeout(() => { isProgrammaticScrollingRef.current = false; }, 80);
      });
  }, [isMobile, settings.scrollPositionOffset, smoothScrollTo]);

  // ホールド制御
  useEffect(() => {
    if (activeInterlude) {
      const key = `${activeInterlude.divIndex}:${activeInterlude.start}-${activeInterlude.end}`;
      if (lastInterludeKeyRef.current !== key) {
        centerInterludeOnce(activeInterlude);
        interludeHoldRef.current = true;
        setIsAutoScrollEnabled(false);
        lastInterludeKeyRef.current = key;
      }
    } else {
      // ホールド解除
      if (interludeHoldRef.current) {
        interludeHoldRef.current = false;
        setIsAutoScrollEnabled(true);
      }
      lastInterludeKeyRef.current = null;
    }
  }, [activeInterlude, centerInterludeOnce]);

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

  const agentAlignmentMap = useMemo(() => {
    if (!ttmlData) return {} as Record<string, 'left' | 'right'>;

    const agentIdsInLyrics = allLyricLines
      .map(line => line.agent)
      .filter((id): id is string => Boolean(id));
    
    if (agentIdsInLyrics.length === 0) {
      return {} as Record<string, 'left' | 'right'>;
    }

    const uniqueAgentIds = [...new Set(agentIdsInLyrics)];
    const lookupAgentType = (id: string) => ttmlData.agents.find(agent => agent.id === id)?.type || '';

    const alignments: Record<string, 'left' | 'right'> = {};
    const leftAligned: string[] = [];
    const rightAligned: string[] = [];

    const assign = (id: string, side: 'left' | 'right') => {
      if (alignments[id]) return;
      alignments[id] = side;
      if (side === 'left') {
        leftAligned.push(id);
      } else {
        rightAligned.push(id);
      }
    };

    const sideWithFewerAgents = () => (leftAligned.length <= rightAligned.length ? 'left' : 'right') as 'left' | 'right';

    const personAgents = uniqueAgentIds.filter(id => lookupAgentType(id) === 'person');

    if (personAgents.length > 0) {
      assign(personAgents[0], 'left');
    }
    if (personAgents.length > 1) {
      assign(personAgents[1], 'right');
    }

    personAgents.slice(2).forEach(id => {
      if (alignments[id]) return;
      const numericMatch = id.match(/^v(\d+)$/i);
      if (numericMatch) {
        const num = parseInt(numericMatch[1], 10);
        assign(id, num % 2 === 1 ? 'left' : 'right');
      } else {
        assign(id, 'right');
      }
    });

    uniqueAgentIds.forEach(id => {
      if (alignments[id]) return;
      const type = lookupAgentType(id);
      if (type === 'group') {
        assign(id, sideWithFewerAgents());
      } else {
        assign(id, sideWithFewerAgents());
      }
    });

    return alignments;
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
    if (activeInterlude || interludeHoldRef.current) return;
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
    }
  }, [currentTime, groupEnd, currentGroup, groupIndex, allLyricLines, isMobile, settings.scrollPositionOffset, smoothScrollTo, ttmlData, settings.lyricOffset, isAutoScrollEnabled, divLastLineIndices, activeInterlude]);

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
    const rafScrollUpdate = () => {
      if (isProgrammaticScrollingRef.current) {
        requestAnimationFrame(updateStageLine);
      }
    };
    container.addEventListener('scroll', rafScrollUpdate, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleUserScroll);
      container.removeEventListener('touchmove', handleUserScroll);
      container.removeEventListener('scroll', rafScrollUpdate);
    };
  }, [updateStageLine]);

  // 自動スクロール
  useEffect(() => {
    if (!ttmlData) return;
    if (!lyricsContainerRef.current) return;
    if (!isAutoScrollEnabled) return;
    if (interludeHoldRef.current) return; // ホールド中は自動処理しない
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

    const containerHeight = container.clientHeight;
    const contentHeight = container.scrollHeight;
    const offsetPercentage =
      settings.scrollPositionOffset !== undefined ? settings.scrollPositionOffset / 100 : 0.5;
    const anchorBase = isMobile ? window.innerHeight : containerHeight;
    const anchorY = anchorBase * offsetPercentage;

    let targetScrollTop = 0;
    {
      const lyricOffsetTop = (lineElement as HTMLElement).offsetTop;
      const lyricHeight = (lineElement as HTMLElement).offsetHeight;

      const lineCenter = lyricOffsetTop + lyricHeight / 2;
      targetScrollTop = lineCenter - anchorY;
    }
    
    targetScrollTop = Math.max(0, Math.min(targetScrollTop, contentHeight - containerHeight));

    const currentScrollTop = container.scrollTop;
    if (Math.abs(targetScrollTop - currentScrollTop) < 5) {
      lastScrolledLineRef.current = targetLine;
      return;
    }

    const nextTimeDiff = getNextTimeDiffSkippingCluster(targetLine);
    
    const scrollDuration =
      nextTimeDiff < 0.2 ? 150 :
      nextTimeDiff < 0.3 ? 200 :
      nextTimeDiff < 0.4 ? 250 :
      nextTimeDiff < 0.5 ? 300 :
      nextTimeDiff < 0.6 ? 350 :
      nextTimeDiff < 0.7 ? 400 :
      nextTimeDiff < 0.8 ? 450 :
      nextTimeDiff < 0.9 ? 500 :
      nextTimeDiff < 1.0 ? 600 : 850;
    
    if (!activeInterlude) {
      const key = `${targetLine.begin}-${targetLine.end}`;
      preStageKeyRef.current = key;
      setStageLineKeys(prev => (prev.includes(key) ? prev : [key, ...prev]));
    }
    isProgrammaticScrollingRef.current = true;
    lastScrolledLineRef.current = targetLine;
    lastUserScrollTimeRef.current = now;
    
    (smoothScrollTo as (element: HTMLElement, to: number, duration: number) => Promise<void>)(container, targetScrollTop, scrollDuration)
      .finally(() => {
        setTimeout(() => {
          isProgrammaticScrollingRef.current = false;
        }, 50);
      });
  }, [allLyricLines, currentGroup, currentTime, settings.lyricOffset, isAutoScrollEnabled, settings.scrollPositionOffset, isMobile, smoothScrollTo, ttmlData, backgroundHeights, interludePeriods, getNextTimeDiffSkippingCluster, activeInterlude]);

  useEffect(() => {
    if (activeInterlude) {
      preStageKeyRef.current = null;
      setStageLineKeys(prev => (prev.length ? [] : prev));
      return;
    }
    const t = currentTime + (settings.lyricOffset || 0);

    const preKey = preStageKeyRef.current;
    const preKeyBegin = preKey != null ? parseFloat(preKey.split('-')[0] || '') : NaN;
    const hasUpcomingStage = preKey != null && !Number.isNaN(preKeyBegin);

    if (currentGroup.length === 0 || groupEnd == null) {
      if (hasUpcomingStage && preKey) {
        setStageLineKeys(prev => (prev.length === 1 && prev[0] === preKey ? prev : [preKey]));
      } else {
        preStageKeyRef.current = null;
        setStageLineKeys(prev => (prev.length ? [] : prev));
      }
      return;
    }

    if (t >= groupEnd) {
      preStageKeyRef.current = null;
      setStageLineKeys(prev => (prev.length ? [] : prev));
      return;
    }

    if (hasUpcomingStage && preKey && t >= preKeyBegin) {
      preStageKeyRef.current = null;
    }

    const groupKeysSet = new Set(currentGroup.map(l => `${l.begin}-${l.end}`));
    const includePre = preStageKeyRef.current ? groupKeysSet.has(preStageKeyRef.current) : false;

    setStageLineKeys(prev => {
      const carryOver: string[] = prev.filter(k => groupKeysSet.has(k));
      const started: string[] = currentGroup
        .filter(l => t >= l.begin)
        .map(l => `${l.begin}-${l.end}`);
      const nextRaw = [
        ...(includePre && preStageKeyRef.current ? [preStageKeyRef.current] : []),
        ...carryOver,
        ...started,
      ];
      const next: string[] = [];
      for (const k of nextRaw) if (!next.includes(k)) next.push(k);
      if (next.length === prev.length && next.every((v, i) => v === prev[i])) {
        return prev;
      }
      return next;
    });
  }, [currentTime, currentGroup, groupEnd, activeInterlude, settings.lyricOffset]);

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

  useEffect(() => {
    updateStageLine();
  }, [currentTime, currentGroup, groupEnd, isAutoScrollEnabled, updateStageLine]);

  if (!ttmlData) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 flex flex-col justify-center z-50 
        ${hasAgents ? 'items-center text-center' : 
          settings.lyricposition === 'center' ? 'items-center text-center' : 
          settings.lyricposition === 'right' ? `items-end ${isMobile ? 'right-0' : 'right-20'}` : 
          `items-start`}
        text-gray-900 dark:text-white
      `}
    >
      <div
        className={`overflow-y-auto hidden-scrollbar
          ${settings.theme === 'dark' ? 'text-white' : 'text-gray-900'}
          ${settings.fullplayer && settings.showplayercontrol ? 'mb-20' : ''}
          ${isMobile ? 'px-3 w-full' : 'px-20 w-full'}
        `}
        style={{
          transition: 'margin-bottom 0.3s ease, --lyrics-mask-bottom-start 0.35s ease, --lyrics-mask-bottom-end 0.35s ease',
          '--lyrics-mask-bottom-start': isMobile && settings.showplayercontrol && (mobileControlsVisible ?? true) ? '420px' : '12%',
          '--lyrics-mask-bottom-end': isMobile && settings.showplayercontrol && (mobileControlsVisible ?? true) ? '600px' : '35%',
          maskImage: isMobile 
            ? 'linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) var(--lyrics-mask-bottom-start), #000 var(--lyrics-mask-bottom-end), #000 90%, rgba(0,0,0,0) 100%)'
            : 'linear-gradient(0deg, rgba(0,0,0,0) 0%, #000 40%, #000 75%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: isMobile 
            ? 'linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) var(--lyrics-mask-bottom-start), #000 var(--lyrics-mask-bottom-end), #000 90%, rgba(0,0,0,0) 100%)'
            : 'linear-gradient(0deg, rgba(0,0,0,0) 0%, #000 40%, #000 75%, rgba(0,0,0,0) 100%)',
          marginBottom: isMobile ? '-120px' : settings.fullplayer
            ? settings.showplayercontrol
              ? '120px'
              : '0'
            : '0',
        } as React.CSSProperties}
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
            const lineKey = `${line.begin}-${line.end}`;
            const isStage = !activeInterlude && stageLineKeys.includes(lineKey) && !isPast;
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
                const mappedAlignment = agentAlignmentMap[agent.id];
                if (mappedAlignment) {
                  textAlignment = mappedAlignment;
                } else {
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
                }
              } else {
                textAlignment = settings.lyricposition;
              }
            } else {
              textAlignment = settings.lyricposition;
            }
            
            const isRightAligned = textAlignment === 'right';
            const stageShiftPx = (() => {
              const base =
                settings.fontSize === 'small' ? 1 :
                settings.fontSize === 'medium' ? 2 :
                settings.fontSize === 'large' ? 2 : 0;
              return isRightAligned ? -base : base;
            })();
            
            // 間奏か
            const normalizeForCompare = (s?: string) => (s ?? '').replace(/\s+/g, '').toLowerCase();
            const mainTextForCompare = normalizeForCompare(
              (line.text && line.text.trim() !== '')
                ? line.text
                : (line.words && line.words.length > 0 ? line.words.map(w => w.text).join(' ') : '')
            );
            const pronTextForCompare = normalizeForCompare(
              (typeof line.pronunciationText === 'string' && line.pronunciationText.trim() !== '')
                ? line.pronunciationText
                : (line.pronunciationWords && line.pronunciationWords.length > 0 ? line.pronunciationWords.map(w => w.text).join(' ') : '')
            );
            const hidePronLine = mainTextForCompare !== '' && pronTextForCompare !== '' && mainTextForCompare === pronTextForCompare;
            const backgroundTextForCompare = normalizeForCompare(
              (line.backgroundText && line.backgroundText.trim() !== '')
                ? line.backgroundText
                : (line.backgroundWords && line.backgroundWords.length > 0 ? line.backgroundWords.map(w => w.text).join(' ') : '')
            );
            const backgroundPronTextForCompare = normalizeForCompare(
              (typeof line.backgroundPronunciationText === 'string' && line.backgroundPronunciationText.trim() !== '')
                ? line.backgroundPronunciationText
                : (line.backgroundPronunciationWords && line.backgroundPronunciationWords.length > 0 ? line.backgroundPronunciationWords.map(w => w.text).join(' ') : '')
            );
            const hideBackgroundPronLine = backgroundTextForCompare !== '' && backgroundPronTextForCompare !== '' && backgroundTextForCompare === backgroundPronTextForCompare;

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
                    ${isEmpty ? 'm-0 p-0' : settings.fontSize === 'small' ? 'my-2' : 'my-4'} ${textColor}
                    ${hasAgents ? (
                      textAlignment === 'left' ? 'w-5/6 mr-auto' :
                      textAlignment === 'right' ? 'w-5/6 ml-auto' :
                      'w-full'
                    ) : 'w-full'}`}
                    style={{
                    opacity,
                    fontSize: {
                      small: '2.0rem',
                      medium: '3.0rem',
                      large: '4.0rem',
                    }[settings.fontSize],
                    fontWeight: 'bold',
                    textAlign: textAlignment,
                    transform: `${
                      isAfterInterludeDiv
                        ? (settings.fontSize === 'small'
                          ? 'translateY(45px)'
                          : settings.fontSize === 'medium'
                            ? 'translateY(68px)'
                            : 'translateY(83px)')
                        : 'translateY(0)'
                    }`,
                    transition: `transform ${(() => {
                      const diff = getNextTimeDiffSkippingCluster(line);
                      return diff < 0.2 ? '0.15s' :
                              diff < 0.3 ? '0.2s'  :
                              diff < 0.4 ? '0.25s' :
                              diff < 0.5 ? '0.3s'  :
                              diff < 0.6 ? '0.35s' :
                              diff < 0.7 ? '0.4s'  :
                              diff < 0.8 ? '0.45s' :
                              diff < 0.9 ? '0.5s'  :
                              diff < 1.0 ? '0.6s'  : '0.85s';
                    })()} ${settings.CustomEasing || 'cubic-bezier(0.22, 1, 0.36, 1)'}, opacity 0.5s, margin 1s, padding 1s, color 0.5s, background-color 0.5s`,
                    wordWrap: 'break-word',
                    wordBreak: 'break-word',
                  }}
                  onClick={() => { onLyricClick(line.begin); setIsAutoScrollEnabled(true); }}
                  data-line-active={isDisplaying ? 'true' : 'false'}
                  data-line-past={isPast ? 'true' : 'false'}
                  data-line-key={lineKey}
                  data-line-begin={String(line.begin)}
                  data-line-group-end={String(lineEnd)}
                >
                  {!isEmpty && (
                    <span
                      className="inline-block will-change-transform"
                      data-stage-span={isStage ? 'true' : 'false'}
                      style={{
                        transform: isStage ? `translateX(${stageShiftPx}px) scale(1.02)` : 'translateX(0) scale(1.0)',
                        transformOrigin: isRightAligned ? 'right center' : 'left center',
                        transition: `transform 0.8s ${settings.CustomEasing || 'cubic-bezier(0.22, 1, 0.36, 1)'}`
                      }}
                    >
                      <div className={`${settings.fontSize === 'small' ? 'p-4' : settings.fontSize === 'medium' ? 'p-4' : settings.fontSize === 'large' ? 'p-5' : 'p-4'}`}>
                            
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
                                position: 'relative',
                                opacity: isStage ? 1 : 0,
                                bottom: isStage ? '0px' : settings.fontSize === 'small' ? '-80px' : settings.fontSize === 'medium' ? '-100px' : settings.fontSize === 'large' ? '-150px' : '-100px',
                                maxHeight: isStage ? `${actualHeight > 0 ? actualHeight : 200}px` : '0px',
                                overflow: 'visible',
                                transition: `transform 500ms ease, opacity ${isStage ? '1500ms' : '220ms'} ease, max-height ${isStage ? '300ms' : '2000ms'} ${settings.CustomEasing || 'cubic-bezier(0.22, 1, 0.36, 1)'}, bottom ${isStage ? '600ms' : '1000ms'} ${settings.CustomEasing || 'cubic-bezier(0.22, 1, 0.36, 1)'}`,
                                willChange: 'opacity, max-height, filter, bottom',
                                pointerEvents: 'none',
                                textAlign: textAlignment,
                                marginBottom: '15px',
                                transform: isStage ? 'scale(1) translateX(0)' : `scale(0.9) ${textAlignment === 'right' ? 'translateX(20px)' : 'translateX(-20px)'}`,
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
                                    pronunciationWords={line.backgroundPronunciationWords}
                                    showPronunciation={!!(settings.showPronunciation && !hideBackgroundPronLine && line.backgroundPronunciationWords && line.backgroundPronunciationWords.length > 0)}
                                    karaokeEnabled={settings.useKaraokeLyric}
                                    persistActive={isDisplaying}
                                    activeColor={activeLyricColor}
                                    inactiveColor={inactiveLyricColor}
                                  />
                                ) : (
                                  <div>
                                    <span style={{ 
                                      fontSize: {
                                        small: '1.2rem',
                                        medium: '1.5rem',
                                        large: '2.0rem',
                                      }[settings.fontSize],
                                      color: settings.useCustomColors
                                        ? (isDisplaying ? activeLyricColor : inactiveLyricColor)
                                        : (resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'),
                                      pointerEvents: 'none',
                                      transition: 'color 0.5s ease'
                                    }}>
                                      <LineBreaker text={line.backgroundText} />
                                    </span>
                                    {settings.showPronunciation && !hideBackgroundPronLine && (((line.backgroundPronunciationWords && line.backgroundPronunciationWords.length > 0) || (typeof line.backgroundPronunciationText === 'string' && line.backgroundPronunciationText.trim() !== ''))) && (
                                      settings.useWordTiming && line.backgroundPronunciationWords && line.backgroundPronunciationWords.length > 0 ? (
                                        <div
                                          style={{
                                            fontSize: '0.48em',
                                            color: (() => {
                                              const begin = line.begin;
                                              const end = (line.originalEnd || line.end);
                                              const active = isDisplaying || ((currentTime + (settings.lyricOffset || 0)) >= begin && (currentTime + (settings.lyricOffset || 0)) < end);
                                              if (settings.useCustomColors) {
                                                return active ? activeLyricColor : inactiveLyricColor;
                                              }
                                              const dark = active ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)';
                                              const light = active ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)';
                                              return resolvedTheme === 'dark' ? dark : light;
                                            })(),
                                            pointerEvents: 'none',
                                            textAlign: (settings.useKaraokeLyric && settings.useWordTiming) ? 'left' : textAlignment,
                                            transition: 'color 0.5s ease',
                                            marginTop: '0.1em',
                                          }}
                                        >
                                          <TranslationWordTimingLyricLine
                                            backgroundWords={line.backgroundPronunciationWords}
                                            currentTime={currentTime + (settings.lyricOffset || 0)}
                                            resolvedTheme={resolvedTheme}
                                            progressDirection={settings.lyricProgressDirection}
                                            fontSize={settings.fontSize}
                                            karaokeEnabled={settings.useKaraokeLyric}
                                            persistActive={isDisplaying}
                                          />
                                        </div>
                                      ) : (settings.useKaraokeLyric && ((currentTime + (settings.lyricOffset || 0)) >= line.begin && (currentTime + (settings.lyricOffset || 0)) < (line.originalEnd || line.end))) ? (
                                        <div
                                          style={{
                                            fontSize: '0.48em',
                                            pointerEvents: 'none',
                                            textAlign: textAlignment,
                                            marginTop: '0.1em',
                                          }}
                                        >
                                          <PronunciationKaraokeLyricLine
                                            text={line.backgroundPronunciationText || (line.backgroundPronunciationWords ? line.backgroundPronunciationWords.map(w => w.text).join(' ') : '')}
                                            progressPercentage={
                                              (() => {
                                                const now = currentTime + (settings.lyricOffset || 0);
                                                const end = (line.originalEnd || line.end);
                                                if (now <= line.begin) return 0;
                                                if (now >= end) return 100;
                                                return ((now - line.begin) / (end - line.begin)) * 100;
                                              })()
                                            }
                                            resolvedTheme={resolvedTheme}
                                            isActive={((currentTime + (settings.lyricOffset || 0)) >= line.begin && (currentTime + (settings.lyricOffset || 0)) < (line.originalEnd || line.end))}
                                            progressDirection={settings.lyricProgressDirection}
                                            activeColor={settings.useCustomColors ? activeLyricColor : undefined}
                                            inactiveColor={settings.useCustomColors ? inactiveLyricColor : undefined}
                                          />
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            fontSize: '0.48em',
                                            color: (() => {
                                              const begin = line.begin;
                                              const end = (line.originalEnd || line.end);
                                              const active = (currentTime + (settings.lyricOffset || 0)) >= begin && (currentTime + (settings.lyricOffset || 0)) < end;
                                              if (settings.useCustomColors) {
                                                return active ? activeLyricColor : inactiveLyricColor;
                                              }
                                              const dark = active ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.3)';
                                              const light = active ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.3)';
                                              return resolvedTheme === 'dark' ? dark : light;
                                            })(),
                                            pointerEvents: 'none',
                                            textAlign: textAlignment,
                                            marginTop: '0.1em',
                                          }}
                                        >
                                          <LineBreaker text={line.backgroundPronunciationText || (line.backgroundPronunciationWords ? line.backgroundPronunciationWords.map(w => w.text).join(' ') : '')} />
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                                {settings.showTranslation && (
                                  ((line.backgroundTranslationWords1 && line.backgroundTranslationWords1.length > 0) ||
                                    (typeof line.backgroundTranslationText1 === 'string' && line.backgroundTranslationText1.trim() !== '') ||
                                    (line.backgroundTranslationWords2 && line.backgroundTranslationWords2.length > 0) ||
                                    (typeof line.backgroundTranslationText2 === 'string' && line.backgroundTranslationText2.trim() !== '')) && (
                                    <>
                                      {(line.backgroundTranslationWords1 || line.backgroundTranslationText1) && (
                                        <div
                                          style={{
                                            fontSize: {
                                              small: '1.1rem',
                                              medium: '1.4rem',
                                              large: '1.9rem',
                                            }[settings.fontSize],
                                            pointerEvents: 'none',
                                            textAlign: textAlignment,
                                            marginTop: '0.15em',
                                            transition: 'color 0.5s ease',
                                            opacity: 0.6,
                                          }}
                                        >
                                          {settings.useWordTiming && line.backgroundTranslationWords1 && line.backgroundTranslationWords1.length > 0 ? (
                                          <TranslationWordTimingLyricLine
                                            backgroundWords={line.backgroundTranslationWords1}
                                            currentTime={currentTime + (settings.lyricOffset || 0)}
                                            resolvedTheme={resolvedTheme}
                                            progressDirection={settings.lyricProgressDirection}
                                            fontSize={settings.fontSize}
                                            karaokeEnabled={settings.useKaraokeLyric}
                                            persistActive={isDisplaying}
                                            disableGradient
                                            activeColor={activeLyricColor}
                                            inactiveColor={inactiveLyricColor}
                                          />
                                          ) : (
                                            <span style={{ whiteSpace: 'pre-wrap' }}>
                                              <LineBreaker text={line.backgroundTranslationText1 || ''} />
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {(line.backgroundTranslationWords2 || line.backgroundTranslationText2) && (
                                        <div
                                          style={{
                                            fontSize: {
                                              small: '1.2rem',
                                              medium: '1.5rem',
                                              large: '2.0rem',
                                            }[settings.fontSize],
                                            fontWeight: 'bold',
                                            pointerEvents: 'none',
                                            textAlign: (settings.useKaraokeLyric && settings.useWordTiming) ? 'left' : textAlignment,
                                            marginTop: '0.15em',
                                            transition: 'color 0.5s ease',
                                            opacity: 0.6,
                                          }}
                                        >
                                          {settings.useWordTiming && line.backgroundTranslationWords2 && line.backgroundTranslationWords2.length > 0 ? (
                                          <TranslationWordTimingLyricLine
                                            backgroundWords={line.backgroundTranslationWords2}
                                            currentTime={currentTime + (settings.lyricOffset || 0)}
                                            resolvedTheme={resolvedTheme}
                                            progressDirection={settings.lyricProgressDirection}
                                            fontSize={settings.fontSize}
                                            karaokeEnabled={settings.useKaraokeLyric}
                                            persistActive={isDisplaying}
                                            disableGradient
                                            activeColor={activeLyricColor}
                                            inactiveColor={inactiveLyricColor}
                                          />
                                          ) : (
                                            <span style={{ whiteSpace: 'pre-wrap' }}>
                                              <LineBreaker text={line.backgroundTranslationText2 || ''} />
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        <div
                          ref={(el) => {
                          const key = `${line.begin}-${line.end}-main`;
                            if (el) {
                              mainRefs.current.set(key, el);
                            } else {
                              mainRefs.current.delete(key);
                            }
                          }}
                        >
                          {settings.useKaraokeLyric ? (
                            hasWordTiming && settings.useWordTiming && line.words && line.words.length > 0 ? (
                              <WordTimingKaraokeLyricLine
                                line={line}
                                currentTime={currentTime + (settings.lyricOffset || 0)}
                                resolvedTheme={resolvedTheme}
                                progressDirection={settings.lyricProgressDirection}
                                isActive={isDisplaying}
                                isPast={isPast}
                                showPronunciation={settings.showPronunciation && !hidePronLine && !!(line.words && line.words.length > 0 && line.pronunciationWords && line.pronunciationWords.length > 0)}
                                activeColor={activeLyricColor}
                                inactiveColor={inactiveLyricColor}
                              />
                            ) : (
                              isDisplaying ? (
                                <KaraokeLyricLine
                                  text={line.text || ''}
                                  progressPercentage={progressPercentage}
                                  resolvedTheme={resolvedTheme}
                                  isActive={isDisplaying}
                                  progressDirection={settings.lyricProgressDirection}
                                  activeColor={activeLyricColor}
                                  inactiveColor={inactiveLyricColor}
                                />
                              ) : (
                                <span style={{ pointerEvents: 'none', color: isDisplaying ? activeLyricColor : inactiveLyricColor }}>
                                  <LineBreaker text={line.text || ''} />
                                </span>
                              )
                            )
                          ) : (
                            <span
                              style={{
                                pointerEvents: 'none',
                                color: isDisplaying ? activeLyricColor : inactiveLyricColor,
                                transition: 'color 0.5s ease'
                              }}
                            >
                              <LineBreaker text={line.text || ''} />
                            </span>
                          )}
                          {settings.showPronunciation && !hidePronLine && !(settings.useKaraokeLyric && settings.useWordTiming && line.words && line.words.length > 0 && line.pronunciationWords && line.pronunciationWords.length > 0) && ((line.pronunciationWords && line.pronunciationWords.length > 0) || (typeof line.pronunciationText === 'string' && line.pronunciationText.trim() !== '')) && (
                            <div
                              style={{
                                fontSize: '0.6em',
                                color: (() => {
                                  const begin = line.begin;
                                  const end = (line.originalEnd || line.end);
                                  const active = isDisplaying || (now >= begin && now < end);
                                  if (settings.useCustomColors) {
                                    return active ? activeLyricColor : inactiveLyricColor;
                                  }
                                  const dark = active ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.3)';
                                  const light = active ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.3)';
                                  return resolvedTheme === 'dark' ? dark : light;
                                })(),
                                fontWeight: 'bold',
                                pointerEvents: 'none',
                                textAlign: textAlignment,
                                transition: 'color 0.5s ease',
                                marginBottom: '0.15em',
                              }}
                            >
                              {settings.useWordTiming && line.pronunciationWords && line.pronunciationWords.length > 0 ? (
                                  <TranslationWordTimingLyricLine
                                    backgroundWords={line.pronunciationWords}
                                    currentTime={currentTime + (settings.lyricOffset || 0)}
                                    resolvedTheme={resolvedTheme}
                                    progressDirection={settings.lyricProgressDirection}
                                    fontSize={settings.fontSize}
                                    karaokeEnabled={settings.useKaraokeLyric}
                                    persistActive={isDisplaying}
                                    activeColor={activeLyricColor}
                                    inactiveColor={inactiveLyricColor}
                                  />
                              ) : (settings.useKaraokeLyric && (now >= line.begin && now < (line.originalEnd || line.end))) ? (
                                          <PronunciationKaraokeLyricLine
                                            text={line.pronunciationText || (line.pronunciationWords ? line.pronunciationWords.map(w => w.text).join(' ') : '')}
                                            progressPercentage={
                                              (() => {
                                                const end = (line.originalEnd || line.end);
                                                if (now <= line.begin) return 0;
                                                if (now >= end) return 100;
                                                return ((now - line.begin) / (end - line.begin)) * 100;
                                              })()
                                            }
                                            resolvedTheme={resolvedTheme}
                                            isActive={(now >= line.begin && now < (line.originalEnd || line.end))}
                                            progressDirection={settings.lyricProgressDirection}
                                            activeColor={activeLyricColor}
                                            inactiveColor={inactiveLyricColor}
                                          />
                              ) : (
                                <span style={{ whiteSpace: 'pre-wrap' }}>
                                  <LineBreaker text={line.pronunciationText || (line.pronunciationWords ? line.pronunciationWords.map(w => w.text).join(' ') : '')} />
                                </span>
                              )}
                            </div>
                          )}
                          
                        </div>
                        {settings.showTranslation && (((line.translationWords1 && line.translationWords1.length > 0) || (typeof line.translationText1 === 'string' && line.translationText1.trim() !== '') || (line.translationWords2 && line.translationWords2.length > 0) || (typeof line.translationText2 === 'string' && line.translationText2.trim() !== ''))) && (
                          <>
                            {(line.translationWords1 || line.translationText1) && (
                              <div
                                style={{
                                  fontSize: {
                                    small: '1.2rem',
                                    medium: '1.5rem',
                                    large: '2.0rem',
                                  }[settings.fontSize],
                                  pointerEvents: 'none',
                                  textAlign: textAlignment,
                                  marginTop: '0.15em',
                                  transition: 'color 0.5s ease',
                                  opacity: 0.8,
                                }}
                              >
                                {settings.useWordTiming && line.translationWords1 && line.translationWords1.length > 0 ? (
                                  <TranslationWordTimingLyricLine
                                    backgroundWords={line.translationWords1}
                                    currentTime={currentTime + (settings.lyricOffset || 0)}
                                    resolvedTheme={resolvedTheme}
                                    progressDirection={settings.lyricProgressDirection}
                                    fontSize={settings.fontSize}
                                    disableGradient
                                    activeColor={activeLyricColor}
                                    inactiveColor={inactiveLyricColor}
                                  />
                                ) : (
                                  <span style={{ whiteSpace: 'pre-wrap' }}>
                                    <LineBreaker text={line.translationText1 || ''} />
                                  </span>
                                )}
                              </div>
                            )}
                            {(line.translationWords2 || line.translationText2) && (
                              <div
                                style={{
                                  fontSize: {
                                    small: '1.2rem',
                                    medium: '1.5rem',
                                    large: '2.0rem',
                                  }[settings.fontSize],
                                  fontWeight: 'bold',
                                  pointerEvents: 'none',
                                  textAlign: textAlignment,
                                  marginTop: '0.15em',
                                  transition: 'color 0.5s ease',
                                  opacity: 0.8,
                                }}
                              >
                                {settings.useWordTiming && line.translationWords2 && line.translationWords2.length > 0 ? (
                                  <TranslationWordTimingLyricLine
                                    backgroundWords={line.translationWords2}
                                    currentTime={currentTime + (settings.lyricOffset || 0)}
                                    resolvedTheme={resolvedTheme}
                                    progressDirection={settings.lyricProgressDirection}
                                    fontSize={settings.fontSize}
                                    disableGradient
                                    activeColor={activeLyricColor}
                                    inactiveColor={inactiveLyricColor}
                                  />
                                ) : (
                                  <span style={{ whiteSpace: 'pre-wrap' }}>
                                    <LineBreaker text={line.translationText2 || ''} />
                                  </span>
                                )}
                              </div>
                            )}
                          </>
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
                                  position: 'relative',
                                  opacity: isStage ? 1 : 0,
                                  top: isStage ? '0px' : settings.fontSize === 'small' ? '-80px' : settings.fontSize === 'medium' ? '-130px' : settings.fontSize === 'large' ? '-200px' : '-150px',
                                  maxHeight: isStage ? `${actualHeight > 0 ? actualHeight : 200}px` : '0px',
                                  overflow: 'auto',
                                  transition: `transform 500ms ease,opacity ${isStage ? '1000ms' : '220ms'} ease, max-height ${isStage ? '300ms' : '2000ms'} ${settings.CustomEasing || 'cubic-bezier(0.22, 1, 0.36, 1)'}, top ${isStage ? '500ms' : '1000ms'} ${settings.CustomEasing || 'cubic-bezier(0.22, 1, 0.36, 1)'}`,
                                  willChange: 'opacity, max-height, filter, top',
                                  pointerEvents: 'none',
                                  textAlign: textAlignment,
                                  transform: isStage ? 'scale(1) translateX(0)' : `scale(0.9) ${textAlignment === 'right' ? 'translateX(20px)' : 'translateX(-20px)'}`,
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
                                    pronunciationWords={line.backgroundPronunciationWords}
                                    showPronunciation={!!(settings.showPronunciation && !hideBackgroundPronLine && line.backgroundPronunciationWords && line.backgroundPronunciationWords.length > 0)}
                                    karaokeEnabled={settings.useKaraokeLyric}
                                    persistActive={isDisplaying}
                                    activeColor={activeLyricColor}
                                    inactiveColor={inactiveLyricColor}
                                  />
                                ) : (
                                  <div>
                                    <span style={{ 
                                      fontSize: {
                                        small: '1.2rem',
                                        medium: '1.5rem',
                                        large: '2.0rem',
                                      }[settings.fontSize],
                                      color: settings.useCustomColors
                                        ? (isDisplaying ? activeLyricColor : inactiveLyricColor)
                                        : (resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'),
                                      pointerEvents: 'none',
                                      transition: 'color 0.5s ease'
                                    }}>
                                      <LineBreaker text={line.backgroundText} />
                                    </span>
                                    {settings.showPronunciation && !hideBackgroundPronLine && (((line.backgroundPronunciationWords && line.backgroundPronunciationWords.length > 0) || (typeof line.backgroundPronunciationText === 'string' && line.backgroundPronunciationText.trim() !== ''))) && (
                                      settings.useWordTiming && line.backgroundPronunciationWords && line.backgroundPronunciationWords.length > 0 ? (
                                        <div
                                          style={{
                                            fontSize: '0.48em',
                                            color: (() => {
                                              const begin = line.begin;
                                              const end = (line.originalEnd || line.end);
                                              const active = (currentTime + (settings.lyricOffset || 0)) >= begin && (currentTime + (settings.lyricOffset || 0)) < end;
                                              if (settings.useCustomColors) {
                                                return active ? activeLyricColor : inactiveLyricColor;
                                              }
                                              const dark = active ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.3)';
                                              const light = active ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.3)';
                                              return resolvedTheme === 'dark' ? dark : light;
                                            })(),
                                            pointerEvents: 'none',
                                            textAlign: (settings.useKaraokeLyric && settings.useWordTiming) ? 'left' : textAlignment,
                                            transition: 'color 0.5s ease',
                                            marginTop: '0.1em',
                                          }}
                                        >
                                          <TranslationWordTimingLyricLine
                                            backgroundWords={line.backgroundPronunciationWords}
                                            currentTime={currentTime + (settings.lyricOffset || 0)}
                                            resolvedTheme={resolvedTheme}
                                            progressDirection={settings.lyricProgressDirection}
                                            fontSize={settings.fontSize}
                                            karaokeEnabled={settings.useKaraokeLyric}
                                            persistActive={isDisplaying}
                                            activeColor={activeLyricColor}
                                            inactiveColor={inactiveLyricColor}
                                          />
                                        </div>
                                      ) : (settings.useKaraokeLyric && ((currentTime + (settings.lyricOffset || 0)) >= line.begin && (currentTime + (settings.lyricOffset || 0)) < (line.originalEnd || line.end))) ? (
                                        <div
                                          style={{
                                            fontSize: '0.48em',
                                            pointerEvents: 'none',
                                            textAlign: textAlignment,
                                            transition: 'color 0.5s ease',
                                            marginTop: '0.1em',
                                          }}
                                        >
                                          <PronunciationKaraokeLyricLine
                                            text={line.backgroundPronunciationText || (line.backgroundPronunciationWords ? line.backgroundPronunciationWords.map(w => w.text).join(' ') : '')}
                                            progressPercentage={
                                              (() => {
                                                const now = currentTime + (settings.lyricOffset || 0);
                                                const end = (line.originalEnd || line.end);
                                                if (now <= line.begin) return 0;
                                                if (now >= end) return 100;
                                                return ((now - line.begin) / (end - line.begin)) * 100;
                                              })()
                                            }
                                            resolvedTheme={resolvedTheme}
                                            isActive={((currentTime + (settings.lyricOffset || 0)) >= line.begin && (currentTime + (settings.lyricOffset || 0)) < (line.originalEnd || line.end))}
                                            progressDirection={settings.lyricProgressDirection}
                                            activeColor={settings.useCustomColors ? activeLyricColor : undefined}
                                            inactiveColor={settings.useCustomColors ? inactiveLyricColor : undefined}
                                          />
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            fontSize: '0.48em',
                                            color: (() => {
                                              const begin = line.begin;
                                              const end = (line.originalEnd || line.end);
                                              const active = isDisplaying || ((currentTime + (settings.lyricOffset || 0)) >= begin && (currentTime + (settings.lyricOffset || 0)) < end);
                                              if (settings.useCustomColors) {
                                                return active ? activeLyricColor : inactiveLyricColor;
                                              }
                                              const dark = active ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.3)';
                                              const light = active ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.3)';
                                              return resolvedTheme === 'dark' ? dark : light;
                                            })(),
                                            pointerEvents: 'none',
                                            textAlign: textAlignment,
                                            transition: 'color 0.5s ease',
                                            marginTop: '0.1em',
                                          }}
                                        >
                                          <LineBreaker text={line.backgroundPronunciationText || (line.backgroundPronunciationWords ? line.backgroundPronunciationWords.map(w => w.text).join(' ') : '')} />
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                                {settings.showTranslation && (
                                  ((line.backgroundTranslationWords1 && line.backgroundTranslationWords1.length > 0) ||
                                    (typeof line.backgroundTranslationText1 === 'string' && line.backgroundTranslationText1.trim() !== '') ||
                                    (line.backgroundTranslationWords2 && line.backgroundTranslationWords2.length > 0) ||
                                    (typeof line.backgroundTranslationText2 === 'string' && line.backgroundTranslationText2.trim() !== '')) && (
                                    <>
                                      {(line.backgroundTranslationWords1 || line.backgroundTranslationText1) && (
                                        <div
                                          style={{
                                            fontSize: {
                                              small: '1.1rem',
                                              medium: '1.3rem',
                                              large: '1.9rem',
                                            }[settings.fontSize],
                                            pointerEvents: 'none',
                                            textAlign: textAlignment,
                                            marginTop: '0.15em',
                                            transition: 'color 0.5s ease',
                                            opacity: 0.6,
                                          }}
                                        >
                                        {settings.useWordTiming && line.backgroundTranslationWords1 && line.backgroundTranslationWords1.length > 0 ? (
                                          <TranslationWordTimingLyricLine
                                            backgroundWords={line.backgroundTranslationWords1}
                                            currentTime={currentTime + (settings.lyricOffset || 0)}
                                            resolvedTheme={resolvedTheme}
                                            progressDirection={settings.lyricProgressDirection}
                                            fontSize={settings.fontSize}
                                            karaokeEnabled={settings.useKaraokeLyric}
                                            persistActive={isDisplaying}
                                            disableGradient
                                            activeColor={activeLyricColor}
                                            inactiveColor={inactiveLyricColor}
                                          />
                                        ) : (
                                          <span style={{ whiteSpace: 'pre-wrap' }}>
                                            <LineBreaker text={line.backgroundTranslationText1 || ''} />
                                          </span>
                                        )}
                                        </div>
                                      )}
                                      {(line.backgroundTranslationWords2 || line.backgroundTranslationText2) && (
                                        <div
                                          style={{
                                            fontSize: {
                                              small: '1.2rem',
                                              medium: '1.5rem',
                                              large: '2.0rem',
                                            }[settings.fontSize],
                                            fontWeight: 'bold',
                                            pointerEvents: 'none',
                                            textAlign: (settings.useKaraokeLyric && settings.useWordTiming) ? 'left' : textAlignment,
                                            marginTop: '0.15em',
                                            transition: 'color 0.5s ease',
                                            opacity: 0.6,
                                          }}
                                        >
                                        {settings.useWordTiming && line.backgroundTranslationWords2 && line.backgroundTranslationWords2.length > 0 ? (
                                          <TranslationWordTimingLyricLine
                                            backgroundWords={line.backgroundTranslationWords2}
                                            currentTime={currentTime + (settings.lyricOffset || 0)}
                                            resolvedTheme={resolvedTheme}
                                            progressDirection={settings.lyricProgressDirection}
                                            fontSize={settings.fontSize}
                                            karaokeEnabled={settings.useKaraokeLyric}
                                            persistActive={isDisplaying}
                                            disableGradient
                                            activeColor={activeLyricColor}
                                            inactiveColor={inactiveLyricColor}
                                          />
                                        ) : (
                                          <span style={{ whiteSpace: 'pre-wrap' }}>
                                            <LineBreaker text={line.backgroundTranslationText2 || ''} />
                                          </span>
                                        )}
                                        </div>
                                      )}
                                    </>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </span>
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
