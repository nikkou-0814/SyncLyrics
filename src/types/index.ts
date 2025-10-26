export interface LyricLine {
  time: number;
  text: string;
}

export interface TTMLAgent {
  id: string;
  type: 'person' | 'group' | 'other';
  name?: string;
}

export interface TTMLSpan {
  begin: number;
  end: number;
  text: string;
  agent?: string;
  isBackground?: boolean;
  role?: string;
}

export interface TTMLWord {
  begin: number;
  end: number;
  text: string;
}

export interface TTMLLine {
  begin: number;
  end: number;
  agent?: string;
  spans?: TTMLSpan[];
  text?: string;
  words?: TTMLWord[];
  backgroundWords?: TTMLWord[];
  backgroundText?: string;
  backgroundPosition?: 'above' | 'below';
  timing?: 'Line' | 'Word';
  groupEnd?: number;
  originalEnd?: number;
  itunesKey?: string;
  pronunciationWords?: TTMLWord[];
  pronunciationText?: string;
  backgroundPronunciationWords?: TTMLWord[];
  backgroundPronunciationText?: string;
  translationWords1?: TTMLWord[];
  translationText1?: string;
  translationWords2?: TTMLWord[];
  translationText2?: string;
  backgroundTranslationWords1?: TTMLWord[];
  backgroundTranslationText1?: string;
  backgroundTranslationWords2?: TTMLWord[];
  backgroundTranslationText2?: string;
}

export interface TTMLDiv {
  begin: number;
  end: number;
  songPart?: string;
  lines: TTMLLine[];
}

export interface TTMLData {
  title?: string;
  artists?: string[];
  songwriter?: string;
  language?: string;
  duration?: number;
  agents: {
    id: string;
    name: string;
    type: string;
  }[];
  divs: {
    begin: number;
    end: number;
    lines: TTMLLine[];
  }[];
  timing?: 'Line' | 'Word';
}

export interface WordTimingKaraokeLyricLineProps {
  line: TTMLLine;
  currentTime: number;
  resolvedTheme: string;
  progressDirection: 'rtl' | 'ltr' | 'btt' | 'ttb';
  isActive: boolean;
  isPast?: boolean;
  showPronunciation?: boolean;
  activeColor?: string;
  inactiveColor?: string;
}

export interface BackgroundWordTimingLyricLineProps {
  backgroundWords: TTMLWord[];
  currentTime: number;
  resolvedTheme: string;
  progressDirection: 'rtl' | 'ltr' | 'btt' | 'ttb';
  fontSize: 'small' | 'medium' | 'large';
  pronunciationWords?: TTMLWord[];
  showPronunciation?: boolean;
  activeColor?: string;
  inactiveColor?: string;
}

export interface Settings {
  showplayercontrol: boolean;
  fullplayer: boolean;
  fontSize: 'small' | 'medium' | 'large';
  lyricposition: 'left' | 'center' | 'right';
  backgroundblur: number;
  backgroundtransparency: number;
  theme: 'system' | 'dark' | 'light';
  playerposition: 'left' | 'center' | 'right';
  volume: number;
  lyricOffset: number;
  useKaraokeLyric: boolean;
  lyricProgressDirection: 'rtl' | 'ltr' | 'btt' | 'ttb';
  CustomEasing: string;
  scrollPositionOffset: number;
  useWordTiming: boolean;
  useAMLL?: boolean;
  amllEnableSpring?: boolean;
  amllEnableBlur?: boolean;
  amllEnableScale?: boolean;
  amllHidePassedLines?: boolean;
  amllSpringParams?: {
    mass?: number;
    tension?: number;
    friction?: number;
  };
  showPronunciation?: boolean;
  showTranslation?: boolean;
  useCustomColors: boolean;
  activeLyricColor: string;
  inactiveLyricColor: string;
  interludeDotsColor: string;
}

export interface PlayerLyricsProps {
  lyricsData: LyricLine[];
  currentTime: number;
  duration: number;
  currentLineIndex: number;
  isMobile: boolean;
  settings: Settings;
  resolvedTheme: string;
  onLyricClick: (time: number) => void;
  renderInterludeDots: (startTime: number, endTime: number, alignment?: 'left' | 'center' | 'right') => JSX.Element | null;
  smoothScrollTo: (
    element: HTMLElement,
    to: number,
    duration: number
  ) => void;
  ttmlData?: TTMLData;
}

export interface KaraokeLyricLineProps {
  text: string;
  progressPercentage: number;
  resolvedTheme: string;
  isActive: boolean;
  progressDirection: 'rtl' | 'ltr' | 'btt' | 'ttb';
  activeColor?: string;
  inactiveColor?: string;
}

export interface PlayerProps {
  lyricsData: LyricLine[];
  audioUrl: string;
  trackName: string;
  albumName: string;
  artistName: string;
  onBack: () => void;
  ttmlData?: TTMLData;
}

export interface PlayerControlsProps {
  isPlaying: boolean;
  togglePlayPause: () => void;
  handleSkipBack: () => void;
  handleSkipForward: () => void;
  volume: number;
  handleVolumeChange: (value: number[]) => void;
  handleProgressChange: (value: number[]) => void;
  currentTime: number;
  duration: number;
  isMobile: boolean;
  trackName: string;
  artistName: string;
  albumName: string;
  settings: {
    playerposition: string;
    fullplayer: boolean;
    showplayercontrol: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  formatTime: (time: number) => string;
  mobileControlsVisible?: boolean;
  onMobileControlsToggle?: () => void;
}

export interface SearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  hash?: string | null;
  album_id?: string | null;
}

export interface ErrorState {
  message: string;
  advice: string;
}

export interface SearchQuery {
  q?: string;
  track_name?: string;
  artist_name?: string;
  album_name?: string;
  service?: string;
}

export interface LrcLibSearchResponseItem {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration: number;
}

export interface SearchRequestBody {
  track_name: string;
  artist_name: string;
  album_name?: string;
  duration: number;
  service?: string;
  hash?: string | null;
  album_id?: string | null;
}

export interface LrcLibResponse {
  syncedLyrics: string;
}

export interface SettingsSidebarProps {
  showSettings: boolean;
  setShowSettings: (value: boolean) => void;
  settings: Settings;
  handleSettingChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  isMobile: boolean;
}

export interface AMLLLyricsProps {
  ttmlData: TTMLData;
  currentTime: number;
  settings: Settings;
  onLyricClick: (time: number) => void;
  isMobile: boolean;
  isPlaying: boolean;
  resolvedTheme: string;
}

export interface PlayerState {
  mode: "lrc" | "ttml";
  lyricsData: LyricLine[];
  audioUrl: string;
  selectedTrack: SearchResult;
  ttmlData?: TTMLData | null;
}

export interface PlaybackHistoryEntry {
  id: string;
  mode: PlayerState["mode"];
  playerState: PlayerState;
  youtubeUrl: string;
  videoId: string;
  trackName: string;
  artistName: string;
  firstLine: string;
  lyricsSignature: string;
  lyricsSnapshot: string;
  lyricTiming: 'line' | 'word';
  createdAt: string;
  backgroundLyricsSnapshot?: string;
}

export type SimpleKaraokeProps = {
  text: string;
  progressPercentage: number;
  resolvedTheme: string;
  isActive: boolean;
  progressDirection: 'ltr' | 'rtl' | 'ttb' | 'btt';
  activeColor?: string;
  inactiveColor?: string;
};

export type TranslationWordTimingLyricLineProps = BackgroundWordTimingLyricLineProps & {
  karaokeEnabled?: boolean;
  persistActive?: boolean;
  disableGradient?: boolean;
};

export type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type ColorWithAlphaPickerProps = {
  label: string;
  value: string;
  onChange: (newColor: string) => void;
};

export type ColorPickerProps = {
  label: string;
  value: string;
  onChange: (newColor: string) => void;
};

export type HistoryDisplayItem = {
  entry: PlaybackHistoryEntry;
  displayLine: string;
  highlightRange: { start: number; end: number } | null;
  trackHighlightRange: { start: number; end: number } | null;
  artistHighlightRange: { start: number; end: number } | null;
};
