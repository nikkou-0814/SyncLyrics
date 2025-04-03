import type { NextApiRequest, NextApiResponse } from 'next/types';
import axios from 'axios';
import { SearchRequestBody, LyricLine, LrcLibResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'このエンドポイントは POST メソッドのみをサポートしています' });
    return;
  }

  try {
    const { track_name, artist_name, album_name, duration, service, hash, album_id } = req.body as SearchRequestBody;

    console.log('KuGou data:', { track_name, artist_name, album_name, duration, service, hash, album_id });

    if (!track_name || !artist_name || typeof duration !== 'number') {
      res.status(400).json({ error: '必要なトラック情報が不足しています' });
      return;
    }

    if (service === 'KuGou') {
      if (!hash) {
        res.status(400).json({ error: 'KuGou の歌詞取得には hash が必要です' });
        return;
      }
      // 候補情報の取得
      const searchUrl = `https://krcs.kugou.com/search?ver=1&man=yes&client=mobi&hash=${hash}`;
      const candidateResponse = await axios.get(searchUrl);
      if (candidateResponse.status !== 200) {
        res.status(500).json({ error: 'KuGou 候補情報の取得に失敗しました' });
        return;
      }
      const candidateJson = candidateResponse.data;
      if (!candidateJson.candidates || candidateJson.candidates.length === 0) {
        res.status(404).json({ error: 'KuGou で歌詞候補が見つかりませんでした' });
        return;
      }
      const { id, accesskey } = candidateJson.candidates[0];
      
      // 歌詞データの取得
      const downloadUrl = `https://krcs.kugou.com/download?ver=1&man=yes&client=pc&fmt=lrc&id=${id}&accesskey=${accesskey}`;
      const lyricResponse = await axios.get(downloadUrl);
      if (lyricResponse.status !== 200) {
        res.status(500).json({ error: 'KuGou からの歌詞ダウンロードに失敗しました' });
        return;
      }
      const lyricJson = lyricResponse.data;
      if (!lyricJson.content) {
        res.status(404).json({ error: 'KuGou から歌詞が返されませんでした' });
        return;
      }
      // Base64デコードし LRC 形式テキストを取得
      const base64Content = lyricJson.content;
      const buffer = Buffer.from(base64Content, 'base64');
      const decodedLRC = buffer.toString('utf-8');

      // LRC 形式テキストをパースし { time, text } 配列に変換
      const lyricsData: LyricLine[] = [];
      const lines = decodedLRC.split(/\r?\n/);
      const timeReg = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;

      for (const line of lines) {
        const match = line.match(timeReg);
        if (match) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const fraction = match[3] ? parseInt(match[3], 10) : 0;
          const totalTime = minutes * 60 + seconds + fraction / (match[3]?.length === 3 ? 1000 : 100);
          const text = line.replace(timeReg, '').trim();
          lyricsData.push({ time: totalTime, text });
        }
      }

      console.log('KuGou lyricsData:', lyricsData);
      res.status(200).json({ lyricsData });
      return;
    } else {
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
      console.log('lrclib data:', response.data);

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

        console.log('lrclib lyricsData:', lyricsData);
        res.status(200).json({ lyricsData });
      } else {
        res.status(404).json({ error: '歌詞が見つかりませんでした' });
      }
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
