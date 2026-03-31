"use client";

import { Play } from "lucide-react";
import { useRef, useState } from "react";

export function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function handlePlay() {
    if (videoRef.current) {
      videoRef.current.play();
      setStarted(true);
    }
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-black">
      <video
        ref={videoRef}
        src={src}
        controls={started}
        preload="metadata"
        playsInline
        className="w-full block aspect-video"
      />
      {!started && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center cursor-pointer transition-opacity duration-200 hover:opacity-90 bg-black/30"
          aria-label="Play video"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center bg-cta shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
            <Play size={28} fill="white" stroke="white" className="ml-1" />
          </div>
        </button>
      )}
    </div>
  );
}
