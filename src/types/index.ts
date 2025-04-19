export interface LyricLine {
  time: number;
  text: string;
}

export interface Settings {
  showplayercontrol: boolean;
  fullplayer: boolean;
  fontSize: 'small' | 'medium' | 'large';
  lyricposition: 'left' | 'center' | 'right';
  backgroundblur: 'none' | 'small' | 'medium' | 'large';
  backgroundtransparency: 'none' | 'small' | 'medium' | 'large';
  theme: 'system' | 'dark' | 'light';
  playerposition: 'left' | 'center' | 'right';
  volume: number;
  lyricOffset: number;
  useKaraokeLyric: boolean;
  lyricProgressDirection: 'rtl' | 'ltr' | 'btt' | 'ttb';
  CustomEasing: string;
  scrollPositionOffset: number;
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
  renderInterludeDots: (startTime: number, endTime: number) => JSX.Element | null;
  smoothScrollTo: (
    element: HTMLElement,
    to: number,
    duration: number
  ) => void;
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