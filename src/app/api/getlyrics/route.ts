import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { SearchRequestBody, LyricLine, LrcLibResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { track_name, artist_name, album_name, duration, service, hash, album_id } = body as SearchRequestBody;

    console.log('KuGou data:', { track_name, artist_name, album_name, duration, service, hash, album_id });

    if (!track_name || !artist_name || typeof duration !== 'number') {
      return NextResponse.json(
        { error: '必要なトラック情報が不足しています' },
        { status: 400 }
      );
    }

    if (service === 'KuGou') {
      if (!hash) {
        return NextResponse.json(
          { error: 'KuGou の歌詞取得には hash が必要です' },
          { status: 400 }
        );
      }
      // 候補情報の取得
      const searchUrl = `https://krcs.kugou.com/search?ver=1&man=yes&client=mobi&hash=${hash}`;
      const candidateResponse = await axios.get(searchUrl);
      if (candidateResponse.status !== 200) {
        return NextResponse.json(
          { error: 'KuGou 候補情報の取得に失敗しました' },
          { status: 500 }
        );
      }
      const candidateJson = candidateResponse.data;
      if (!candidateJson.candidates || candidateJson.candidates.length === 0) {
        return NextResponse.json(
          { error: 'KuGou で歌詞候補が見つかりませんでした' },
          { status: 404 }
        );
      }
      const { id, accesskey } = candidateJson.candidates[0];
      
      // 歌詞データの取得
      const downloadUrl = `https://krcs.kugou.com/download?ver=1&man=yes&client=pc&fmt=lrc&id=${id}&accesskey=${accesskey}`;
      const lyricResponse = await axios.get(downloadUrl);
      if (lyricResponse.status !== 200) {
        return NextResponse.json(
          { error: 'KuGou からの歌詞ダウンロードに失敗しました' },
          { status: 500 }
        );
      }
      const lyricJson = lyricResponse.data;
      if (!lyricJson.content) {
        return NextResponse.json(
          { error: 'KuGou から歌詞が返されませんでした' },
          { status: 404 }
        );
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
      return NextResponse.json({ lyricsData });
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
          return NextResponse.json(
            { error: '同期歌詞が見つかりませんでした' },
            { status: 404 }
          );
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
        return NextResponse.json({ lyricsData });
      } else {
        return NextResponse.json(
          { error: '歌詞が見つかりませんでした' },
          { status: 404 }
        );
      }
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching lyrics:', error.message);
      if (error.response && error.response.status === 404) {
        return NextResponse.json(
          { error: '歌詞が見つかりませんでした' },
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          { error: 'サーバーエラーが発生しました' },
          { status: 500 }
        );
      }
    } else if (error instanceof Error) {
      console.error('Unexpected error:', error.message);
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      );
    } else {
      console.error('Unknown error:', error);
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      );
    }
  }
}
