import React, { useState, useEffect, useRef, Fragment } from 'react';
import { ingredients, type IngredientId, combinationFor } from '@crowdforge/shared';

interface PairingInfo {
  title: string;
  tagline: string;
  hazards: string[];
}

const customPairings: Record<string, PairingInfo> = {
  'gravity+fire': {
    title: 'SOLAR SINGULARITY',
    tagline: 'Expanding thermal magma fields drift into gravitational event horizons.',
    hazards: [
      'Gravitational vortex pulling player & shots toward the core',
      'Expanding damage-over-time thermal burn zones across the floor',
    ],
  },
  'ice+storm': {
    title: 'FROZEN CIRCUIT',
    tagline: 'High-voltage lightning arcs jump across slick frozen metal plating.',
    hazards: [
      'Slippery ice floor with loss of kinetic traction and drift inertia',
      'Telegraphed chain lightning strikes leaping between enemy mechs',
    ],
  },
  'clones+mirror': {
    title: 'ECHO LABYRINTH',
    tagline: 'Holographic decoys mask swarming echo mech flanking attacks.',
    hazards: [
      'Optical decoy holograms diverting enemy aggro and line of sight',
      'Aggressive swarming clone reinforcements flanking from all sides',
    ],
  },
  'gravity+ice': {
    title: 'ORBITAL BLIZZARD',
    tagline: 'Frozen floor preserves momentum as gravitational wells pull relentlessly.',
    hazards: [
      'Newtonian black hole suction altering projectile trajectories',
      'Zero-friction ice sliding with preserved angular momentum',
    ],
  },
  'fire+storm': {
    title: 'TEMPEST INFERNO',
    tagline: 'Raging storm clouds crack with lightning while thermal fire devours the arena.',
    hazards: [
      'Targeted lightning strike telegraph warning rings',
      'Expanding thermal magma zones creating impassable choke points',
    ],
  },
  'ice+mirror': {
    title: 'GLACIAL REFRACTION',
    tagline: 'Reflective crystal shields redirect lasers across slippery ice sheets.',
    hazards: [
      'Reflective barrier walls redirecting player and enemy shots',
      'Ice patches causing drift and inertia loss during evasive dashes',
    ],
  },
  'clones+storm': {
    title: 'VOLTAIC SWARM',
    tagline: 'Electrified echo mechs swarm the player with crackling shockwaves.',
    hazards: [
      'Overcharged mini-mech waves charging in pack formations',
      'Chained lightning arcs discharging whenever mechs are destroyed',
    ],
  },
  'fire+mirror': {
    title: 'PRISMATIC BLAZE',
    tagline: 'Blazing walls reflect laser projectiles across crossfire corridors.',
    hazards: [
      'Reflective barrier shields that bounce energy weapons',
      'Scorching floor zones dealing high thermal damage',
    ],
  },
  'clones+gravity': {
    title: 'SINGULARITY SWARM',
    tagline: 'Gravity wells compress dozens of clone mechs into high-density kill-zones.',
    hazards: [
      'Gravitational vortex concentrating swarms into tight clusters',
      'Dense enemy collisions dealing increased kinetic impact damage',
    ],
  },
  'fire+ice': {
    title: 'THERMAL SHOCK',
    tagline: 'Superheated magma collides with subzero ice plates creating steam explosions.',
    hazards: [
      'Rapidly alternating freeze zones and thermal magma patches',
      'Steam eruption rings that obscure visibility and damage shields',
    ],
  },
};

const HOW_IT_WORKS_STAGES = [
  {
    num: '01',
    name: 'Vote',
    subLabel: 'THE AUDIENCE',
    tagline: 'Your audience decides your fate.',
    desc: 'Viewers use Twitch chat commands (!forge <element>) to vote for arena challenges in real time.',
    chip: '!forge gravity | !forge fire | ...',
  },
  {
    num: '02',
    name: 'Forge',
    subLabel: 'THE AI DIRECTOR',
    tagline: 'AI turns chaos into reality.',
    desc: 'Real-time AI instantly transforms the winning votes into enemies, hazards, and unique boss encounters.',
    chip: 'NEURAL LPU • 420ms • PROCEDURAL',
  },
  {
    num: '03',
    name: 'Survive',
    subLabel: 'THE BROADCASTER',
    tagline: '30 seconds. One arena. No mercy.',
    desc: 'The streamer fights enemies, dodges hazards, and attempts to survive in a morphed 3D battlefield.',
    chip: 'WASD MOVE • SPACE DASH • FIRE',
  },
  {
    num: '04',
    name: 'Conquer',
    subLabel: 'THE VERDICT',
    tagline: 'Victory belongs to the survivor.',
    desc: 'The streamer wins by surviving the 30-second trial, or the audience wins by eliminating them.',
    chip: 'SURVIVAL SCORE • AUDIENCE RECAP',
  },
];

function IsometricPlatform({ children }: { children: React.ReactNode }) {
  return (
    <svg className="cf-isometric-icon-svg" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      
      <ellipse cx="50" cy="62" rx="36" ry="13" fill="url(#cfIsoGlow)" />

      
      
      <polygon points="15,50 50,63 50,70 15,57" fill="url(#cfIsoLeftGrad)" stroke="#7c3aed" strokeWidth="0.8" />
      
      <polygon points="50,63 85,50 85,57 50,70" fill="url(#cfIsoRightGrad)" stroke="#6d28d9" strokeWidth="0.8" />
      
      <polygon points="50,37 85,50 50,63 15,50" fill="url(#cfIsoTopGrad)" stroke="#a855f7" strokeWidth="1.2" />
      
      <polygon points="50,40 80,50 50,60 20,50" fill="none" stroke="rgba(216, 180, 254, 0.4)" strokeWidth="0.8" />

      
      <g filter="url(#cfGlassGlow)">
        {children}
      </g>
    </svg>
  );
}

const COMMUNITY_FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: 'REAL-TIME TWITCH\nCHAT INTEGRATION',
    desc: 'Zero-latency IRC and EventSub webhook connections. Viewers participate directly in native Twitch chat without requiring external browser extensions.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
    title: 'COMMUNITY-DRIVEN\nGAMEPLAY',
    desc: 'Chat is not just a passive audience: viewers actively design the gauntlet, test the streamer’s reflexes, or band together to orchestrate brutal wipeouts.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M18 13h-.68l-2 2h2.68v4H6v-4h2.68l-2-2H6c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2zm-6-2.59l4.3-4.29a.996.996 0 0 0 0-1.41l-2.6-2.6a.996.996 0 0 0-1.41 0L7.7 6.7 12 10.41zM11.29 11.7l-4.59-4.6-2.41 2.41c-.39.39-.39 1.02 0 1.41l6 6c.39.39 1.02.39 1.41 0l4.59-4.59-5-5.01v4.38z" />
      </svg>
    ),
    title: 'LIVE AUDIENCE\nVOTING & ANTI-SPAM',
    desc: 'Democratic 1-vote-per-viewer enforcement per round. Prevents spam and bot manipulation while encouraging strategic viewer coordination.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </svg>
    ),
    title: 'SUB-SECOND\nAI DIRECTOR',
    desc: 'Powered by a high-performance AI engine. Synthesizes emergent encounter lore, boss modifiers, and hazard parameters in under 500ms.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M6.92 5h10.16L12 10.08 6.92 5zm11.28 14.71l-5.61-5.61 1.41-1.41 4.2 4.2 2.83-2.83 1.41 1.41-4.24 4.24zm-12.4 0l-4.24-4.24 1.41-1.41 2.83 2.83 4.2-4.2 1.41 1.41-5.61 5.61z" />
      </svg>
    ),
    title: 'COMPETITIVE\nSTREAMER MATCHES',
    desc: 'Fast-paced 30-second rounds keep viewer retention and chat hype at peak intensity. Every second counts as the countdown ticks toward zero.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.261-8-12.356-8-5.096 0-5.096 8 0 8 5.095 0 7.261-8 12.356-8z" />
      </svg>
    ),
    title: 'DYNAMIC ROUNDS &\nREPLAYABILITY',
    desc: '6 core elements combine into 15 distinct dual-element fusions, backed by dynamic intensity scaling and procedural enemy waves.',
  },
];

const PIPELINE_STEPS = [
  {
    num: '01',
    title: '01. TWITCH CHAT VOTE',
    desc: 'Viewers vote and influence the next event.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="#c084fc">
        <path d="M4.5 3L3 6.75V20.25H7.5V23.25L10.5 20.25H14.25L21 13.5V3H4.5ZM19.5 12.75L16.5 15.75H13.5L11.25 18V15.75H7.5V4.5H19.5V12.75Z" />
        <path d="M15.75 7.5H14.25V12H15.75V7.5Z" />
        <path d="M11.25 7.5H9.75V12H11.25V7.5Z" />
      </svg>
    ),
  },
  {
    num: '02',
    title: '02. AI FORGE',
    desc: 'Processes votes in < 500ms.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#c084fc" strokeWidth="2">
        <polygon points="12,2 22,8.5 12,15 2,8.5" fill="#a855f7" fillOpacity="0.4" />
        <polygon points="12,7 22,13.5 12,20 2,13.5" fill="#a855f7" fillOpacity="0.5" />
        <polygon points="12,12 22,18.5 12,25 2,18.5" fill="#c084fc" fillOpacity="0.7" />
      </svg>
    ),
  },
  {
    num: '03',
    title: '03. GENERATED ENCOUNTER',
    desc: 'Creates a unique event recipe.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="#c084fc">
        <path d="M13.13 2.5a.75.75 0 0 0-1.04.14L9.5 6.13 4.88 7.3a.75.75 0 0 0-.48.97l1.75 4.38-3.44 3.44a.75.75 0 0 0 0 1.06l1.5 1.5a.75.75 0 0 0 1.06 0l3.44-3.44 4.38 1.75a.75.75 0 0 0 .97-.48l1.17-4.62 3.49-2.59a.75.75 0 0 0 .14-1.04L13.13 2.5z" />
      </svg>
    ),
  },
  {
    num: '04',
    title: '04. ARENA COMBAT',
    desc: 'Dynamic arena with real-time physics.',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
        <path d="M13 19l6 2 2-6-4.5-4.5" />
        <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
        <path d="M11 19l-6 2-2-6 4.5-4.5" />
      </svg>
    ),
  },
];

function getIngredientIcon(id: IngredientId) {
  switch (id) {
    case 'ice':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
        </svg>
      );
    case 'gravity':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-25 12 12)" />
        </svg>
      );
    case 'storm':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case 'mirror':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 12 12 22 22 12" />
        </svg>
      );
    case 'clones':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case 'fire':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 23c-4.97 0-9-3.8-9-8.5 0-3.35 2.1-6.4 3.75-8.2a.75.75 0 0 1 1.25.4c.15 2.5 1.5 4.3 3.5 4.3 1.5 0 2.5-.9 2.75-2.25.15-.8.65-1.5 1.35-1.75a.75.75 0 0 1 .95.8c-.1 2.3 1.2 4.1 3 4.1 1.2 0 2.2-.8 2.7-1.8a.75.75 0 0 1 1.35.4c.9 3.2.4 8.7-1.6 12.5" />
        </svg>
      );
    default:
      return null;
  }
}

export function LandingPage({ connected: _connected = true }: { connected?: boolean }) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeFeature, setActiveFeature] = useState(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  const battlefieldVideoRef = useRef<HTMLVideoElement | null>(null);
  const battlefieldBoxRef = useRef<HTMLDivElement | null>(null);
  const [isBattlefieldPlaying, setIsBattlefieldPlaying] = useState(true);
  const [isBattlefieldMuted, setIsBattlefieldMuted] = useState(true);
  const [battlefieldTime, setBattlefieldTime] = useState(6);
  const [battlefieldDuration, setBattlefieldDuration] = useState(15);

  const toggleBattlefieldPlay = () => {
    const video = battlefieldVideoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsBattlefieldPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsBattlefieldPlaying(false);
    }
  };

  const toggleBattlefieldMute = () => {
    const video = battlefieldVideoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsBattlefieldMuted(video.muted);
  };

  const handleBattlefieldTimeUpdate = () => {
    const video = battlefieldVideoRef.current;
    if (!video) return;
    setBattlefieldTime(video.currentTime);
    if (video.duration && !isNaN(video.duration)) {
      setBattlefieldDuration(video.duration);
    }
  };

  const handleBattlefieldLoadedMetadata = () => {
    const video = battlefieldVideoRef.current;
    if (!video) return;
    if (video.duration && !isNaN(video.duration)) {
      setBattlefieldDuration(video.duration);
    }
  };

  const handleBattlefieldSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = battlefieldVideoRef.current;
    if (!video || !battlefieldDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pos * battlefieldDuration;
    setBattlefieldTime(video.currentTime);
  };

  const toggleBattlefieldFullscreen = () => {
    const container = battlefieldBoxRef.current || battlefieldVideoRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      container.requestFullscreen().catch(() => {});
    }
  };

  const formatBattlefieldTime = (seconds: number) => {
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const [selectedIngredients, setSelectedIngredients] = useState<[IngredientId, IngredientId]>([
    'ice',
    'gravity',
  ]);

  const toggleAudio = () => {
    if (!heroVideoRef.current) return;
    const video = heroVideoRef.current;
    if (isPlayingAudio) {
      video.muted = true;
      setIsPlayingAudio(false);
    } else {
      video.muted = false;
      video
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch(() => setIsPlayingAudio(false));
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % HOW_IT_WORKS_STAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const toggleIngredient = (id: IngredientId) => {
    if (selectedIngredients[0] === id || selectedIngredients[1] === id) return;
    setSelectedIngredients([selectedIngredients[1], id]);
  };

  const key1 = `${selectedIngredients[0]}+${selectedIngredients[1]}`;
  const key2 = `${selectedIngredients[1]}+${selectedIngredients[0]}`;
  const official = combinationFor([selectedIngredients[0], selectedIngredients[1]]);
  const custom = customPairings[key1] || customPairings[key2];

  const currentFusion: PairingInfo = custom || {
    title: official?.title || `${selectedIngredients[0].toUpperCase()} + ${selectedIngredients[1].toUpperCase()}`,
    tagline:
      official?.description ||
      `The AI Director binds ${selectedIngredients[0]} and ${selectedIngredients[1]} into a volatile arena mutation.`,
    hazards: [
      `Environmental hazard linked to ${selectedIngredients[0]} mechanics`,
      `Augmented mech behavior influenced by ${selectedIngredients[1]} physics`,
    ],
  };

  return (
    <div className="cf-landing-root">
      
      <section className="cf-fullscreen-hero-section" id="hero">
        
        <video
          ref={heroVideoRef}
          className="cf-hero-fullscreen-video"
          autoPlay
          loop
          muted={!isPlayingAudio}
          playsInline
          preload="auto"
        >
          <source src="/videos/hero_arena.mp4" type="video/mp4" />
        </video>

        
        <div className="cf-hero-dark-vignette" />

        
        <header className="cf-floating-header">
          
          <div className="cf-header-left">
            <a href="/" className="cf-brand-link">
              <div className="cf-brand-logo-icon">
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  <path
                    d="M16 2 30 16 16 30 2 16Z M16 9 23 16 16 23 9 16Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>
              <div className="cf-brand-styled-badge">
                <span>CROWDFORGE</span>
              </div>
            </a>
          </div>

          
          <nav className="cf-header-center-nav">
            <a href="/arena?renderer=unity" className="cf-nav-center-link">
              Arena <span className="cf-nav-arrow">↗</span>
            </a>
            <a href="/overlay" className="cf-nav-center-link">
              Overlay <span className="cf-nav-arrow">↗</span>
            </a>
            <a href="/dashboard" className="cf-nav-center-link">
              Control room
            </a>
          </nav>

          
          <div className="cf-header-right">
            <button
              type="button"
              className={`cf-sound-toggle-btn ${isPlayingAudio ? 'is-playing' : ''}`}
              onClick={toggleAudio}
              title={isPlayingAudio ? 'Mute Video Audio' : 'Unmute Video Audio'}
              aria-label={isPlayingAudio ? 'Mute Video Audio' : 'Unmute Video Audio'}
            >
              <span className="cf-sound-bar" />
              <span className="cf-sound-bar" />
              <span className="cf-sound-bar" />
              <span className="cf-sound-bar" />
            </button>
          </div>
        </header>

        
        <div className="cf-hero-lead-wrap">
          <h1 className="cf-hero-giant-word">YOU FIGHT.</h1>

          <p className="cf-hero-desc-lead">
            The Audience Is The Game Master.
            <br />
            Twitch chat votes for deadly elemental hazards while you fight to survive in the 3D Unity
            arena.
          </p>

          <div className="cf-hero-action-buttons">
            <a href="/arena?renderer=unity" className="cf-btn-play-arena">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
              <span>PLAY ARENA</span>
            </a>
          </div>
        </div>

        
        <div className="cf-hero-bottom-right-wrap">
          <h1 className="cf-hero-giant-word">CHAT FORGES.</h1>
        </div>

        
        <a href="#how-it-works" className="cf-scroll-indicator">
          <span>SCROLL TO EXPLORE</span>
          <span>↓</span>
        </a>
      </section>

      
      
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
        <defs>
          <radialGradient id="cfIsoGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cfIsoTopGrad" x1="15" y1="45" x2="85" y2="45" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#361a6e" />
            <stop offset="50%" stopColor="#24114b" />
            <stop offset="100%" stopColor="#170a32" />
          </linearGradient>
          <linearGradient id="cfIsoLeftGrad" x1="15" y1="52" x2="50" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1d0a3d" />
            <stop offset="100%" stopColor="#100524" />
          </linearGradient>
          <linearGradient id="cfIsoRightGrad" x1="50" y1="65" x2="85" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#15072d" />
            <stop offset="100%" stopColor="#090216" />
          </linearGradient>
          <linearGradient id="cfGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#c084fc" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="cfGlassStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#d8b4fe" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.75" />
          </linearGradient>
          <filter id="cfGlassGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#a855f7" floodOpacity="0.7" />
          </filter>
        </defs>
      </svg>

      <section id="how-it-works" className="cf-how-it-works-section">
        
        <div className="cf-gameloop-header-wrap">
          <div className="cf-eyebrow-line-wrap">
            <span className="dash" />
            <span className="text">THE GAME LOOP</span>
            <span className="dash" />
          </div>
          <h2 className="cf-gameloop-title">How CrowdForge Works</h2>
          <p className="cf-gameloop-subtitle">
            A live, AI-powered cycle where your audience creates the challenge and you fight to survive.
          </p>
        </div>

        
        <div className="cf-gameloop-pills-row">
          {HOW_IT_WORKS_STAGES.map((s, idx) => (
            <button
              key={s.num}
              type="button"
              className={`cf-loop-pill ${activeStep === idx ? 'is-active' : ''}`}
              onClick={() => setActiveStep(idx)}
            >
              <span className="pill-num">{s.num}</span>
              <span>{s.name}</span>
            </button>
          ))}
        </div>

        
        <div className="cf-gameloop-cards-stage">
          {HOW_IT_WORKS_STAGES.map((stage, idx) => (
            <Fragment key={stage.num}>
              <div
                className={`cf-3d-loop-card ${activeStep === idx ? 'is-card-active' : ''}`}
                onClick={() => setActiveStep(idx)}
              >
                
                <div className="cf-card-bevel-notch" />

                
                <div className="cf-card-neon-bottom-bar" />

                
                <div className="cf-card-reflection-glow" />

                
                <div className="cf-card-top-row">
                  <div className="cf-isometric-icon-wrap">
                    {idx === 0 && (
                      <IsometricPlatform>
                        
                        <path
                          d="M50 11 C38 11 29 17.5 29 25.5 C29 30.5 32.5 35 38 37.5 L35 44 L44.5 39.8 C46.3 40.2 48.1 40.5 50 40.5 C62 40.5 71 34 71 25.5 C71 17.5 62 11 50 11 Z"
                          fill="url(#cfGlassGrad)"
                          stroke="url(#cfGlassStroke)"
                          strokeWidth="2"
                        />
                        <path
                          d="M35 22 C37 17 43 14 50 14"
                          stroke="#ffffff"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          fill="none"
                          opacity="0.85"
                        />
                      </IsometricPlatform>
                    )}
                    {idx === 1 && (
                      <IsometricPlatform>
                        
                        <path
                          d="M54 7 L34 26 L48 26 L42 45 L64 24 L50 24 Z"
                          fill="url(#cfGlassGrad)"
                          stroke="url(#cfGlassStroke)"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M52 11 L38 25 L47 25"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          opacity="0.85"
                        />
                      </IsometricPlatform>
                    )}
                    {idx === 2 && (
                      <IsometricPlatform>
                        
                        <path
                          d="M30 18 C36 15 64 15 70 18 C77 21 79 30 75 37 C71 43 66 40 61 34 C57 30 53 30 50 30 C47 30 43 30 39 34 C34 40 29 43 25 37 C21 30 23 21 30 18 Z"
                          fill="url(#cfGlassGrad)"
                          stroke="url(#cfGlassStroke)"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M33 24 H37 M35 22 V26"
                          stroke="#ffffff"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <circle cx="63" cy="23" r="1.3" fill="#ffffff" />
                        <circle cx="67" cy="25" r="1.3" fill="#ffffff" />
                        <circle cx="65" cy="28" r="1.3" fill="#ffffff" />
                        <path
                          d="M36 19 C42 18 58 18 64 19"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          fill="none"
                          opacity="0.9"
                        />
                      </IsometricPlatform>
                    )}
                    {idx === 3 && (
                      <IsometricPlatform>
                        
                        <path
                          d="M32 38 L26 19 L38 27 L50 14 L62 27 L74 19 L68 38 Z"
                          fill="url(#cfGlassGrad)"
                          stroke="url(#cfGlassStroke)"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M30 38 Q50 42 70 38 L70 41 Q50 45 30 41 Z"
                          fill="#24114b"
                          stroke="#a855f7"
                          strokeWidth="1"
                        />
                        <circle cx="26" cy="18" r="2" fill="#ffffff" stroke="#c084fc" strokeWidth="1" />
                        <circle cx="50" cy="13" r="2.5" fill="#ffffff" stroke="#c084fc" strokeWidth="1" />
                        <circle cx="74" cy="18" r="2" fill="#ffffff" stroke="#c084fc" strokeWidth="1" />
                        <path
                          d="M48 18 L40 28"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          opacity="0.85"
                        />
                      </IsometricPlatform>
                    )}
                  </div>

                  <div className="cf-card-meta-right">
                    <span className="cf-card-meta-num">{stage.num}</span>
                    <span className="cf-card-meta-label">{stage.subLabel}</span>
                  </div>
                </div>

                
                <h3 className="cf-card-title">{stage.tagline}</h3>
                <p className="cf-card-desc">{stage.desc}</p>

                
                <div className="cf-card-code-chip">
                  <span className="chevron">&gt;</span>
                  <span>{stage.chip}</span>
                </div>
              </div>

              
              {idx < HOW_IT_WORKS_STAGES.length - 1 && (
                <div className="cf-gameloop-arrow" aria-hidden="true">
                  →
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </section>

      
      <section id="arena" className="cf-battlefield-section">
        
        <div className="cf-battlefield-nebula" aria-hidden="true" />
        <div className="cf-battlefield-light-cone" aria-hidden="true" />

        <div className="cf-battlefield-container">
          
          <div className="cf-battlefield-header">
            <div className="cf-battlefield-pill">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="#c084fc" className="cf-pill-play-icon">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>THE 3D BATTLEFIELD</span>
            </div>

            <h2 className="cf-battlefield-title">
              WELCOME TO THE <span className="cf-title-chaos">CHAOS.</span>
            </h2>

            <p className="cf-battlefield-subtitle">
              Every round is different. Your audience creates the challenge. You decide whether you survive it.
            </p>
          </div>

          
          <div className="cf-battlefield-stage">
            
            <div className="cf-battlefield-model-wrap">
              <img
                src="/img/headset_potrait.png"
                alt="VR Streamer in 3D Arena"
                className="cf-battlefield-model-img"
              />
            </div>

            
            <div className="cf-battlefield-video-box-wrap">
              <div className="cf-battlefield-video-box" ref={battlefieldBoxRef}>
                <video
                  ref={battlefieldVideoRef}
                  className="cf-battlefield-video"
                  src="/videos/hero_arena.mp4"
                  autoPlay
                  loop
                  muted={isBattlefieldMuted}
                  playsInline
                  onTimeUpdate={handleBattlefieldTimeUpdate}
                  onLoadedMetadata={handleBattlefieldLoadedMetadata}
                  onClick={toggleBattlefieldPlay}
                />

                
                <div className="cf-video-top-bar">
                  <div className="cf-video-badge-pill hd">
                    <span>HD</span>
                  </div>
                </div>

                
                <div className="cf-video-controls-bar">
                  <button
                    type="button"
                    className="cf-control-btn play-pause"
                    onClick={toggleBattlefieldPlay}
                    aria-label={isBattlefieldPlaying ? 'Pause video' : 'Play video'}
                  >
                    {isBattlefieldPlaying ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <span className="cf-video-time">
                    {formatBattlefieldTime(battlefieldTime)} / {formatBattlefieldTime(battlefieldDuration)}
                  </span>

                  <div
                    className="cf-progress-track"
                    onClick={handleBattlefieldSeek}
                    role="progressbar"
                    aria-valuenow={battlefieldTime}
                    aria-valuemin={0}
                    aria-valuemax={battlefieldDuration}
                  >
                    <div
                      className="cf-progress-fill"
                      style={{
                        width: `${Math.min(100, Math.max(0, (battlefieldTime / (battlefieldDuration || 1)) * 100))}%`,
                      }}
                    />
                    <div
                      className="cf-progress-handle"
                      style={{
                        left: `${Math.min(100, Math.max(0, (battlefieldTime / (battlefieldDuration || 1)) * 100))}%`,
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    className="cf-control-btn mute-btn"
                    onClick={toggleBattlefieldMute}
                    aria-label={isBattlefieldMuted ? 'Unmute video audio' : 'Mute video audio'}
                  >
                    {isBattlefieldMuted ? (
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5L6 9H2v6h4l5 4V5z" />
                        <line x1="23" y1="9" x2="17" y2="15" />
                        <line x1="17" y1="9" x2="23" y2="15" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                    )}
                  </button>

                  <button type="button" className="cf-control-btn settings-btn" aria-label="Settings">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="cf-control-btn fullscreen-btn"
                    onClick={toggleBattlefieldFullscreen}
                    aria-label="Toggle fullscreen"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  </button>
                </div>
              </div>

              
              <div className="cf-video-floor-glow" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      
      <section id="forge" className="cf-forge-section">
        <div className="cf-forge-container">
          
          <div className="cf-forge-header">
            <div className="cf-forge-eyebrow">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" className="cf-eyebrow-sparkle">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
              <span>AI ENCOUNTER ENGINE</span>
            </div>

            <h2 className="cf-forge-title">
              THE FORGE: AI-POWERED <span className="cf-forge-chaos">CHAOS</span>
              <svg className="cf-chaos-underline" viewBox="0 0 160 16" fill="none" aria-hidden="true">
                <path d="M4 10 C40 14, 120 14, 156 6" stroke="#c084fc" strokeWidth="3.2" strokeLinecap="round" />
              </svg>
            </h2>

            <p className="cf-forge-subtitle">
              Under the hood, a high-performance AI engine transforms raw chat inputs into real-time gameplay physics.
            </p>
          </div>

          
          <div className="cf-forge-pipeline-row">
            {PIPELINE_STEPS.map((step, idx) => (
              <Fragment key={step.num}>
                <div className="cf-forge-pipeline-card">
                  <div className="cf-pipeline-icon-box">{step.icon}</div>
                  <div className="cf-pipeline-text-col">
                    <strong className="cf-pipeline-title">{step.title}</strong>
                    <span className="cf-pipeline-desc">{step.desc}</span>
                  </div>
                </div>

                {idx < PIPELINE_STEPS.length - 1 && (
                  <div className="cf-pipeline-chevron" aria-hidden="true">
                    »
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          
          <div className="cf-forge-interactive-grid">
            
            <div className="cf-fusion-lab-panel">
              <div className="cf-fusion-lab-header">
                <div className="cf-lab-icon-badge" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 2v7.31L4.14 18.5A2 2 0 0 0 5.86 21h12.28a2 2 0 0 0 1.72-2.5L14 9.31V2h-4z" />
                    <line x1="8.5" y1="2" x2="15.5" y2="2" />
                    <path d="M7 16h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="cf-lab-title">INTERACTIVE FUSION LABORATORY</h3>
                  <p className="cf-lab-desc">
                    Select any 2 ingredients below to preview how the engine synthesizes real-time recipes and arena physics.
                  </p>
                </div>
              </div>

              <div className="cf-ingredient-lab-grid">
                {ingredients.map((ing) => {
                  const isSelected =
                    selectedIngredients[0] === ing.id || selectedIngredients[1] === ing.id;
                  return (
                    <button
                      key={ing.id}
                      type="button"
                      className={`cf-ingredient-card-btn ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => toggleIngredient(ing.id)}
                    >
                      <div className="cf-ing-left">
                        <span className="cf-ing-icon">{getIngredientIcon(ing.id)}</span>
                        <span className="cf-ing-name">{ing.name}</span>
                      </div>
                      {isSelected && (
                        <span className="cf-ing-check-circle" aria-label="Selected">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            
            <div className="cf-synthesized-recipe-panel">
              
              <video
                className="cf-recipe-video-bg"
                src="/videos/video02.mp4"
                autoPlay
                loop
                muted
                playsInline
              />
              <div className="cf-recipe-video-overlay" />

              
              <div className="cf-recipe-inner-content">
                <div className="cf-recipe-header-row">
                  <div className="cf-recipe-pill-badge">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12,2 22,8.5 12,15 2,8.5" fill="#a855f7" fillOpacity="0.4" />
                      <polygon points="12,7 22,13.5 12,20 2,13.5" fill="#a855f7" fillOpacity="0.5" />
                      <polygon points="12,12 22,18.5 12,25 2,18.5" fill="#c084fc" fillOpacity="0.7" />
                    </svg>
                    <span>AI SYNTHESIZED RECIPE</span>
                  </div>
                </div>

                <h4 className="cf-synthesized-title">{currentFusion.title}</h4>
                <p className="cf-synthesized-tagline">“{currentFusion.tagline}”</p>

                <div className="cf-hazards-block">
                  <span className="cf-hazards-heading">ACTIVE IN-GAME ARENA HAZARDS</span>
                  <div className="cf-hazards-list">
                    {currentFusion.hazards.map((hazard, i) => (
                      <div key={i} className="cf-hazard-card-item">
                        <div className="cf-hazard-warn-icon">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                          </svg>
                        </div>
                        <span className="cf-hazard-text">{hazard}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      <section id="community" className="cf-community-reinvented-section">
        
        <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
          <defs>
            <radialGradient id="cfFloorGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cfTwitchFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="cfPedestalTopGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#e9d5ff" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
            <linearGradient id="cfPedestalCylinder" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9333ea" />
              <stop offset="60%" stopColor="#6b21a8" />
              <stop offset="100%" stopColor="#3b0764" />
            </linearGradient>
            <radialGradient id="cfAvatarSphere1" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#c084fc" />
              <stop offset="80%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#4c1d95" />
            </radialGradient>
            <radialGradient id="cfAvatarSphere2" cx="32%" cy="28%" r="70%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#d8b4fe" />
              <stop offset="75%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#581c87" />
            </radialGradient>
            <linearGradient id="cfAvatarBody1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
            <linearGradient id="cfAvatarBody2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d8b4fe" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>
            <linearGradient id="cfGlassTopFace" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#e9d5ff" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="cfGlassSideLeft" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="cfGlassSideRight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.88" />
            </linearGradient>
            <linearGradient id="cfSiliconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2e1065" />
              <stop offset="50%" stopColor="#6b21a8" />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>
            <linearGradient id="cfBladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#e9d5ff" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <filter id="cfSoftGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#a855f7" floodOpacity="0.45" />
            </filter>
          </defs>
        </svg>

        <div className="cf-reinvented-container">
          
          <div className="cf-reinvented-header">
            <div className="cf-reinvented-eyebrow">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="twitch-icon">
                <path d="M4.5 3L3 6.75V20.25H7.5V23.25L10.5 20.25H14.25L21 13.5V3H4.5ZM19.5 12.75L16.5 15.75H13.5L11.25 18V15.75H7.5V4.5H19.5V12.75Z" />
                <path d="M15.75 7.5H14.25V12H15.75V7.5Z" />
                <path d="M11.25 7.5H9.75V12H11.25V7.5Z" />
              </svg>
              <span>CREATOR &amp; COMMUNITY FIRST</span>
            </div>

            <h2 className="cf-reinvented-title">
              STREAMER VS CHAT. <span className="cf-title-purple">REINVENTED.</span>
              <svg className="cf-brush-underline" viewBox="0 0 240 18" fill="none" aria-hidden="true">
                <path
                  d="M3 12 C60 16, 180 16, 237 8"
                  stroke="#7c3aed"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </h2>

            <p className="cf-reinvented-subtitle">
              Designed to turn passive viewers into active level designers and live opponents.
            </p>
          </div>

          
          <div className="cf-reinvented-cards-grid">
            {COMMUNITY_FEATURES.map((item, idx) => {
              const isSelected = activeFeature === idx;
              return (
                <div
                  key={idx}
                  className={`cf-reinvented-card ${isSelected ? 'is-featured' : ''}`}
                  onClick={() => setActiveFeature(idx)}
                >
                  
                  {isSelected && (
                    <>
                      <div className="cf-card-notch-bar" />
                      <div className="cf-card-burst-indicator" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                          <path d="M12 3V7" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M19 8L16 11" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M7 10L10 12" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                    </>
                  )}

                  
                  <div className="cf-card-info-col">
                    <div className="cf-card-mini-badge">{item.icon}</div>
                    <h3 className="cf-card-reinvented-title">
                      {item.title.split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          <br />
                        </span>
                      ))}
                    </h3>
                    <p className="cf-card-reinvented-desc">{item.desc}</p>
                  </div>

                  
                  <div className="cf-card-model-col">
                    {idx === 0 && (
                      <svg viewBox="0 0 160 130" fill="none" className="cf-card-3d-model">
                        
                        <ellipse cx="80" cy="115" rx="55" ry="12" fill="url(#cfFloorGlow)" filter="blur(6px)" />
                        
                        <path d="M 30 102 C 30 114, 130 114, 130 102 L 130 108 C 130 120, 30 120, 30 108 Z" fill="#4c1d95" />
                        <ellipse cx="80" cy="102" rx="50" ry="12" fill="url(#cfPedestalCylinder)" stroke="#c084fc" strokeWidth="1.2" />
                        <ellipse cx="80" cy="96" rx="42" ry="10" fill="url(#cfPedestalTopGrad)" stroke="#e9d5ff" strokeWidth="1.4" />
                        <ellipse cx="80" cy="96" rx="32" ry="7.5" fill="none" stroke="#a855f7" strokeWidth="1.6" opacity="0.9" />
                        
                        <g filter="url(#cfSoftGlow)">
                          <path
                            d="M 52 26 L 45 38 L 45 76 L 58 76 L 58 89 L 71 76 L 90 76 L 115 51 L 115 26 Z"
                            fill="#3b0764"
                          />
                          <path
                            d="M 55 24 L 48 36 L 48 74 L 61 74 L 61 87 L 74 74 L 93 74 L 118 49 L 118 24 Z"
                            fill="#581c87"
                          />
                          <path
                            d="M 58 20 L 51 32 L 51 70 L 64 70 L 64 83 L 77 70 L 96 70 L 121 45 L 121 20 Z"
                            fill="url(#cfTwitchFaceGrad)"
                            stroke="#ffffff"
                            strokeWidth="1.6"
                          />
                          <path
                            d="M 51 32 L 58 20 L 121 20"
                            stroke="#ffffff"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            opacity="0.9"
                          />
                          <ellipse cx="70" cy="30" rx="10" ry="4" fill="#ffffff" opacity="0.35" transform="rotate(-15 70 30)" />
                          <rect x="67" y="34" width="6" height="17" rx="2" fill="#ffffff" />
                          <rect x="86" y="34" width="6" height="17" rx="2" fill="#ffffff" />
                          <rect x="68" y="35" width="2" height="6" rx="1" fill="#ffffff" opacity="0.8" />
                          <rect x="87" y="35" width="2" height="6" rx="1" fill="#ffffff" opacity="0.8" />
                        </g>
                      </svg>
                    )}
                    {idx === 1 && (
                      <svg viewBox="0 0 160 130" fill="none" className="cf-card-3d-model">
                        
                        <ellipse cx="80" cy="116" rx="58" ry="13" fill="url(#cfFloorGlow)" filter="blur(6px)" />
                        
                        <path d="M 28 102 C 28 114, 132 114, 132 102 L 132 108 C 132 120, 28 120, 28 108 Z" fill="url(#cfPedestalCylinder)" />
                        <ellipse cx="80" cy="102" rx="52" ry="12" fill="url(#cfPedestalTopGrad)" stroke="#c084fc" strokeWidth="1.4" />
                        <ellipse cx="80" cy="96" rx="44" ry="10" fill="#ffffff" fillOpacity="0.85" stroke="#d8b4fe" strokeWidth="1.2" />
                        <ellipse cx="80" cy="96" rx="34" ry="7.5" fill="none" stroke="#9333ea" strokeWidth="1.8" filter="url(#cfSoftGlow)" />
                        
                        <g>
                          <path d="M 40 90 C 40 76, 68 76, 68 90 Z" fill="url(#cfAvatarBody1)" stroke="#d8b4fe" strokeWidth="0.8" />
                          <circle cx="54" cy="56" r="11" fill="url(#cfAvatarSphere1)" stroke="#ffffff" strokeWidth="1" />
                          <ellipse cx="51" cy="52" rx="3" ry="1.8" fill="#ffffff" opacity="0.85" transform="rotate(-30 51 52)" />
                        </g>
                        
                        <g>
                          <path d="M 92 90 C 92 76, 120 76, 120 90 Z" fill="url(#cfAvatarBody1)" stroke="#d8b4fe" strokeWidth="0.8" />
                          <circle cx="106" cy="56" r="11" fill="url(#cfAvatarSphere1)" stroke="#ffffff" strokeWidth="1" />
                          <ellipse cx="103" cy="52" rx="3" ry="1.8" fill="#ffffff" opacity="0.85" transform="rotate(-30 103 52)" />
                        </g>
                        
                        <g filter="url(#cfSoftGlow)">
                          <path d="M 56 94 C 56 72, 104 72, 104 94 Z" fill="url(#cfAvatarBody2)" stroke="#ffffff" strokeWidth="1.4" />
                          <path d="M 70 82 C 74 86, 86 86, 90 82" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
                          <circle cx="80" cy="46" r="15" fill="url(#cfAvatarSphere2)" stroke="#ffffff" strokeWidth="1.6" />
                          <ellipse cx="75" cy="41" rx="5" ry="3" fill="#ffffff" opacity="0.95" transform="rotate(-25 75 41)" />
                          <circle cx="86" cy="52" r="1.5" fill="#ffffff" opacity="0.6" />
                        </g>
                      </svg>
                    )}
                    {idx === 2 && (
                      <svg viewBox="0 0 160 130" fill="none" className="cf-card-3d-model">
                        
                        <ellipse cx="80" cy="116" rx="54" ry="12" fill="url(#cfFloorGlow)" filter="blur(6px)" />
                        
                        <polygon points="34,76 80,98 126,76 80,56" fill="rgba(124, 58, 237, 0.2)" />
                        <polygon points="34,74 80,97 80,120 34,97" fill="url(#cfGlassSideLeft)" stroke="#c084fc" strokeWidth="1.2" />
                        <polygon points="80,97 126,74 126,97 80,120" fill="url(#cfGlassSideRight)" stroke="#a855f7" strokeWidth="1.2" />
                        <polygon points="80,52 126,74 80,97 34,74" fill="url(#cfGlassTopFace)" stroke="#ffffff" strokeWidth="1.6" filter="url(#cfSoftGlow)" />
                        <line x1="80" y1="97" x2="80" y2="120" stroke="#ffffff" strokeWidth="1.8" opacity="0.8" />
                        
                        <line x1="64" y1="74" x2="96" y2="74" stroke="#4c1d95" strokeWidth="4" strokeLinecap="round" />
                        <line x1="65" y1="74" x2="95" y2="74" stroke="#2e1065" strokeWidth="2.2" strokeLinecap="round" />
                        
                        <g filter="url(#cfSoftGlow)">
                          <polygon points="68,22 102,11 102,62 68,73" fill="#ffffff" stroke="#c084fc" strokeWidth="1.6" />
                          <polygon points="102,11 105,14 105,65 102,62" fill="#e2e8f0" />
                          <path d="M 77 42 L 84 50 L 96 34" stroke="#7c3aed" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </g>
                      </svg>
                    )}
                    {idx === 3 && (
                      <svg viewBox="0 0 160 130" fill="none" className="cf-card-3d-model">
                        
                        <ellipse cx="80" cy="110" rx="55" ry="12" fill="url(#cfFloorGlow)" filter="blur(6px)" />
                        
                        <g stroke="#d8b4fe" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="50" y1="58" x2="40" y2="53" />
                          <line x1="60" y1="63" x2="50" y2="58" />
                          <line x1="70" y1="68" x2="60" y2="63" />
                          <line x1="110" y1="58" x2="120" y2="53" />
                          <line x1="100" y1="63" x2="110" y2="58" />
                          <line x1="90" y1="68" x2="100" y2="63" />
                          <line x1="50" y1="78" x2="40" y2="83" />
                          <line x1="60" y1="83" x2="50" y2="88" />
                          <line x1="70" y1="88" x2="60" y2="93" />
                          <line x1="110" y1="78" x2="120" y2="83" />
                          <line x1="100" y1="83" x2="110" y2="88" />
                          <line x1="90" y1="88" x2="100" y2="93" />
                        </g>
                        
                        <polygon points="80,44 130,68 80,92 30,68" fill="#3b0764" stroke="#7c3aed" strokeWidth="1.4" />
                        <polygon points="80,92 130,68 130,76 80,100" fill="#2e1065" />
                        <polygon points="30,68 80,92 80,100 30,76" fill="#1e1035" />
                        
                        <polygon points="80,50 120,68 80,86 40,68" fill="url(#cfSiliconGrad)" stroke="#c084fc" strokeWidth="1.8" filter="url(#cfSoftGlow)" />
                        <polygon points="80,54 114,68 80,82 46,68" fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1" />
                        
                        <path
                          d="M 80 57 Q 80 68 91 68 Q 80 68 80 79 Q 80 68 69 68 Q 80 68 80 57 Z"
                          fill="#ffffff"
                          filter="url(#cfSoftGlow)"
                        />
                        <circle cx="80" cy="68" r="3.2" fill="#ffffff" />
                        <line x1="80" y1="52" x2="80" y2="84" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
                        <line x1="64" y1="68" x2="96" y2="68" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
                      </svg>
                    )}
                    {idx === 4 && (
                      <svg viewBox="0 0 160 130" fill="none" className="cf-card-3d-model">
                        
                        <ellipse cx="80" cy="116" rx="54" ry="12" fill="url(#cfFloorGlow)" filter="blur(6px)" />
                        
                        <path d="M 32 104 C 32 116, 128 116, 128 104 L 128 110 C 128 122, 32 122, 32 110 Z" fill="#4c1d95" />
                        <ellipse cx="80" cy="104" rx="48" ry="12" fill="url(#cfPedestalCylinder)" stroke="#c084fc" strokeWidth="1.2" />
                        <ellipse cx="80" cy="98" rx="38" ry="9" fill="#ffffff" fillOpacity="0.9" stroke="#d8b4fe" strokeWidth="1.2" />
                        <ellipse cx="80" cy="98" rx="28" ry="7" fill="none" stroke="#a855f7" strokeWidth="1.4" opacity="0.8" />
                        
                        <g filter="url(#cfSoftGlow)">
                          
                          <polygon points="42,20 49,14 109,74 102,80" fill="url(#cfBladeGrad)" stroke="#ffffff" strokeWidth="1.2" />
                          <line x1="45" y1="17" x2="105" y2="77" stroke="#c084fc" strokeWidth="1.2" />
                          <polygon points="98,69 111,64 113,71 100,76" fill="#7c3aed" stroke="#c084fc" strokeWidth="1.2" />
                          <line x1="105" y1="77" x2="116" y2="88" stroke="#4c1d95" strokeWidth="5" strokeLinecap="round" />
                          <circle cx="117" cy="89" r="4" fill="#c084fc" stroke="#ffffff" strokeWidth="1" />
                          
                          <polygon points="118,20 111,14 51,74 58,80" fill="url(#cfBladeGrad)" stroke="#ffffff" strokeWidth="1.2" />
                          <line x1="115" y1="17" x2="55" y2="77" stroke="#c084fc" strokeWidth="1.2" />
                          <polygon points="62,69 49,64 47,71 60,76" fill="#7c3aed" stroke="#c084fc" strokeWidth="1.2" />
                          <line x1="55" y1="77" x2="44" y2="88" stroke="#4c1d95" strokeWidth="5" strokeLinecap="round" />
                          <circle cx="43" cy="89" r="4" fill="#c084fc" stroke="#ffffff" strokeWidth="1" />
                          
                          <circle cx="80" cy="47" r="7" fill="#ffffff" />
                          <path d="M 80 34 L 80 60 M 67 47 L 93 47" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M 72 39 L 88 55 M 72 55 L 88 39" stroke="#e9d5ff" strokeWidth="1.5" strokeLinecap="round" />
                        </g>
                      </svg>
                    )}
                    {idx === 5 && (
                      <svg viewBox="0 0 160 130" fill="none" className="cf-card-3d-model">
                        
                        <ellipse cx="80" cy="118" rx="55" ry="12" fill="url(#cfFloorGlow)" filter="blur(6px)" />
                        
                        <path d="M 34 94 C 34 105, 126 105, 126 94 L 126 100 C 126 111, 34 111, 34 100 Z" fill="#3b0764" />
                        <ellipse cx="80" cy="94" rx="46" ry="11" fill="#4c1d95" stroke="#6d28d9" strokeWidth="1.2" />
                        <ellipse cx="80" cy="94" rx="36" ry="8" fill="none" stroke="#7c3aed" strokeWidth="1" opacity="0.7" />
                        
                        <path d="M 34 76 C 34 87, 126 87, 126 76 L 126 82 C 126 93, 34 93, 34 82 Z" fill="#581c87" />
                        <ellipse cx="80" cy="76" rx="46" ry="11" fill="#7c3aed" stroke="#9333ea" strokeWidth="1.4" />
                        <ellipse cx="80" cy="76" rx="36" ry="8" fill="none" stroke="#c084fc" strokeWidth="1.2" opacity="0.8" />
                        
                        <path d="M 34 58 C 34 69, 126 69, 126 58 L 126 64 C 126 75, 34 75, 34 64 Z" fill="#6d28d9" />
                        <ellipse cx="80" cy="58" rx="46" ry="11" fill="url(#cfPedestalTopGrad)" stroke="#c084fc" strokeWidth="1.6" />
                        <ellipse cx="80" cy="58" rx="37" ry="8.5" fill="#ffffff" fillOpacity="0.85" stroke="#d8b4fe" strokeWidth="1.2" />
                        <ellipse cx="80" cy="58" rx="27" ry="6" fill="none" stroke="#a855f7" strokeWidth="1.2" opacity="0.8" />
                        
                        <g filter="url(#cfSoftGlow)">
                          <path
                            d="M 66 58 C 59 50, 51 66, 59 58 C 67 50, 85 66, 93 58 C 101 50, 93 66, 85 58 C 77 50, 59 66, 66 58 Z"
                            stroke="#ffffff"
                            strokeWidth="3.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                          <path
                            d="M 66 58 C 59 50, 51 66, 59 58 C 67 50, 85 66, 93 58 C 101 50, 93 66, 85 58 C 77 50, 59 66, 66 58 Z"
                            stroke="#a855f7"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            opacity="0.9"
                          />
                        </g>
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          
          <div className="cf-reinvented-flow-row">
            <div className="cf-flow-pill">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#7c3aed">
                <path d="M6 4l15 8-15 8V4z" />
              </svg>
              <span>Chat Decides</span>
            </div>

            <span className="cf-flow-arrow" aria-hidden="true">→</span>

            <div className="cf-flow-pill">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <circle cx="8" cy="7" r="2" fill="#7c3aed" />
                <line x1="4" y1="17" x2="20" y2="17" />
                <circle cx="16" cy="17" r="2" fill="#7c3aed" />
              </svg>
              <span>AI Generates</span>
            </div>

            <span className="cf-flow-arrow" aria-hidden="true">→</span>

            <div className="cf-flow-pill">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="4" />
                <line x1="6" y1="12" x2="10" y2="12" />
                <line x1="8" y1="10" x2="8" y2="14" />
                <circle cx="15" cy="11" r="1" fill="#7c3aed" />
                <circle cx="17" cy="13" r="1" fill="#7c3aed" />
              </svg>
              <span>Streamer Plays</span>
            </div>

            <span className="cf-flow-arrow" aria-hidden="true">→</span>

            <div className="cf-flow-pill is-highlighted">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 4h-2V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1H5a2 2 0 0 0-2 2v2a5 5 0 0 0 4 4.9V15a3 3 0 0 0 2 2.83V20H7a1 1 0 0 0 0 2h10a1 1 0 0 0 0-2h-2v-2.17A3 3 0 0 0 17 15v-2.1A5 5 0 0 0 21 8V6a2 2 0 0 0-2-2zM5 8V6h2v4.83A3 3 0 0 1 5 8zm14 0a3 3 0 0 1-2 2.83V6h2z" />
              </svg>
              <span>Audience Wins</span>
            </div>
          </div>
        </div>
      </section>

      
      <section className="cf-twitch-era-section">
        <div className="cf-twitch-era-billboard">
          
          <div className="cf-era-shard cf-era-shard-tl">
            <img
              src="/img/twitch01.webp"
              alt="Twitch Arena Vault"
              className="cf-era-img-tl"
              loading="lazy"
            />
          </div>

          
          <div className="cf-era-shard cf-era-shard-bl">
            <img
              src="/img/twitch02.webp"
              alt="Streamer Broadcaster"
              className="cf-era-img-bl"
              loading="lazy"
            />
          </div>

          
          <div className="cf-era-shard cf-era-shard-right">
            <img
              src="/img/twitch03.webp"
              alt="Colossus Mech"
              className="cf-era-img-right"
              loading="lazy"
            />
          </div>

          
          <svg
            className="cf-era-neon-overlay"
            viewBox="0 0 1000 580"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <filter id="cfEraGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#c084fc" floodOpacity="0.9" />
                <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#a855f7" floodOpacity="0.65" />
              </filter>
            </defs>

            
            <polyline
              points="288,0 228,290 0,255"
              fill="none"
              stroke="#c084fc"
              strokeWidth="2.2"
              filter="url(#cfEraGlow)"
            />

            
            <polyline
              points="0,331 264,371 192,580"
              fill="none"
              stroke="#c084fc"
              strokeWidth="2.2"
              filter="url(#cfEraGlow)"
            />

            
            <line
              x1="769"
              y1="0"
              x2="694"
              y2="580"
              stroke="#c084fc"
              strokeWidth="2.4"
              filter="url(#cfEraGlow)"
            />
          </svg>

          
          <div className="cf-twitch-era-center-content">
            
            <div className="cf-era-top-badge">
              <span className="cf-era-line" />
              <div className="cf-era-twitch-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                  <path
                    d="M4.5 3L3 6.75V20.25H7.5V23.25L10.5 20.25H14.25L21 13.5V3H4.5Z"
                    stroke="#c084fc"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                    fill="rgba(192, 132, 252, 0.15)"
                  />
                  <path d="M10.5 7.5V12.75" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
                  <path d="M15.75 7.5V12.75" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="cf-era-line" />
            </div>

            
            <h2 className="cf-era-headline-row1">THE NEW ERA OF</h2>
            <h2 className="cf-era-headline-row2">TWITCH INTERACTION</h2>

            
            <p className="cf-era-description">
              Where streams become interactive games, and your audience doesn’t just watch: they
              play, create, and challenge you in real time.
            </p>

            
            <a href="/arena?renderer=unity" className="cf-era-cta-button">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M6 4l15 8-15 8V4z" />
              </svg>
              <span>ENTER THE ARENA</span>
            </a>
          </div>

          
          <div className="cf-era-bottom-crown" aria-hidden="true">
            <svg viewBox="0 0 160 40" fill="none" width="140" height="36">
              <path
                d="M10 40 L35 8 L80 30 L125 8 L150 40"
                stroke="#a855f7"
                strokeWidth="1.6"
                strokeOpacity="0.45"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </section>

      
      <footer className="cf-footer">
        
        <div className="cf-footer-cyber-top-left" aria-hidden="true" />
        <div className="cf-footer-cyber-bot-left" aria-hidden="true" />
        <div className="cf-footer-cyber-top-right" aria-hidden="true" />
        <div className="cf-footer-cyber-bot-right" aria-hidden="true" />

        
        <div className="cf-footer-twitch-watermark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="220" height="220" fill="currentColor">
            <path d="M4.5 3L3 6.75V20.25H7.5V23.25L10.5 20.25H14.25L21 13.5V3H4.5ZM19.5 12.75L16.5 15.75H13.5L11.25 18V15.75H7.5V4.5H19.5V12.75Z" />
            <path d="M15.75 7.5H14.25V12H15.75V7.5Z" />
            <path d="M11.25 7.5H9.75V12H11.25V7.5Z" />
          </svg>
        </div>

        <div className="cf-footer-container">
          
          <div className="cf-footer-grid">
            
            <div className="cf-footer-col-brand">
              <div className="cf-footer-brand-title">
                <div className="cf-footer-brand-gem">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
                    <path d="M12 2L2 12l10 10 10-10L12 2z" stroke="#06b6d4" strokeWidth="2.4" strokeLinejoin="round" />
                    <path d="M12 6.5L6.5 12l5.5 5.5 5.5-5.5-5.5-5.5z" fill="#06b6d4" fillOpacity="0.45" stroke="#22d3ee" strokeWidth="1.4" />
                  </svg>
                </div>
                <h3>CrowdForge</h3>
              </div>

              <p className="cf-footer-brand-desc">
                Streamer vs Twitch Chat Interactive Survival Arena.
              </p>

              
              <div className="cf-footer-socials">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="cf-footer-social-btn"
                  aria-label="GitHub"
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </a>
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noreferrer"
                  className="cf-footer-social-btn"
                  aria-label="Discord"
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </a>
                <a
                  href="https://twitch.tv"
                  target="_blank"
                  rel="noreferrer"
                  className="cf-footer-social-btn"
                  aria-label="Twitch"
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                  </svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="cf-footer-social-btn"
                  aria-label="YouTube"
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>

            
            <div className="cf-footer-col">
              <div className="cf-footer-col-header">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="cf-footer-col-icon">
                  <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                <h4>EXPERIENCE</h4>
              </div>
              <ul className="cf-footer-link-list">
                <li>
                  <a href="/arena?renderer=unity" className="cf-footer-link">
                    Unity 3D Arena
                  </a>
                </li>
                <li>
                  <a href="/dashboard" className="cf-footer-link">
                    Control Room
                  </a>
                </li>
                <li>
                  <a href="/overlay" className="cf-footer-link">
                    OBS Stream Overlay
                  </a>
                </li>
              </ul>
            </div>

            
            <div className="cf-footer-col">
              <div className="cf-footer-col-header">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="cf-footer-col-icon">
                  <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
                </svg>
                <h4>RESOURCES</h4>
              </div>
              <ul className="cf-footer-link-list">
                <li>
                  <button type="button" className="cf-footer-disabled-link">
                    <span>Documentation</span>
                    <span className="cf-coming-soon-badge">Coming Soon</span>
                  </button>
                </li>
                <li>
                  <button type="button" className="cf-footer-disabled-link">
                    <span>Game Design</span>
                    <span className="cf-coming-soon-badge">Coming Soon</span>
                  </button>
                </li>
                <li>
                  <button type="button" className="cf-footer-disabled-link">
                    <span>Tech Stack</span>
                    <span className="cf-coming-soon-badge">Coming Soon</span>
                  </button>
                </li>
              </ul>
            </div>

            
            <div className="cf-footer-col">
              <div className="cf-footer-col-header">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="cf-footer-col-icon">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
                </svg>
                <h4>EVENT</h4>
              </div>
              <ul className="cf-footer-link-list">
                <li>
                  <button type="button" className="cf-footer-disabled-link">
                    <span>What&apos;s New</span>
                    <span className="cf-coming-soon-badge">Coming Soon</span>
                  </button>
                </li>
                <li>
                  <a href="#community" className="cf-footer-link">
                    Community
                  </a>
                </li>
                <li>
                  <button type="button" className="cf-footer-disabled-link">
                    <span>Updates</span>
                    <span className="cf-coming-soon-badge">Coming Soon</span>
                  </button>
                </li>
              </ul>
            </div>

            
            <div className="cf-footer-twitch-card-col">
              <div className="cf-footer-twitch-card">
                <div className="cf-twitch-card-title">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cf-twitch-crown-icon">
                    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" />
                  </svg>
                  <h4>Play Live on Twitch</h4>
                </div>
                <p className="cf-twitch-card-desc">
                  Join a stream, influence the chaos, and shape the next round in real-time.
                </p>
                <a
                  href="https://twitch.tv"
                  target="_blank"
                  rel="noreferrer"
                  className="cf-footer-twitch-btn"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                  </svg>
                  <span>Watch on Twitch</span>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          
          <div className="cf-footer-bottom-bar">
            <p className="cf-footer-copy">
              &copy; 2026 CrowdForge. All rights reserved.
            </p>

            <div className="cf-footer-legal-links">
              <button type="button" className="cf-footer-legal-link">
                <span>Privacy</span>
                <span className="cf-coming-soon-badge">Coming Soon</span>
              </button>
              <button type="button" className="cf-footer-legal-link">
                <span>Terms</span>
                <span className="cf-coming-soon-badge">Coming Soon</span>
              </button>
              <button type="button" className="cf-footer-legal-link">
                <span>License</span>
                <span className="cf-coming-soon-badge">Coming Soon</span>
              </button>
              <button type="button" className="cf-footer-legal-link">
                <span>Cookie</span>
                <span className="cf-coming-soon-badge">Coming Soon</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
