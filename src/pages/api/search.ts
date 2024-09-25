import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface SearchQuery {
  q?: string;
  track_name?: string;
  artist_name?: string;
  album_name?: string;
}

interface SearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
}

interface LrcLibSearchResponseItem {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration: number;
}

type LrcLibSearchResponse = LrcLibSearchResponseItem[];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { q, track_name, artist_name, album_name } = req.query as SearchQuery;

    if (!q && !track_name) {
      res.status(400).json({ error: 'クエリパラメータ "q" または "track_name" のいずれかを指定してください' });
      return;
    }

    const params: SearchQuery = {};
    if (q) params.q = q;
    if (track_name) params.track_name = track_name;
    if (artist_name) params.artist_name = artist_name;
    if (album_name) params.album_name = album_name;

    const headers = { 'User-Agent': 'LyricsSyncApp/1.0 (https://your-app-url.com)' };

    const response = await axios.get<LrcLibSearchResponse>('https://lrclib.net/api/search', { params, headers });

    if (response.status === 200) {
      const data: LrcLibSearchResponse = response.data;

      if (!Array.isArray(data)) {
        res.status(500).json({ error: '予期しないAPIレスポンス形式です' });
        return;
      }

      const results: SearchResult[] = data.map((item: LrcLibSearchResponseItem) => ({
        id: item.id,
        trackName: item.trackName,
        artistName: item.artistName,
        albumName: item.albumName || '',
        duration: item.duration,
      }));

      res.status(200).json({ results });
    } else {
      res.status(500).json({ error: '検索に失敗しました' });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error during search:', error.message);
      res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
  }
}
