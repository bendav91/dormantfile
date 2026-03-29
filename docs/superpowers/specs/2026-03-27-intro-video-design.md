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

## Duration Calculation

Using `TransitionSeries`, transitions overlap adjacent scenes and shorten total duration:

- Scene 1: 50 frames
- Scene 2: 55 frames
- Scene 3: 65 frames
- Transition 1→2: 10 frames (fade)
- Transition 2→3: 10 frames (fade)
- **Total: 50 + 55 + 65 − 10 − 10 = 150 frames (5.0s)**

## Storyboard

All `spring()` calls use the standard `spring({ frame, fps, config })` signature. Only the `config` object is specified below for brevity. All text is centred on screen with a max-width of 900px.

### Scene 1: The Hook (0.0–1.7s, 50 frames)

- **Background:** `#F8FAFC` (light slate)
- **Content:** "Dormant company?" — IBM Plex Sans, 700 weight, 72px, `#1E293B`, centred
- **Animation:** Text fades in and slides up from 20px below using `spring({ config: { damping: 200 } })`
- **Audio:** Soft whoosh sound, plays at frame 0

### Scene 2: The Pain Point (1.7–3.2s, 55 frames)

- **Transition:** `fade()` from Scene 1, `linearTiming({ durationInFrames: 10 })`
- **Background:** `#F8FAFC`
- **Content:** "Annual accounts & CT600 filed every year — even with **nothing to report.**" — centred, max-width 900px
  - Main text: 600 weight, 36px, `#64748B`
  - "nothing to report." emphasised: 700 weight, 36px, `#1E293B`
- **Animation:** Text fades in with `spring({ config: { damping: 200 } })`
- **Audio:** Subtle click, plays at frame 0 of scene

### Scene 3: The Payoff (3.2–5.0s, 65 frames)

- **Transition:** `fade()` from Scene 2, `linearTiming({ durationInFrames: 10 })`
- **Background:** `#F8FAFC`
- **Layout:** Icon and brand name in a horizontal row (centred), tagline below
- **Content:**
  1. FileText icon (SVG, 40px, `#2563EB`) — scales from 0→1 with `spring({ config: { damping: 10 } })` for a slight bounce
  2. "DormantFile" — 700 weight, 56px, `#1E293B` — slides in from translateX(40px) with `spring({ config: { damping: 200 } })`
  3. "File your dormant company accounts in minutes" — 400 weight, 28px, `#64748B` — fades in 10 frames after logo lands
- **Audio:** Satisfying resolve/chime sound, plays at frame 0 of scene

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

| Token          | Hex       | Usage                                         |
| -------------- | --------- | --------------------------------------------- |
| Background     | `#F8FAFC` | All scenes                                    |
| Primary text   | `#1E293B` | Headlines, emphasis                           |
| Secondary text | `#64748B` | Body copy                                     |
| Brand blue     | `#2563EB` | FileText icon                                 |
| Accent orange  | `#F97316` | Not used in video (reserved for CTAs on page) |

## Animation Summary

| Element           | Type                             | Config                                   |
| ----------------- | -------------------------------- | ---------------------------------------- |
| Text entrances    | `spring({ frame, fps, config })` | `{ damping: 200 }` — smooth, no bounce   |
| Text slide-up     | interpolate spring → translateY  | `[20, 0]` px                             |
| Logo icon scale   | `spring({ frame, fps, config })` | `{ damping: 10 }` — slight bounce        |
| Logo text slide   | `spring({ frame, fps, config })` | `{ damping: 200 }` from translateX 40px  |
| Scene transitions | `fade()`                         | `linearTiming({ durationInFrames: 10 })` |

## Audio

Three short SFX files. The video is designed to work silently (autoplay muted) but sound enhances the experience if unmuted. Audio files will be sourced from royalty-free libraries or generated.

## Integration

The rendered MP4 (H.264 codec) will be placed in the main project's `public/` directory for use as a landing page hero video element. The `video/` directory is a standalone Remotion project — it does not share dependencies with the Next.js app.
