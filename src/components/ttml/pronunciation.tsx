'use client';

import React, { useEffect, useState } from 'react';
import LineBreaker from '@/components/linebreak';
import type { SimpleKaraokeProps } from '@/types';

const PronunciationKaraokeLyricLine: React.FC<SimpleKaraokeProps> = ({
  text,
  progressPercentage,
  resolvedTheme,
  isActive,
  progressDirection,
  activeColor: activeColorProp,
  inactiveColor: inactiveColorProp,
}) => {
  const isDark = resolvedTheme === 'dark';
  const defaultActiveColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
  const defaultInactiveColor = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
  const activeColor = activeColorProp ?? defaultActiveColor;
  const inactiveColor = inactiveColorProp ?? defaultInactiveColor;
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    let animationFrameId: number | null = null;
    let timerId: NodeJS.Timeout | null = null;

    if (progressDirection === 'ttb' || progressDirection === 'btt') {
      animationFrameId = requestAnimationFrame(() => setShouldAnimate(true));
    } else {
      timerId = setTimeout(() => setShouldAnimate(true), 50);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (timerId) clearTimeout(timerId);
    };
  }, [isActive, progressDirection]);

  if (progressDirection === 'ttb' || progressDirection === 'btt') {
    const getClipPath = (): string => {
      switch (progressDirection) {
        case 'btt':
          return `inset(${100 - progressPercentage}% 0 0 0)`;
        case 'ttb':
          return `inset(0 0 ${100 - progressPercentage}% 0)`;
        default:
          return `inset(0 0 ${100 - progressPercentage}% 0)`;
      }
    };

    return (
      <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'pre-wrap' }}>
        <span style={{ color: inactiveColor, pointerEvents: 'none' }}>
          <LineBreaker text={text} />
        </span>
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            color: activeColor,
            clipPath: getClipPath(),
            transition: shouldAnimate ? 'clip-path 0.1s linear' : 'none',
            whiteSpace: 'pre-wrap',
            pointerEvents: 'none',
          }}
        >
          <LineBreaker text={text} />
        </span>
      </span>
    );
  }

  const getGradient = (): string => {
    switch (progressDirection) {
      case 'rtl':
        return `linear-gradient(to left, ${activeColor}, ${activeColor} 50%, ${inactiveColor} 50%, ${inactiveColor})`;
      case 'ltr':
      default:
        return `linear-gradient(to right, ${activeColor}, ${activeColor} 50%, ${inactiveColor} 50%, ${inactiveColor})`;
    }
  };

  const getBackgroundSize = (): string => '200% 100%';

  const getBackgroundPosition = (): string => {
    const progress = progressPercentage / 100;
    switch (progressDirection) {
      case 'rtl':
        return `${progress * 100}% 0`;
      case 'ltr':
      default:
        return `${(1 - progress) * 100}% 0`;
    }
  };

  return (
    <span
      style={{
        display: 'inline',
        whiteSpace: 'pre-wrap',
        color: 'transparent',
        backgroundImage: getGradient(),
        backgroundSize: getBackgroundSize(),
        backgroundPosition: getBackgroundPosition(),
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        transition: shouldAnimate ? 'background-position 0.1s linear' : 'none',
        pointerEvents: 'none'
      }}
    >
      <LineBreaker text={text} />
    </span>
  );
};

export default PronunciationKaraokeLyricLine;
