import React from 'react';
import Image from 'next/image';

interface GiantLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function GiantLogo({ className = 'h-20 w-auto', width = 190, height = 68 }: GiantLogoProps) {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <Image
        src="/giant-logo.png"
        alt="Giant BD CO LIMITED"
        width={width}
        height={height}
        className="object-contain h-full w-auto scale-175 origin-center"
        priority
      />
    </div>
  );
}

