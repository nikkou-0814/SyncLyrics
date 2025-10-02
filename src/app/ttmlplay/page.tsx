"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LyricLine, SearchResult, TTMLData } from "@/types";

const Player = dynamic(() => import("@/components/player"), { ssr: false });

interface PlayerState {
  mode: "lrc" | "ttml";
  lyricsData: LyricLine[];
  audioUrl: string;
  selectedTrack: SearchResult;
  ttmlData?: TTMLData | null;
}

export default function TtmlPlayPage() {
  const router = useRouter();
  const [lyricsData, setLyricsData] = useState<LyricLine[] | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [track, setTrack] = useState<SearchResult | null>(null);
  const [ttmlData, setTtmlData] = useState<TTMLData | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("currentPlayerState");
      if (!raw) return;
      const parsed: PlayerState = JSON.parse(raw);
      if (parsed.mode !== "ttml") return;
      setLyricsData(parsed.lyricsData || null);
      setAudioUrl(parsed.audioUrl || null);
      setTrack(parsed.selectedTrack || null);
      setTtmlData(parsed.ttmlData || null);

      const prev = JSON.parse(localStorage.getItem("playerSettings") || "{}");
      if (prev && typeof prev === "object" && "useTTML" in prev) {
        delete prev.useTTML;
        localStorage.setItem("playerSettings", JSON.stringify(prev));
      }
    } catch (e) {
      console.error("Failed to restore player state:", e);
    }
  }, []);

  const handleBack = () => {
    router.push("/");
  };

  if (!lyricsData || !audioUrl || !track) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">再生データが見つかりません。トップに戻ってください。</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <Player
        lyricsData={lyricsData}
        audioUrl={audioUrl}
        trackName={track.trackName}
        albumName={track.albumName}
        artistName={track.artistName}
        onBack={handleBack}
        ttmlData={ttmlData || undefined}
      />
    </div>
  );
}
