// app/layout.tsx

import './globals.css';

export const metadata = {
  title: 'Lyrics Sync App',
  description: '音楽ファイルから歌詞を自動認識し、同期表示するアプリ',
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
