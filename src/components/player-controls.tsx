'use client';

import React, { useRef } from 'react';
import { Pause, Play, Volume, Volume1, Volume2, VolumeOff, SkipBack, SkipForward } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion'

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
      className={`fixed z-50 
        ${settings.playerposition === "left"
          ? "left-0"
          : settings.playerposition === "right"
          ? "right-0"
          : "left-1/2 transform -translate-x-1/2"
        } 
        ${isMobile ? "rounded-t-lg" : settings.fullplayer ? "rounded-t-lg" : "rounded-lg"} 
        bg-white dark:bg-gray-800 
        shadow-2xl`}        
    >
      <div className="h-full flex flex-col justify-between p-4">
        {isMobile ? (
          <>
            <div className="text-gray-900 dark:text-white mb-3">
              <p className="font-medium text-sm overflow-hidden text-nowrap text-ellipsis">
                {trackName.length > 40 ? `${trackName.slice(0, 40)}...` : trackName}
              </p>
              <p className="text-xs overflow-hidden text-nowrap text-ellipsis text-gray-600 dark:text-gray-400">
              {artistName.length > 40 ? `${artistName.slice(0, 40)}...` : artistName} - 
              {albumName.length > 40 ? `${albumName.slice(0, 40)}...` : albumName}
            </p>
            </div>
            <div className="flex items-center justify-between my-3">
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                className="flex-1 mx-2"
                onValueChange={handleProgressChange}
              />
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {formatTime(duration)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-10 my-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkipBack}
                    className="text-gray-900 dark:text-white"
                  >
                    <SkipBack
                      size={20}
                      style={{
                        width: '50px',
                        height: '50px',
                        fill: 'currentColor',
                      }}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlayPause}
                    className="text-gray-900 dark:text-white"
                  >
                    {isPlaying ? (
                    <Pause
                      size={20}
                      style={{
                        width: '50px',
                        height: '50px',
                        fill: 'currentColor',
                        stroke: 'none',
                      }}
                    />
                  ) : (
                    <Play
                      size={20}
                      style={{
                        width: '50px',
                        height: '50px',
                        fill: 'currentColor',
                        stroke: 'none',
                      }}
                    />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkipForward}
                    className="text-gray-900 dark:text-white"
                  >
                    <SkipForward
                      size={20}
                      style={{
                        width: '50px',
                        height: '50px',
                        fill: 'currentColor',
                      }}
                    />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 my-3">
                <Volume className="h-4 w-4 text-gray-900 dark:text-white" style={{ width: '20px', height: '20px', fill: 'currentColor' }} />
                <Slider
                  value={[volume]}
                  max={100}
                  className="flex-1 mx-2"
                  onValueChange={handleVolumeChange}
                />
                <Volume2 className="h-4 w-4 text-gray-900 dark:text-white" style={{ width: '20px', height: '20px', fill: 'currentColor' }} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                className="flex-1"
                onValueChange={handleProgressChange}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkipBack}
                    className="text-gray-900 dark:text-white"
                  >
                    <SkipBack size={24} style={{ fill: 'currentColor' }} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlayPause}
                    className="text-gray-900 dark:text-white"
                  >
                    {isPlaying ? (
                      <Pause size={24} style={{ fill: 'currentColor' }} />
                    ) : (
                      <Play size={24} style={{ fill: 'currentColor' }} />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkipForward}
                    className="text-gray-900 dark:text-white"
                  >
                    <SkipForward size={24} style={{ fill: 'currentColor' }} />
                  </Button>
                </div>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className="text-gray-900 dark:text-white"
                  >
                    {volume === 0 ? (
                      <VolumeOff style={{ fill: 'currentColor' }} />
                    ) : volume > 50 ? (
                      <Volume2 style={{ fill: 'currentColor' }} />
                    ) : volume > 0 ? (
                      <Volume1 style={{ fill: 'currentColor' }} />
                    ) : (
                      <Volume style={{ fill: 'currentColor' }} />
                    )}
                  </Button>
                  <Slider
                    value={[volume]}
                    max={100}
                    className="w-28"
                    onValueChange={onLocalVolumeChange}
                  />
                </div>
              </div>
              <div className="text-right ml-5 text-gray-900 dark:text-white">
                <p className="font-medium text-sm overflow-hidden text-nowrap text-ellipsis">
                  {trackName.length > (settings.fullplayer ? 60 : 40)
                    ? `${trackName.slice(0, settings.fullplayer ? 60 : 40)}...`
                    : trackName}
                </p>
                <p className="text-xs overflow-hidden text-nowrap text-ellipsis text-gray-600 dark:text-gray-400">
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
          </>
        )}
      </div>
    </motion.div>
  );
};

export default PlayerControls;