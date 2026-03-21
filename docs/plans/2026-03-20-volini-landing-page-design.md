# Volini Landing Page — Design Specification
**Date:** 2026-03-20
**Status:** Approved for Implementation

---

## Overview

Redesign the Volini landing page to create an awwwards-level experience that:
1. Communicates Volini as a rebel disruptor / car enthusiast AI
2. Speaks to B2B2C audience (auto manufacturers & dealerships)
3. Showcases the product with a compelling demo
4. Drives action through clear CTAs

---

## Aesthetic

**Theme:** Dithered Neon / CRT Cyberpunk
**Primary Palette:**
- Background: `#09090b` (true black)
- Primary: `#8B5CF6` (violet)
- Accent: `#EC4899` (pink)
- Highlight: `#22D3EE` (cyan neon)
- Surface: `rgba(255,255,255,0.03)`
- Text: `#ffffff` / `rgba(255,255,255,0.6)`

**Typography:** Geist Sans (body) + Geist Mono (terminal/tech)
**Motion:** Staggered reveals, ambient pulses, glitch effects

---

## Page Structure

### 1. Hero Section
**Component:** `hero-dithering` from @cult-ui
**Content:**
- Headline: "Finally. An AI that speaks car."
- Tagline: "The only AI co-pilot that's actually obsessed with automobiles."
- Sub-copy: "Volini knows every car made since 1900. Every spec. Every story. Ask anything — from 'What was the MSRP of a 1969 Boss 302?' to 'Why does the Porsche 911 silhouette matter?' — and get answers like you're chatting with a fellow gearhead."
- CTAs: "See Volini in Action" (scroll to demo)
- Tech badges: LiveKit · OpenAI · Faster Whisper · Kokoro TTS

### 2. Demo Section
**Purpose:** Show Volini's personality and capabilities through a real conversation
**Components:**
- `AgentAudioVisualizerAura` (enhanced) — audio visualizer with states (idle/listening/thinking/speaking)
- `terminal-animation` — scripted Ferrari F40 conversation
- "Wake up Volini" button → LiveKit room

**Demo Conversation:**
```
User: "Tell me about the Ferrari F40"

Volini: "The F40 is where Ferrari said 'we're done with rules.' 
        1987. 478 horsepower from a twin-turbo V8. No ABS. 
        No airbags. The last car Enzo Ferrari personally approved.
        
        It wasn't built for comfort or safety — it was built 
        for drivers who believed the road was a cathedral.
        
        Today, pristine examples sell for $2-3M. But the real 
        F40 experience? Finding a mountain pass at 6am and 
        remembering why we fell in love with cars in the first place."
        
User: "How does it compare to the new SF90?"

Volini: "Totally different philosophies. The SF90 is 986hp of 
        hybrid fury — it's the future Ferrari HAS to build.
        
        But 'faster' and 'better' aren't synonyms. The F40 
        weighs 1,200 pounds less. No power steering. No 
        driving modes. Just you, the wheel, and 478 horses 
        screaming behind your head.
        
        The SF90 will outrun it in a straight line. But 
        on a winding road? The F40 still smiles harder."
```

### 3. Stats Section
**Purpose:** Build credibility with concrete numbers
**Layout:** 4-column grid with animated numbers
**Stats:**
1. "50,000+" — Vehicle models in database
2. "<1s" — Average response latency
3. "1900—" — Years of automotive knowledge
4. "100%" — Privacy-first, runs locally

**Component:** `animated-number` from @cult-ui

### 4. Features Section
**Section Title:** "What Volini Brings to Your Showroom"
**Layout:** Bento grid — 4 cards
**Components:** `minimal-card` or `texture-card` from @cult-ui

**Cards:**
| Card | Title | Description |
|------|-------|-------------|
| 1 | "Speaks Fluent Car" | Every model, every era, every manufacturer — from AMC to Zenvo. Volini's knowledge runs deeper than any salesman. |
| 2 | "Answers Before You Finish Asking" | Sub-second latency. Volini responds faster than you can think of your next question. |
| 3 | "No Games. Just Truth." | Dealer markups, useless add-ons, hidden fees — Volini tells you what it's really worth. |
| 4 | "Built for Privacy" | Runs locally. Your questions stay private. No cloud dependency, no data harvesting. |

### 5. B2B Section
**Section Title:** "For Auto Companies"
**Headline:** "Your showroom, transformed."
**Sub-headline:** "Volini isn't just another voice assistant. It's the expert your customers didn't know they needed."

**Use Cases (3 columns):**
| Showroom | Service Center | Events |
|----------|----------------|--------|
| Customer sits in a new X5, asks "How does this compare to the Q7?" — Volini answers instantly, builds confidence. | "Why is my check engine light on?" — explained in plain English, not mechanic-speak. Reduces call center volume. | Auto shows, product launches — any question about any vehicle on the floor, answered in real-time. |

### 6. CTA Section
**Background:** Full-width animated dithered gradient
**Headline:** "Ready to give your customers an experience they won't forget?"
**Primary CTA:** "Wake up Volini"
**Secondary CTA:** "Partner with us"
**Tagline:** "No more 'let me check with my manager.' No more vague answers. Just clarity."

---

## Component Inventory

| Component | Source | Purpose |
|-----------|--------|---------|
| `hero-dithering` | @cult-ui | Hero section with shader visual |
| `terminal-animation` | @cult-ui | Demo conversation display |
| `minimal-card` | @cult-ui | Feature cards |
| `texture-card` | @cult-ui | Feature cards with texture |
| `cosmic-button` | @cult-ui | CTA buttons with glow |
| `bg-animated-gradient` | @cult-ui | Section backgrounds |
| `distorted-glass` | @cult-ui | Glass overlays |
| `text-animate` | @cult-ui | Section reveal animations |
| `animated-number` | @cult-ui | Stats with counting animation |
| `AgentAudioVisualizerAura` | existing | Audio visualizer for demo |
| `Badge` | shadcn/ui | Tech stack badges |
| `Button` | shadcn/ui | CTAs |
| `Card` | shadcn/ui | Container elements |

---

## Technical Notes

- Use existing `AgentAudioVisualizerAura` component, enhance with new states
- Terminal animation tabs: "F40 Introduction" and "F40 vs SF90 Comparison"
- All copy in English — no Chinese characters
- Responsive breakpoints: 375px, 768px, 1024px, 1440px
- Respect `prefers-reduced-motion`

---

## Files to Create/Modify

- `app/page.tsx` — Complete redesign with all sections
- `components/landing/` — New folder for landing page components
  - `HeroSection.tsx`
  - `DemoSection.tsx`
  - `StatsSection.tsx`
  - `FeaturesSection.tsx`
  - `B2BSection.tsx`
  - `CTASection.tsx`
- `components/ui/animated-number.tsx` — Add via shadcn
- Update globals.css if needed for new animations
