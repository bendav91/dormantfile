# DormantFile 5-Second Intro Video

## Overview

A 5-second landing page hero video built with Remotion. Problem → Solution narrative arc. Light & clean visual style matching the existing site. Subtle sound design (muted by default).

## Technical Spec

- **Resolution:** 1920x1080 (16:9)
- **FPS:** 30 (150 frames total)
- **Framework:** Remotion (separate project in `video/` directory)
- **Font:** IBM Plex Sans via `@remotion/google-fonts`
- **Transitions:** `@remotion/transitions` with `fade()` between scenes
- **Audio:** `@remotion/media` — short SFX files in `public/`

## Storyboard

### Scene 1: The Hook (0.0–1.5s, frames 0–45)

- **Background:** `#F8FAFC` (light slate)
- **Content:** "Dormant company?" in IBM Plex Sans, 700 weight, `#1E293B`
- **Animation:** Text fades in and slides up from 20px below using `spring({ damping: 200 })`
- **Audio:** Soft whoosh sound on entrance

### Scene 2: The Pain Point (1.5–3.0s, frames 45–90)

- **Transition:** `fade()` from Scene 1 over ~10 frames
- **Background:** `#F8FAFC`
- **Content:** "Annual accounts & CT600 filed every year — even with **nothing to report.**"
  - Main text: 600 weight, `#64748B`
  - "nothing to report." emphasised: 700 weight, `#1E293B`
- **Animation:** Text fades in with `spring({ damping: 200 })`
- **Audio:** Subtle click on transition

### Scene 3: The Payoff (3.0–5.0s, frames 90–150)

- **Transition:** `fade()` from Scene 2 over ~10 frames
- **Background:** `#F8FAFC`
- **Content:**
  1. FileText icon (SVG, `#2563EB`) — scales up with `spring({ damping: 10 })` for a slight bounce
  2. "DormantFile" in 700 weight, `#1E293B` — slides in from right with `spring({ damping: 200 })`
  3. "File your dormant company accounts in minutes" in 400 weight, `#64748B` — fades in 10 frames after the logo lands
- **Audio:** Satisfying resolve/chime sound

## Project Structure

```
video/
├── package.json
├── src/
│   ├── Root.tsx              # Composition registration
│   ├── IntroVideo.tsx        # Main composition component
│   ├── scenes/
│   │   ├── HookScene.tsx     # "Dormant company?"
│   │   ├── PainScene.tsx     # Pain point text
│   │   └── PayoffScene.tsx   # Logo reveal
│   └── components/
│       └── FileTextIcon.tsx  # SVG icon component
├── public/
│   ├── whoosh.mp3
│   ├── click.mp3
│   └── resolve.mp3
└── remotion.config.ts
```

## Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#F8FAFC` | All scenes |
| Primary text | `#1E293B` | Headlines, emphasis |
| Secondary text | `#64748B` | Body copy |
| Brand blue | `#2563EB` | FileText icon |
| Accent orange | `#F97316` | Not used in video (reserved for CTAs on page) |

## Animation Summary

| Element | Type | Config |
|---------|------|--------|
| Text entrances | spring | `{ damping: 200 }` — smooth, no bounce |
| Text slide-up | interpolate spring → translateY | `[20, 0]` px |
| Logo icon scale | spring | `{ damping: 10 }` — slight bounce |
| Logo text slide | spring | `{ damping: 200 }` from translateX 40px |
| Scene transitions | fade | `linearTiming({ durationInFrames: 10 })` |

## Audio

Three short SFX files. The video is designed to work silently (autoplay muted) but sound enhances the experience if unmuted. Audio files will be sourced from royalty-free libraries or generated.

## Integration

The rendered MP4 will be placed in the main project's `public/` directory for use as a landing page hero video element. The `video/` directory is a standalone Remotion project — it does not share dependencies with the Next.js app.
