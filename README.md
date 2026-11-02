# CrowdForge

> Streamer vs Twitch Chat Interactive Survival Arena

Your viewers do not just watch the stream. They decide what challenges you face next.

CrowdForge turns Twitch chat into an interactive encounter engine. During every round, viewers vote on elements using `!forge <ingredient>` (Ice, Gravity, Storm, Mirror, Clones, Fire). When the countdown ends, the AI Encounter Engine synthesizes the audience votes into custom hazards, bosses, and environmental modifiers. You survive the round, or the chat claims victory.

---

## What Makes It Special

- **Live Chat Voting**: Viewers use `!forge <element>` in Twitch chat. Every viewer gets one vote per round, keeping voting fair and balanced.
- **Unity 6 3D Arena**: Fast-paced 3D survival combat rendered directly in the browser via WebGL with responsive controls, dashes, and projectile mechanics.
- **AI Encounter Director**: Dynamically weaves top community ingredients into creative encounter titles, active arena hazards, and battle narration.
- **Fail-Safe Procedural Engine**: If AI services are busy or keys are not provided, built-in algorithmic recipes guarantee every round remains fun and fully playable.
- **Streamer Control Room**: A protected dashboard for streamers to adjust round lengths, trigger manual bursts, monitor contributor counts, and manage live state.
- **Transparent OBS Overlay**: A clean broadcast HUD ready to drop into OBS as a browser source over your captured arena.

---

## Core Ingredients

| Ingredient | In-Game Hazard |
| :--- | :--- |
| **Ice** | Low-friction surfaces with slippery momentum and freezing pulses |
| **Gravity** | Gravitational wells pulling player movement and altering projectile paths |
| **Storm** | Random lightning strikes and periodic static discharge zones |
| **Mirror** | Kinetic barrier walls that reflect incoming shots back across the arena |
| **Clones** | Illusions and split swarms that divide when attacked |
| **Fire** | Scorched terrain, magma patches, and burning damage over time |

---

## Project Architecture

CrowdForge is organized as a clean pnpm workspace monorepo:

- `apps/web`: React 19 single-page application built with Vite, Tailwind CSS, Lucide icons, and the embedded Unity 6 WebGL player.
- `apps/server`: Node.js and Express backend with Socket.IO for real-time synchronization, Twitch EventSub chat ingestion, and the AI Encounter Engine.
- `apps/shared`: Shared TypeScript contracts, validation schemas (Zod), and event interfaces.
- `unity/CrowdForge`: Unity 6 Universal Render Pipeline (URP) project compiled to WebGL.

---

## Quick Start

### Prerequisites
- Node.js 24+ and Corepack enabled
- pnpm package manager (`corepack enable && corepack pnpm install`)

### 1. Installation
```sh
corepack pnpm install
```

### 2. Environment Setup
Copy the example environment file:
```sh
cp .env.example .env
```
*(On Windows PowerShell, use `Copy-Item .env.example .env`)*

Open `.env` and set your preferred keys:
```env
PORT=4000
SESSION_SECRET=your_super_secret_session_key
CREATOR_PASSWORD=your_admin_password
AI_API_KEY=your_api_key_here
```
*(Twitch credentials and AI keys are optional for local testing; demo mode and local fallback are enabled by default.)*

### 3. Run Development Servers
```sh
corepack pnpm dev
```
- Web Application: http://localhost:5173
- Backend Server: http://localhost:4000

To run the unified production build:
```sh
corepack pnpm build
corepack pnpm start
```
Then visit http://localhost:4000.

---

## How to Play

1. Open **Control Room** (`/dashboard` or `/control`).
2. Enter your creator password to unlock streamer controls.
3. Click **Start** to open a new round.
4. Have your chat type `!forge <ingredient>` (or click ingredient buttons in Demo Mode).
5. Watch the timer count down, and click **Forge Now** to lock in the recipe.
6. Open the **Unity 3D Arena** (`/arena`) and survive the customized hazards!

### Arena Controls
- **WASD / Arrows**: Move
- **Space**: Dash
- **Mouse Aim + Left Click**: Aim and shoot
- **M**: Toggle audio

---

## OBS Broadcast Setup

1. In OBS, add a new **Browser Source**.
2. Set the URL to `http://localhost:4000/overlay` (or your deployed URL).
3. Set the dimensions to **1920x1080**.
4. The background is completely transparent. Place it on top of your window capture of the arena.
