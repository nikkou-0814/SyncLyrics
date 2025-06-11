import { TTMLData, TTMLLine, TTMLWord, LyricLine } from '@/types';

export function parseTimeCode(timeCode: string): number {
  const standardRegex = /^(?:(\d+):)?(\d+):(\d+)(?:\.(\d+))?$/;
  const standardMatch = timeCode.match(standardRegex);
  
  if (standardMatch) {
    const hours = standardMatch[1] ? parseInt(standardMatch[1], 10) : 0;
    const minutes = parseInt(standardMatch[2], 10);
    const seconds = parseInt(standardMatch[3], 10);
    const fraction = standardMatch[4] ? parseInt(standardMatch[4].padEnd(3, '0').substring(0, 3), 10) / 1000 : 0;
    
    return hours * 3600 + minutes * 60 + seconds + fraction;
  }
  
  const secondsRegex = /^(\d+)(?:\.(\d+))?$/;
  const secondsMatch = timeCode.match(secondsRegex);
  
  if (secondsMatch) {
    const seconds = parseInt(secondsMatch[1], 10);
    const fraction = secondsMatch[2] ? parseInt(secondsMatch[2].padEnd(3, '0').substring(0, 3), 10) / 1000 : 0;
    
    return seconds + fraction;
  }
  
  console.error('Invalid time code format:', timeCode);
  return 0;
}

export function parseTTML(xmlContent: string): TTMLData | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "application/xml");
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('XMLのパースに失敗しました');
    }
    
    const ttElement = xmlDoc.getElementsByTagNameNS('http://www.w3.org/ns/ttml', 'tt')[0];
    if (!ttElement) {
      throw new Error('TTMLのルート要素が見つかりません');
    }
    
    const itunesTiming = ttElement.getAttribute('itunes:timing');
    const timing = itunesTiming === 'Word' ? 'Word' : 'Line';
    const title = xmlDoc.querySelector('title')?.textContent || undefined;
    const duration = parseDuration(xmlDoc.querySelector('body')?.getAttribute('dur') || '');
    const songwriter = xmlDoc.querySelector('songwriter')?.textContent || undefined;
    const agents = Array.from(xmlDoc.querySelectorAll('metadata ttm\\:agent')).map(agent => {
      return {
        id: agent.getAttribute('xml:id') || '',
        name: agent.querySelector('ttm\\:name')?.textContent || '',
        type: agent.getAttribute('type') || ''
      };
    });
    
    const divs = Array.from(xmlDoc.querySelectorAll('body div')).map(div => {
      const begin = parseTime(div.getAttribute('begin') || '0');
      const end = parseTime(div.getAttribute('end') || '0');
      const lines = Array.from(div.querySelectorAll('p')).map(p => {
        const pBegin = parseTime(p.getAttribute('begin') || '0');
        const pEnd = parseTime(p.getAttribute('end') || '0');
        const agent = p.getAttribute('ttm:agent') || undefined;
        
        const directChildren = Array.from(p.children);
        const firstBgSpanIndex = directChildren.findIndex(
          el => el.tagName.toLowerCase() === 'span' && el.getAttribute('ttm:role') === 'x-bg'
        );
        const firstMainSpanIndex = directChildren.findIndex(
          el => el.tagName.toLowerCase() === 'span' && el.getAttribute('ttm:role') !== 'x-bg'
        );
        
        let backgroundPosition: 'above' | 'below' = 'below';
        if (firstBgSpanIndex !== -1 && firstMainSpanIndex !== -1) {
          backgroundPosition = firstBgSpanIndex < firstMainSpanIndex ? 'above' : 'below';
        }
        
        const processSpans = (parentElement: Element, isBackgroundParent = false): { words: TTMLWord[], backgroundWords: TTMLWord[] } => {
          const words: TTMLWord[] = [];
          const backgroundWords: TTMLWord[] = [];
          const childNodes = Array.from(parentElement.childNodes);
          
          for (const node of childNodes) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim() !== '') {
              const wordObj = {
                begin: parseTime(parentElement.getAttribute('begin') || '0'),
                end: parseTime(parentElement.getAttribute('end') || '0'),
                text: node.textContent
              };
              
              if (isBackgroundParent) {
                backgroundWords.push(wordObj);
              } else {
                words.push(wordObj);
              }
            }
            else if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName.toLowerCase() === 'span') {
              const span = node as Element;
              const role = span.getAttribute('ttm:role');
              const isBackground = role === 'x-bg' || isBackgroundParent;
              
              if (span.childNodes.length > 0) {
                const hasChildSpans = Array.from(span.childNodes).some(
                  child => child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toLowerCase() === 'span'
                );
                
                if (hasChildSpans) {
                  const { words: childWords, backgroundWords: childBackgroundWords } = processSpans(span, isBackground);
                  if (isBackground) {
                    backgroundWords.push(...childWords, ...childBackgroundWords);
                  } else {
                    words.push(...childWords);
                    backgroundWords.push(...childBackgroundWords);
                  }
                } else {
                  const wordObj = {
                    begin: parseTime(span.getAttribute('begin') || '0'),
                    end: parseTime(span.getAttribute('end') || '0'),
                    text: span.textContent || ''
                  };
                  
                  if (isBackground) {
                    backgroundWords.push(wordObj);
                  } else {
                    words.push(wordObj);
                  }
                }
              } else {
                const wordObj = {
                  begin: parseTime(span.getAttribute('begin') || '0'),
                  end: parseTime(span.getAttribute('end') || '0'),
                  text: span.textContent || ''
                };
                
                if (isBackground) {
                  backgroundWords.push(wordObj);
                } else {
                  words.push(wordObj);
                }
              }
            }
          }
          
          return { words, backgroundWords };
        };
        
        const directSpans = Array.from(p.children).filter(
          el => el.tagName.toLowerCase() === 'span'
        );
        
        if (directSpans.length > 0) {
          const { words, backgroundWords } = processSpans(p);
          const addSpaceBetweenLanguages = (wordList: TTMLWord[]): string => {
            let result = '';
            let prevIsLatin = false;
            
            for (let i = 0; i < wordList.length; i++) {
              const word = wordList[i];
              const text = word.text || '';
              const isLatin = /^[a-zA-Z0-9]+$/.test(text.trim());

              if (i > 0) {
                if ((prevIsLatin && isLatin) || (prevIsLatin && !isLatin) || (!prevIsLatin && isLatin)) {
                  result += ' ';
                }
              }
              
              result += text;
              prevIsLatin = isLatin;
            }
            return result.trim();
          };
          
          const text = addSpaceBetweenLanguages(words);
          const backgroundText = backgroundWords.length > 0 ? addSpaceBetweenLanguages(backgroundWords) : undefined;
          
          return {
            begin: pBegin,
            end: pEnd,
            text,
            agent,
            words,
            backgroundWords: backgroundWords.length > 0 ? backgroundWords : undefined,
            backgroundText,
            backgroundPosition,
            timing: 'Word' as const
          } as TTMLLine;
        } else {
          return {
            begin: pBegin,
            end: pEnd,
            text: p.textContent || '',
            agent,
            timing: 'Line' as const
          } as TTMLLine;
        }
      });
      
      return { begin, end, lines };
    });
    
    return {
      title,
      duration,
      songwriter,
      agents,
      divs,
      timing
    };
  } catch (error) {
    console.error('TTML解析エラー:', error);
    return null;
  }
}

function parseTime(timeStr: string): number {
  if (!timeStr) return 0;

  const timeRegex = /^(\d+):(\d+):(\d+)\.?(\d*)$/;
  const timeMatch = timeStr.match(timeRegex);
  
  if (timeMatch) {
    const [, hours, minutes, seconds, milliseconds] = timeMatch;
    return (
      parseInt(hours) * 3600 +
      parseInt(minutes) * 60 +
      parseInt(seconds) +
      (milliseconds ? parseInt(milliseconds) / Math.pow(10, milliseconds.length) : 0)
    );
  }
  
  const shortTimeRegex = /^(\d+):(\d+)\.?(\d*)$/;
  const shortTimeMatch = timeStr.match(shortTimeRegex);
  
  if (shortTimeMatch) {
    const [, minutes, seconds, milliseconds] = shortTimeMatch;
    return (
      parseInt(minutes) * 60 +
      parseInt(seconds) +
      (milliseconds ? parseInt(milliseconds) / Math.pow(10, milliseconds.length) : 0)
    );
  }
  
  const secondsOnlyRegex = /^(\d+\.?\d*)$/;
  const secondsMatch = timeStr.match(secondsOnlyRegex);
  
  if (secondsMatch) {
    return parseFloat(secondsMatch[1]);
  }
  
  return 0;
}

function parseDuration(durationStr: string): number {
  if (!durationStr) return 0;
  return parseTime(durationStr);
}

export function convertTTMLToLyricLines(ttmlData: TTMLData): LyricLine[] {
  const lyricLines: LyricLine[] = [];
  
  if (!ttmlData || !ttmlData.divs) {
    return lyricLines;
  }
  
  for (const div of ttmlData.divs) {
    for (const line of div.lines) {
      if (line.text) {
        lyricLines.push({
          time: line.begin,
          text: line.text
        });
      }
    }
  }
  
  lyricLines.sort((a, b) => a.time - b.time);
  
  return lyricLines;
}
