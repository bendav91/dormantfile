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
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--color-border)",
        backgroundColor: "#000",
      }}
    >
      <video
        ref={videoRef}
        src={src}
        controls={started}
        preload="metadata"
        playsInline
        className="w-full block"
        style={{ aspectRatio: "16/9" }}
      />
      {!started && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center cursor-pointer transition-opacity duration-200 hover:opacity-90"
          aria-label="Play video"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
        >
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "var(--color-cta)",
              boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
            }}
          >
            <Play size={28} fill="white" stroke="white" className="ml-1" />
          </div>
        </button>
      )}
    </div>
  );
}
