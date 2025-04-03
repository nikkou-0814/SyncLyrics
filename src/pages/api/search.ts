import type { NextApiRequest, NextApiResponse } from 'next/types';
import axios from 'axios';
import { SearchQuery, SearchResult, LrcLibSearchResponseItem } from '@/types';

type LrcLibSearchResponse = LrcLibSearchResponseItem[];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { q, track_name, artist_name, album_name, service } = req.query as SearchQuery;

    if (!q && !track_name) {
      res.status(400).json({ error: 'クエリパラメータ "q" または "track_name" のいずれかを指定してください' });
      return;
    }

    if (service === 'KuGou') {
      // KuGou
      const keyword = q ? q : `${track_name} ${artist_name ? artist_name : ''}`.trim();
      const encodedKeyword = encodeURIComponent(keyword);
      const kugouUrl = `https://mobileservice.kugou.com/api/v3/search/song?version=9108&plat=0&pagesize=8&showtype=0&keyword=${encodedKeyword}`;

      const response = await axios.get(kugouUrl);
      if (response.status === 200) {
        const data = response.data;
        if (!data.data || !data.data.info) {
          res.status(404).json({ error: 'KuGou 検索結果が見つかりませんでした' });
          return;
        }
        const results: SearchResult[] = data.data.info.map((item: { songname: string; singername: string; album_name?: string; duration: number; hash?: string; album_id?: string }, idx: number) => ({
          id: idx,
          trackName: item.songname,
          artistName: item.singername,
          albumName: item.album_name || '',
          duration: item.duration,
          hash: item.hash,
          album_id: item.album_id,
        }));
        res.status(200).json({ results });
      } else {
        res.status(500).json({ error: 'KuGou 検索に失敗しました' });
      }
      return;
    }

    // lrclib
    const params: SearchQuery = {};
    if (q) {
      params.q = q;
    }
    if (track_name) {
      params.track_name = track_name;
    }
    if (artist_name) {
      params.artist_name = artist_name;
    }
    if (album_name) {
      params.album_name = album_name;
    }

    const headers = {
      'User-Agent': 'LyricsSyncApp/1.0 (https://lrclib.net/api/search)',
    };

    const response = await axios.get<LrcLibSearchResponse>('https://lrclib.net/api/search', {
      params,
      headers,
    });

    if (response.status === 200) {
      const data: LrcLibSearchResponse = response.data;
      if (!Array.isArray(data)) {
        console.error('Unexpected response format:', data);
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
    if (axios.isAxiosError(error)) {
      console.error('Error during search:', error.message);
      if (error.response && error.response.data) {
        res.status(error.response.status).json({ error: error.response.data.message || 'APIエラーが発生しました' });
      } else {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
      }
    } else if (error instanceof Error) {
      console.error('Unexpected error:', error.message);
      res.status(500).json({ error: 'サーバーエラーが発生しました' });
    } else {
      console.error('Unknown error:', error);
      res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
  }
}
