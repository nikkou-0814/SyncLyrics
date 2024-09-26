import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface SearchRequestBody {
  track_name: string;
  artist_name: string;
  album_name?: string;
  duration: number;
}

interface LyricLine {
  time: number;
  text: string;
}

interface LrcLibResponse {
  syncedLyrics: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'このエンドポイントは POST メソッドのみをサポートしています' });
    return;
  }

  try {
    const { track_name, artist_name, album_name, duration } = req.body as SearchRequestBody;

    console.log('Received data:', { track_name, artist_name, album_name, duration });

    if (!track_name || !artist_name || typeof duration !== 'number') {
      res.status(400).json({ error: '必要なトラック情報が不足しています' });
      return;
    }

    const params: SearchRequestBody = {
      track_name,
      artist_name,
      duration,
    };

    if (album_name) {
      params.album_name = album_name;
    }

    console.log('Sending request to lrclib.net with params:', params);

    const response = await axios.get<LrcLibResponse>('https://lrclib.net/api/get', { params });

    console.log('Received response from lrclib.net:', response.data);

    if (response.status === 200) {
      const data = response.data;
      const syncedLyrics = data.syncedLyrics;

      if (!syncedLyrics) {
        res.status(404).json({ error: '同期歌詞が見つかりませんでした' });
        return;
      }

      const lyricsData: LyricLine[] = [];
      const lines = syncedLyrics.trim().split('\n');
      const regex = /^\s*\[(\d+):(\d+\.\d+)\](.*)?$/;

      console.log('Parsing syncedLyrics:', lines);

      for (const line of lines) {
        const match = line.match(regex);
        if (match) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseFloat(match[2]);
          const text = match[3] ? match[3].trim() : '';
          const time = minutes * 60 + seconds;
          lyricsData.push({ time, text });
        }
      }

      console.log('Parsed lyricsData:', lyricsData);

      res.status(200).json({ lyricsData });
    } else {
      res.status(404).json({ error: '歌詞が見つかりませんでした' });
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching lyrics:', error.message);
      if (error.response && error.response.status === 404) {
        res.status(404).json({ error: '歌詞が見つかりませんでした' });
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
