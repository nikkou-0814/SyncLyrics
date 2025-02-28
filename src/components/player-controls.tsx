'use client';

import React, { useRef } from 'react';
import { 
  Pause, 
  Play, 
  Volume, 
  Volume1, 
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward 
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  Card,
  CardContent
} from '@/components/ui/card';

interface PlayerControlsProps {
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

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  togglePlayPause,
  handleSkipBack,
  handleSkipForward,
  volume,
  handleVolumeChange,
  handleProgressChange,
  currentTime,
  duration,
  isMobile,
  trackName,
  artistName,
  albumName,
  settings,
  formatTime,
}) => {
  const prevVolumeRef = useRef(volume);
  
  const toggleMute = () => {
    if (volume === 0) {
      handleVolumeChange([prevVolumeRef.current || 50]);
    } else {
      prevVolumeRef.current = volume;
      handleVolumeChange([0]);
    }
  };

  const onLocalVolumeChange = (val: number[]) => {
    if (val[0] > 0) {
      prevVolumeRef.current = val[0];
    }
    handleVolumeChange(val);
  };

  // Determine volume icon based on volume level
  const VolumeIcon = () => {
    if (volume === 0) return <VolumeX className="h-4 w-4" />;
    if (volume > 50) return <Volume2 className="h-4 w-4" />;
    if (volume > 0) return <Volume1 className="h-4 w-4" />;
    return <Volume className="h-4 w-4" />;
  };

  const positionClass = 
    settings.playerposition === "left"
      ? "left-0"
      : settings.playerposition === "right"
      ? "right-0"
      : "left-1/2 transform -translate-x-1/2";

  const roundedClass = 
    isMobile || settings.fullplayer 
      ? "rounded-t-lg" 
      : "rounded-lg";

  return (
    <motion.div
      initial={{
        width: settings.fullplayer || isMobile ? "100%" : "",
        margin: settings.fullplayer || isMobile ? "0" : "20px",
        bottom: !settings.showplayercontrol
          ? isMobile
            ? "-300px"
            : "-150px"
          : "0",
      }}
      animate={{
        width: settings.fullplayer || isMobile ? "100%" : "",
        margin: settings.fullplayer || isMobile ? "0" : "20px",
        bottom: !settings.showplayercontrol
          ? isMobile
            ? "-300px"
            : "-150px"
          : "0",
      }}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      className={`fixed z-50 ${positionClass} ${roundedClass} shadow-lg`}
    >
      <Card className="border-0 shadow-none">
        <CardContent className="p-4">
          {isMobile ? (
            <div className="flex flex-col space-y-4">
              {/* Track Info */}
              <div className="space-y-1">
                <p className="font-medium text-sm overflow-hidden text-nowrap text-ellipsis">
                  {trackName.length > 40 ? `${trackName.slice(0, 40)}...` : trackName}
                </p>
                <p className="text-xs overflow-hidden text-nowrap text-ellipsis text-muted-foreground">
                  {artistName.length > 40 ? `${artistName.slice(0, 40)}...` : artistName} - 
                  {albumName.length > 40 ? `${albumName.slice(0, 40)}...` : albumName}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium min-w-8 text-center">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={0.1}
                  className="flex-1"
                  onValueChange={handleProgressChange}
                />
                <span className="text-xs font-medium min-w-8 text-center">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Playback Controls */}
              <div className="flex justify-center items-center gap-4 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkipBack}
                  className="h-12 w-12"
                >
                  <SkipBack className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlayPause}
                  className="h-12 w-12"
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8 ml-1" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkipForward}
                  className="h-12 w-12"
                >
                  <SkipForward className="h-6 w-6" />
                </Button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="h-8 w-8"
                >
                  <VolumeIcon />
                </Button>
                <Slider
                  value={[volume]}
                  max={100}
                  className="flex-1"
                  onValueChange={onLocalVolumeChange}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              {/* Progress Bar */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium min-w-12 text-center">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={0.1}
                  className="flex-1"
                  onValueChange={handleProgressChange}
                />
                <span className="text-xs font-medium min-w-12 text-center">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Controls and Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Playback Controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSkipBack}
                      className="h-9 w-9"
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePlayPause}
                      className="h-9 w-9"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5 ml-0.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSkipForward}
                      className="h-9 w-9"
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="h-8 w-8"
                    >
                      <VolumeIcon />
                    </Button>
                    <Slider
                      value={[volume]}
                      max={100}
                      className="w-24"
                      onValueChange={onLocalVolumeChange}
                    />
                  </div>
                </div>

                {/* Track Info */}
                <div className="text-right flex-shrink ml-4 max-w-60 md:max-w-xs">
                  <p className="font-medium text-sm overflow-hidden text-nowrap text-ellipsis">
                    {trackName.length > (settings.fullplayer ? 60 : 40)
                      ? `${trackName.slice(0, settings.fullplayer ? 60 : 40)}...`
                      : trackName}
                  </p>
                  <p className="text-xs overflow-hidden text-nowrap text-ellipsis text-muted-foreground">
                    {artistName.length > (settings.fullplayer ? 50 : 30)
                      ? `${artistName.slice(0, settings.fullplayer ? 50 : 30)}...`
                      : artistName}{" "}
                    -{" "}
                    {albumName.length > (settings.fullplayer ? 40 : 20)
                      ? `${albumName.slice(0, settings.fullplayer ? 40 : 20)}...`
                      : albumName}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PlayerControls;