import './globals.css';

export const metadata = {
  title: 'SyncLyrics',
  description: '音楽ファイルを挿入、歌詞を検索し歌詞の同期をします。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
