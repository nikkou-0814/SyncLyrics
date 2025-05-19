import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { SearchQuery, SearchResult, LrcLibSearchResponseItem } from '@/types';

type LrcLibSearchResponse = LrcLibSearchResponseItem[];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');
    const track_name = searchParams.get('track_name');
    const artist_name = searchParams.get('artist_name');
    const album_name = searchParams.get('album_name');
    const service = searchParams.get('service') as SearchQuery['service'];

    if (!q && !track_name) {
      return NextResponse.json(
        { error: 'クエリパラメータ "q" または "track_name" のいずれかを指定してください' },
        { status: 400 }
      );
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
          return NextResponse.json(
            { error: 'KuGou 検索結果が見つかりませんでした' },
            { status: 404 }
          );
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
        return NextResponse.json({ results });
      } else {
        return NextResponse.json(
          { error: 'KuGou 検索に失敗しました' },
          { status: 500 }
        );
      }
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
        return NextResponse.json(
          { error: '予期しないAPIレスポンス形式です' },
          { status: 500 }
        );
      }
      const results: SearchResult[] = data.map((item: LrcLibSearchResponseItem) => ({
        id: item.id,
        trackName: item.trackName,
        artistName: item.artistName,
        albumName: item.albumName || '',
        duration: item.duration,
      }));
      return NextResponse.json({ results });
    } else {
      return NextResponse.json(
        { error: '検索に失敗しました' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Error during search:', error.message);
      if (error.response && error.response.data) {
        return NextResponse.json(
          { error: error.response.data.message || 'APIエラーが発生しました' },
          { status: error.response.status }
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
