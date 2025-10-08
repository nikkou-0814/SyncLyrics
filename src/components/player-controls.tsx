'use client';

import React, { useRef } from 'react';
import {  Pause,  Play, Volume, Volume1, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { PlayerControlsProps } from '@/types';

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
  mobileControlsVisible = true,
  onMobileControlsToggle,
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
    if (isMobile && onMobileControlsToggle) {
      onMobileControlsToggle();
    }
  };

  const handlePlayPause = () => {
    togglePlayPause();
    if (isMobile && onMobileControlsToggle) {
      onMobileControlsToggle();
    }
  };

  const handleSkipBackWithToggle = () => {
    handleSkipBack();
    if (isMobile && onMobileControlsToggle) {
      onMobileControlsToggle();
    }
  };

  const handleSkipForwardWithToggle = () => {
    handleSkipForward();
    if (isMobile && onMobileControlsToggle) {
      onMobileControlsToggle();
    }
  };

  const handleProgressChangeWithToggle = (val: number[]) => {
    handleProgressChange(val);
    if (isMobile && onMobileControlsToggle) {
      onMobileControlsToggle();
    }
  };

  const toggleMuteWithToggle = () => {
    toggleMute();
    if (isMobile && onMobileControlsToggle) {
      onMobileControlsToggle();
    }
  };

  const VolumeIcon = () => {
    const iconClass = "h-4 w-4";
    if (volume === 0) return <VolumeX className={iconClass} />;
    if (volume > 50) return <Volume2 className={iconClass} />;
    if (volume > 0) return <Volume1 className={iconClass} />;
    return <Volume className={iconClass} />;
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

  const shouldShowControls = isMobile 
    ? mobileControlsVisible && settings.showplayercontrol
    : settings.showplayercontrol;

  return (
    <>
      <motion.div
        initial={{
          width: settings.fullplayer || isMobile ? "100%" : "",
          margin: settings.fullplayer || isMobile ? "0" : "20px",
          bottom: !shouldShowControls
            ? isMobile
              ? "-310px"
              : "-150px"
            : "0",
          opacity: isMobile && !shouldShowControls ? 0 : 1,
        }}
        animate={{
          width: settings.fullplayer || isMobile ? "100%" : "",
          margin: settings.fullplayer || isMobile ? "0" : "20px",
          bottom: !shouldShowControls
            ? isMobile
              ? "-310px"
              : "-150px"
            : "0",
          opacity: isMobile && !shouldShowControls ? 0 : 1,
        }}
        transition={{ 
          duration: 0.7,
          ease: [0.19, 1, 0.22, 1],
          opacity: { 
            duration: shouldShowControls ? 1.0 : 0.5,
            ease: [0.19, 1, 0.22, 1] 
          },
        }}
        className={`fixed z-50 ${positionClass} ${roundedClass} shadow-lg ${isMobile && shouldShowControls ? 'backdrop-blur-sm' : ''}`}
      >
        <Card 
          className={`shadow-none bg-background/40 dark:bg-background/20 border border-white/10 dark:border-white/10 rounded-t-2xl ${isMobile ? 'rounded-b-none' : undefined}`}
          onClick={() => {
            if (isMobile && onMobileControlsToggle) {
              onMobileControlsToggle();
            }
          }}
        >
          <CardContent className="p-5">
            {isMobile ? (
              <div className="flex flex-col space-y-5">
                {/* Track Info */}
                <div className="space-y-2 text-center">
                  <p className="font</div>-semibold text-base overflow-hidden text-nowrap text-ellipsis text-foreground drop-shadow-sm">
                    {trackName.length > 35 ? `${trackName.slice(0, 35)}...` : trackName}
                  </p>
                  <p className="text-sm overflow-hidden text-nowrap text-ellipsis text-foreground/80 drop-shadow-md">
                    {artistName.length > 35 ? `${artistName.slice(0, 35)}...` : artistName}
                    {albumName && ` • ${albumName.length > 30 ? `${albumName.slice(0, 30)}...` : albumName}`}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium min-w-10 text-center text-foreground/90 drop-shadow-sm">
                    {formatTime(currentTime)}
                  </span>
                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={0.1}
                    className="flex-1 [&_.slider-track]:bg-foreground/20 [&_.slider-range]:bg-primary [&_.slider-thumb]:bg-primary [&_.slider-thumb]:shadow-lg [&_.slider-thumb]:border-2 [&_.slider-thumb]:border-background"
                    onValueChange={handleProgressChangeWithToggle}
                  />
                  <span className="text-xs font-medium min-w-10 text-center text-foreground/90 drop-shadow-sm">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Playback Controls */}
                <div className="flex justify-center items-center gap-6 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkipBackWithToggle}
                    className="h-12 w-12 rounded-full hover:bg-foreground/15 transition-all duration-200 text-foreground/90 hover:text-foreground drop-shadow-sm"
                  >
                    <SkipBack className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePlayPause}
                    className="h-16 w-16 rounded-full hover:bg-foreground/15 hover:scale-105 transition-all duration-200 text-primary drop-shadow-lg"
                  >
                    {isPlaying ? (
                      <Pause className="h-10 w-10" />
                    ) : (
                      <Play className="h-10 w-10 ml-1" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkipForwardWithToggle}
                    className="h-12 w-12 rounded-full hover:bg-foreground/15 transition-all duration-200 text-foreground/90 hover:text-foreground drop-shadow-sm"
                  >
                    <SkipForward className="h-6 w-6" />
                  </Button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-3 pt-2 px-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMuteWithToggle}
                    className="h-9 w-9 rounded-full hover:bg-foreground/15 transition-all duration-200 text-foreground/90 hover:text-foreground drop-shadow-sm"
                  >
                    <VolumeIcon />
                  </Button>
                  <Slider
                    value={[volume]}
                    max={100}
                    className="flex-1 [&_.slider-track]:bg-foreground/20 [&_.slider-range]:bg-primary [&_.slider-thumb]:bg-primary [&_.slider-thumb]:shadow-md [&_.slider-thumb]:border-2 [&_.slider-thumb]:border-background"
                    onValueChange={onLocalVolumeChange}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium min-w-12 text-center text-foreground/90 drop-shadow-sm">
                    {formatTime(currentTime)}
                  </span>
                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={0.1}
                    className="flex-1 [&_.slider-track]:bg-foreground/20 [&_.slider-range]:bg-primary [&_.slider-thumb]:bg-primary [&_.slider-thumb]:shadow-lg [&_.slider-thumb]:border-2 [&_.slider-thumb]:border-background"
                    onValueChange={handleProgressChangeWithToggle}
                  />
                  <span className="text-xs font-medium min-w-12 text-center text-foreground/90 drop-shadow-sm">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Controls and Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {/* Playback Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSkipBackWithToggle}
                        className="h-10 w-10 rounded-full hover:bg-foreground/15 transition-all duration-200 text-foreground/90 hover:text-foreground drop-shadow-sm"
                      >
                        <SkipBack className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePlayPause}
                        className="h-12 w-12 rounded-full hover:bg-foreground/15 hover:scale-105 transition-all duration-200 text-primary drop-shadow-lg"
                      >
                        {isPlaying ? (
                          <Pause className="h-7 w-7" />
                        ) : (
                          <Play className="h-7 w-7 ml-0.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSkipForwardWithToggle}
                        className="h-10 w-10 rounded-full hover:bg-foreground/15 transition-all duration-200 text-foreground/90 hover:text-foreground drop-shadow-sm"
                      >
                        <SkipForward className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMuteWithToggle}
                        className="h-9 w-9 rounded-full hover:bg-foreground/15 transition-all duration-200 text-foreground/90 hover:text-foreground drop-shadow-sm"
                      >
                        <VolumeIcon />
                      </Button>
                      <Slider
                        value={[volume]}
                        max={100}
                        className="w-28 [&_.slider-track]:bg-foreground/20 [&_.slider-range]:bg-primary [&_.slider-thumb]:bg-primary [&_.slider-thumb]:shadow-md [&_.slider-thumb]:border-2 [&_.slider-thumb]:border-background"
                        onValueChange={onLocalVolumeChange}
                      />
                    </div>
                  </div>

                  {/* Track Info */}
                  <div className="text-right flex-shrink ml-6 max-w-64 md:max-w-80">
                    <p className="font-semibold text-sm overflow-hidden text-nowrap text-ellipsis text-foreground drop-shadow-sm">
                      {trackName.length > (settings.fullplayer ? 50 : 35)
                        ? `${trackName.slice(0, settings.fullplayer ? 50 : 35)}...`
                        : trackName}
                    </p>
                    <p className="text-xs overflow-hidden text-nowrap text-ellipsis text-foreground/80 mt-1 drop-shadow-md">
                      {artistName.length > (settings.fullplayer ? 40 : 25)
                        ? `${artistName.slice(0, settings.fullplayer ? 40 : 25)}...`
                        : artistName}
                      {albumName && ` • ${albumName.length > (settings.fullplayer ? 35 : 20)
                        ? `${albumName.slice(0, settings.fullplayer ? 35 : 20)}...`
                        : albumName}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      
      {isMobile && !mobileControlsVisible && (
        <div
          className="fixed bottom-0 left-0 right-0 h-32 bg-transparent z-[9999]"
          onClick={onMobileControlsToggle}
        />
      )}
    </>
  );
};

export default PlayerControls;
