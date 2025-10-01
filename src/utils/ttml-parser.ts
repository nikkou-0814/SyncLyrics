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
    
    let songwriter: string | undefined;
    const itunesMetadata = xmlDoc.querySelector('metadata');
    if (itunesMetadata) {
      const songwriters = Array.from(itunesMetadata.querySelectorAll('songwriter'));
      if (songwriters.length > 0) {
        songwriter = songwriters.map(sw => sw.textContent || '').filter(Boolean).join(' & ');
      }
    }
    
    if (!songwriter) {
      songwriter = xmlDoc.querySelector('songwriter')?.textContent || undefined;
    }
    const agents = Array.from(xmlDoc.querySelectorAll('metadata ttm\\:agent')).map(agent => {
      return {
        id: agent.getAttribute('xml:id') || '',
        name: agent.querySelector('ttm\\:name')?.textContent || '',
        type: agent.getAttribute('type') || ''
      };
    });

    const ITUNES_NS = 'http://music.apple.com/lyric-ttml-internal';
    const TT_NS = 'http://www.w3.org/ns/ttml';

    const collectSpanWords = (textEl: Element): TTMLWord[] => {
      const spans = Array.from(textEl.getElementsByTagNameNS(TT_NS, 'span'));
      const words: TTMLWord[] = [];
      spans.forEach(sp => {
        const begin = parseTime(sp.getAttribute('begin') || '0');
        const end = parseTime(sp.getAttribute('end') || '0');
        const txt = (sp.textContent || '').trim();
        if (txt.length) {
          words.push({ begin, end, text: txt });
        }
      });
      return words;
    };

    const addSpaceBetweenLanguages = (wordList: TTMLWord[]): string => {
      let result = '';
      let prevIsLatin = false;
      for (let i = 0; i < wordList.length; i++) {
        const text = wordList[i].text || '';
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

    const collectTranslitWords = (textEl: Element): { main: TTMLWord[]; bg: TTMLWord[] } => {
      const spans = Array.from(textEl.getElementsByTagNameNS(TT_NS, 'span'));
      const main: TTMLWord[] = [];
      const bg: TTMLWord[] = [];
      spans.forEach(sp => {
        let isBg = false;
        let node: Node | null = sp;
        while (node && node instanceof Element && node !== textEl) {
          const role = (node as Element).getAttribute('ttm:role');
          if (role === 'x-bg') { isBg = true; break; }
          node = (node as Element).parentNode as (Node | null);
        }
        let txt = (sp.textContent || '').trim();
        if (!txt) return;
        if (isBg) {
          txt = txt.replace(/[()（）]/g, '');
        }
        const begin = parseTime(sp.getAttribute('begin') || '0');
        const end = parseTime(sp.getAttribute('end') || '0');
        const word = { begin, end, text: txt };
        (isBg ? bg : main).push(word);
      });
      return { main, bg };
    };

    const collectTranslitPlainTextByRole = (el: Element): { main: string; bg: string } => {
      let main = '';
      let bg = '';
      const walk = (node: Node, inBg: boolean) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = (node.textContent || '');
          if (t.trim().length === 0) return;
          if (inBg) {
            bg += t.replace(/[()（）]/g, '');
          } else {
            main += t;
          }
          return;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          const e = node as Element;
          const role = e.getAttribute('ttm:role');
          const nextInBg = inBg || role === 'x-bg';
          e.childNodes.forEach(child => walk(child, nextInBg));
        }
      };
      walk(el, false);
      return { main: main.trim(), bg: bg.trim() };
    };

    const translitMap = new Map<string, TTMLWord[]>();
    const translitTextMap = new Map<string, string>();
    const translitBGMap = new Map<string, TTMLWord[]>();
    const translitBGTextMap = new Map<string, string>();
    const translationsMap = new Map<string, { lang: string; words: TTMLWord[]; text: string }[]>();

    try {
      const iTunesNode =
        xmlDoc.getElementsByTagNameNS(ITUNES_NS, 'iTunesMetadata')[0] ||
        (xmlDoc.querySelector('iTunesMetadata') as Element | undefined);

      if (iTunesNode) {
        const translitsParent = iTunesNode.getElementsByTagNameNS(ITUNES_NS, 'transliterations')[0];
        if (translitsParent) {
          const translits = Array.from(translitsParent.getElementsByTagNameNS(ITUNES_NS, 'transliteration'));
          translits.forEach(tr => {
            const texts = Array.from(tr.getElementsByTagNameNS(ITUNES_NS, 'text'));
            texts.forEach(t => {
              const forKey = t.getAttribute('for') || '';
              if (!forKey) return;

              const { main, bg } = collectTranslitWords(t);
              const plainByRole = collectTranslitPlainTextByRole(t);

              if (main.length > 0) {
                if (!translitMap.has(forKey)) {
                  translitMap.set(forKey, main);
                  translitTextMap.set(forKey, addSpaceBetweenLanguages(main));
                }
              } else if (plainByRole.main) {
                if (!translitTextMap.has(forKey)) {
                  translitTextMap.set(forKey, plainByRole.main);
                }
              }

              if (bg.length > 0) {
                if (!translitBGMap.has(forKey)) {
                  translitBGMap.set(forKey, bg);
                  translitBGTextMap.set(forKey, addSpaceBetweenLanguages(bg));
                }
              } else if (plainByRole.bg) {
                if (!translitBGTextMap.has(forKey)) {
                  translitBGTextMap.set(forKey, plainByRole.bg);
                }
              }
            });
          });
        }

        const translationsParent = iTunesNode.getElementsByTagNameNS(ITUNES_NS, 'translations')[0];
        if (translationsParent) {
          const texts = Array.from(translationsParent.getElementsByTagNameNS(ITUNES_NS, 'text'));
          texts.forEach(t => {
            const forKey = t.getAttribute('for') || '';
            const lang = t.getAttribute('xml:lang') || '';
            if (!forKey) return;
            let words = collectSpanWords(t);
            if (words.length === 0) {
              const spansAny = Array.from(t.getElementsByTagName('span'));
              const tmp: TTMLWord[] = [];
              spansAny.forEach(sp => {
                const beginStr = sp.getAttribute('begin');
                const endStr = sp.getAttribute('end');
                const txt = (sp.textContent || '').trim();
                if ((beginStr || endStr) && txt.length) {
                  const begin = parseTime(beginStr || '0');
                  const end = parseTime(endStr || '0');
                  tmp.push({ begin, end, text: txt });
                }
              });
              words = tmp;
            }
            const textJoined = words.length > 0
              ? addSpaceBetweenLanguages(words)
              : (t.textContent || '').trim();
            const arr = translationsMap.get(forKey) || [];
            arr.push({ lang, words, text: textJoined });
            translationsMap.set(forKey, arr);
          });
        }
      }
    } catch {
      return null;
    }
    
    const divs = Array.from(xmlDoc.querySelectorAll('body div')).map(div => {
      const begin = parseTime(div.getAttribute('begin') || '0');
      const end = parseTime(div.getAttribute('end') || '0');
      const lines = Array.from(div.querySelectorAll('p')).map(p => {
        const pBegin = parseTime(p.getAttribute('begin') || '0');
        const pEnd = parseTime(p.getAttribute('end') || '0');
        const agent = p.getAttribute('ttm:agent') || undefined;
        const itunesKey = p.getAttribute('itunes:key') || undefined;
        
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
              let text = node.textContent;
              
              if (isBackgroundParent) {
                text = text.replace(/[()（）]/g, '');
              }
              
              const wordObj = {
                begin: parseTime(parentElement.getAttribute('begin') || '0'),
                end: parseTime(parentElement.getAttribute('end') || '0'),
                text: text
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
                  let text = span.textContent || '';
                  
                  if (isBackground) {
                    text = text.replace(/[()（）]/g, '');
                  }
                  
                  const wordObj = {
                    begin: parseTime(span.getAttribute('begin') || '0'),
                    end: parseTime(span.getAttribute('end') || '0'),
                    text: text
                  };
                  
                  if (isBackground) {
                    backgroundWords.push(wordObj);
                  } else {
                    words.push(wordObj);
                  }
                }
              } else {
                let text = span.textContent || '';
                
                if (isBackground) {
                  text = text.replace(/[()（）]/g, '');
                }
                
                const wordObj = {
                  begin: parseTime(span.getAttribute('begin') || '0'),
                  end: parseTime(span.getAttribute('end') || '0'),
                  text: text
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

        const joinWords = (list: TTMLWord[], isBackground = false): string => {
          const normalized = isBackground
            ? list.map(w => ({ ...w, text: (w.text || '').replace(/[()（）]/g, '') }))
            : list;
          return addSpaceBetweenLanguages(normalized);
        };
        
        if (directSpans.length > 0) {
          const { words, backgroundWords } = processSpans(p);
          const text = joinWords(words);
          const backgroundText = backgroundWords.length > 0 ? joinWords(backgroundWords, true) : undefined;

          const lineObj: TTMLLine = {
            begin: pBegin,
            end: pEnd,
            text,
            agent,
            words,
            backgroundWords: backgroundWords.length > 0 ? backgroundWords : undefined,
            backgroundText,
            backgroundPosition,
            timing: 'Word',
            itunesKey
          };

          if (itunesKey) {
            if (translitMap.has(itunesKey) && (translitMap.get(itunesKey) || []).length > 0) {
              const pw = translitMap.get(itunesKey)!;
              lineObj.pronunciationWords = pw;
              lineObj.pronunciationText = addSpaceBetweenLanguages(pw);
            } else if (translitTextMap.has(itunesKey)) {
              lineObj.pronunciationText = translitTextMap.get(itunesKey)!;
            }

            if (translitBGMap.has(itunesKey) && (translitBGMap.get(itunesKey) || []).length > 0) {
              const bpw = translitBGMap.get(itunesKey)!;
              lineObj.backgroundPronunciationWords = bpw;
              lineObj.backgroundPronunciationText = addSpaceBetweenLanguages(bpw);
            } else if (translitBGTextMap.has(itunesKey)) {
              lineObj.backgroundPronunciationText = translitBGTextMap.get(itunesKey)!;
            }
          }
          if (itunesKey && translationsMap.has(itunesKey)) {
            const arr = translationsMap.get(itunesKey)!;
            if (arr[0]) {
              lineObj.translationWords1 = arr[0].words;
              lineObj.translationText1 = arr[0].text;
            }
            if (arr[1]) {
              lineObj.translationWords2 = arr[1].words;
              lineObj.translationText2 = arr[1].text;
            }
          }

          return lineObj as TTMLLine;
        } else {
          const baseText = p.textContent || '';
          const lineObj: TTMLLine = {
            begin: pBegin,
            end: pEnd,
            text: baseText,
            agent,
            timing: 'Line',
            itunesKey
          };

          if (itunesKey) {
            if (translitMap.has(itunesKey) && (translitMap.get(itunesKey) || []).length > 0) {
              const pw = translitMap.get(itunesKey)!;
              lineObj.pronunciationWords = pw;
              lineObj.pronunciationText = addSpaceBetweenLanguages(pw);
            } else if (translitTextMap.has(itunesKey)) {
              lineObj.pronunciationText = translitTextMap.get(itunesKey)!;
            }

            if (translitBGMap.has(itunesKey) && (translitBGMap.get(itunesKey) || []).length > 0) {
              const bpw = translitBGMap.get(itunesKey)!;
              lineObj.backgroundPronunciationWords = bpw;
              lineObj.backgroundPronunciationText = addSpaceBetweenLanguages(bpw);
            } else if (translitBGTextMap.has(itunesKey)) {
              lineObj.backgroundPronunciationText = translitBGTextMap.get(itunesKey)!;
            }
          }
          if (itunesKey && translationsMap.has(itunesKey)) {
            const arr = translationsMap.get(itunesKey)!;
            if (arr[0]) {
              lineObj.translationWords1 = arr[0].words;
              lineObj.translationText1 = arr[0].text;
            }
            if (arr[1]) {
              lineObj.translationWords2 = arr[1].words;
              lineObj.translationText2 = arr[1].text;
            }
          }

          return lineObj as TTMLLine;
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
