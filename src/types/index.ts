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
}

export interface BackgroundWordTimingLyricLineProps {
  backgroundWords: TTMLWord[];
  currentTime: number;
  resolvedTheme: string;
  progressDirection: 'rtl' | 'ltr' | 'btt' | 'ttb';
  fontSize: 'small' | 'medium' | 'large';
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
  useTTML?: boolean;
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