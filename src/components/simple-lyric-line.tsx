'use client';

import React from 'react';
import LineBreaker from '@/components/linebreak';
import { SimpleLyricLineProps } from '@/types';

const SimpleLyricLine = React.memo<SimpleLyricLineProps>(({
  text,
  isActive,
  color,
  activeColor,
  inactiveColor,
  className,
  style,
}) => {
  const resolvedColor = color ?? (isActive ? activeColor : inactiveColor);
  const shouldPreserveWhitespace =
    style?.whiteSpace != null ||
    isActive !== undefined ||
    activeColor !== undefined ||
    inactiveColor !== undefined;

  return (
    <span
      className={className}
      style={{
        pointerEvents: 'none',
        color: resolvedColor,
        transition: 'color 0.5s ease',
        ...(shouldPreserveWhitespace ? { whiteSpace: 'pre-wrap' } : {}),
        ...style,
      }}
    >
      <LineBreaker text={text} />
    </span>
  );
});
SimpleLyricLine.displayName = 'SimpleLyricLine';

export default SimpleLyricLine;
