'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useProtocol } from '@/hooks/useProtocol';
import { useTabData } from '@/hooks/useTabData';
import { useForceDarkTheme } from '@/hooks/useForceDarkTheme';
import TelemetryVisualizer from '@/components/TelemetryVisualizer';
import styles from './page.module.css';

import { collection, query, orderBy, getDoc, getDocs, addDoc, deleteDoc, doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Connectors } from '@/lib/connectorEngine';
import SocialHub from '@/components/social/SocialHub';
import TribeHub from '@/components/social/TribeHub';
import PronoiaLab from '@/components/lab/PronoiaLab';
import ChessLab from '@/components/games/ChessLab';
import MonkMode from '@/components/manager/MonkMode';
import { useChat } from '@/hooks/useChat';
import FloatingChat from '@/components/social/FloatingChat';
import SpotifyMiniPlayer from '@/components/social/SpotifyMiniPlayer';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import TabManager from '@/components/manager/TabManager';
import AgentsTab from '@/components/lifeos/AgentsTab';
import DashboardTab from '@/components/lifeos/DashboardTab';
import VaultTab from '@/components/lifeos/VaultTab';
import BiometricsTab from '@/components/lifeos/BiometricsTab';
import StoreTab from '@/components/lifeos/StoreTab';
import ConnectorsTab from '@/components/lifeos/ConnectorsTab';
import NorthStarTab from '@/components/lifeos/NorthStarTab';
import ProfileTab from '@/components/lifeos/ProfileTab';
import GymTab from '@/components/lifeos/GymTab';
import BehaviorTab from '@/components/lifeos/BehaviorTab';
import SkillLabModal from '@/components/SkillLabModal';
import SkillLabErrorBoundary from '@/components/SkillLabErrorBoundary';
import UpgradePrompt from '@/components/UpgradePrompt';
import { connectorLimit } from '@/lib/tiers';
import LearnYourWay from '@/components/LearnYourWay';
import FrequencyEngine from '@/components/frequency/FrequencyEngine';
import CinematicThemeSwitcher from '@/components/ui/cinematic-theme-switcher';
import { GlassCalendar } from '@/components/ui/glass-calendar';
import { ShineBorder } from '@/components/ui/shine-border';
import { AnimatedStatsCard } from '@/components/ui/card-4';
import { BadgeDelta } from '@/components/ui/badge-delta';
import PricingCardComponent from '@/components/ui/pricing-card-component';
import { Heart, Activity, Moon, TrendingUp, TrendingDown } from 'lucide-react';


/* ─── Constants ─── */
const AGENTS = [
  { id: 'A.01', name: 'Neuro-Cognitive', role: 'FLOW ARCHITECT' },
  { id: 'A.02', name: 'Metabolic Director', role: 'FUEL SCHEDULER' },
  { id: 'A.03', name: 'Circadian Guardian', role: 'LIGHT & TEMPERATURE' },
  { id: 'A.04', name: 'Recovery Conductor', role: 'LOAD BALANCER' },
  { id: 'A.05', name: 'Behavioral Anchor', role: 'HABIT ENFORCER' },
  { id: 'A.06', name: 'Orchestrator', role: 'META-AGENT' },
  { id: 'A.07', name: 'NorthStar', role: 'FUTURE SELF' }
];
const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
const AVATAR_PRESETS = [
  { name: 'Cyber-Neophyte', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200' },
  { name: 'Flow Master', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
  { name: 'Circadian Guardian', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200' },
  { name: 'Metabolic Sage', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' }
];



const renderNavIcon = (id, active) => {
  const color = active ? 'var(--cobalt-bright)' : 'var(--text3)';
  const strokeWidth = 2;
  
  switch (id) {
    case 'apps':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'dashboard':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'biometrics':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case 'skills':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M10 2v6L4.2 18.5A2 2 0 0 0 6 21h12a2 2 0 0 0 1.8-2.5L14 8V2h-4z" />
          <path d="M6 16h12" />
        </svg>
      );
    case 'store':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case 'connectors':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'vault':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case 'agents':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M12 2a10 10 0 0 1 10 10v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4A10 10 0 0 1 12 2z" />
          <path d="M12 18v3" />
          <path d="M8 21h8" />
          <circle cx="9" cy="11" r="1" />
          <circle cx="15" cy="11" r="1" />
        </svg>
      );
    case 'social':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'tribe':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'lab':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M4.7 19h14.6" />
          <path d="M9 3h6" />
          <path d="M10 3v5L5.8 17.6A2 2 0 0 0 7.6 20h8.8a2 2 0 0 0 1.8-2.4L14 8V3h-4z" />
        </svg>
      );
    case 'games':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <rect x="2" y="6" width="20" height="12" rx="3" />
          <path d="M6 12h4" />
          <path d="M8 10v4" />
          <line x1="15" y1="11" x2="15.01" y2="11" strokeWidth="3" />
          <line x1="18" y1="13" x2="18.01" y2="13" strokeWidth="3" />
        </svg>
      );
    case 'manager':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      );
    case 'northstar':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <polygon points="12 2 14.4 9.2 22 9.6 16 14.2 18 21.4 12 17.2 6 21.4 8 14.2 2 9.6 9.6 9.2" />
        </svg>
      );
    case 'frequencies':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <line x1="3" y1="12" x2="5" y2="12" />
          <line x1="8" y1="6" x2="8" y2="18" />
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="16" y1="8" x2="16" y2="16" />
          <line x1="19" y1="11" x2="21" y2="11" />
        </svg>
      );
    case 'monk-mode':
    case 'monk_mode':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'gym':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <rect x="1" y="9" width="3" height="6" rx="1" />
          <rect x="4" y="7" width="3" height="10" rx="1" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <rect x="17" y="7" width="3" height="10" rx="1" />
          <rect x="20" y="9" width="3" height="6" rx="1" />
        </svg>
      );
    case 'behavior':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M17 2.1 21 6l-4 3.9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <path d="M7 21.9 3 18l4-3.9" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      );
    case 'learn-your-way':
    case 'auto_stories':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.3s ease' }}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    default:
      return null;
  }
};

// On-brand placeholder "mockup" image for blueprints until real artwork is supplied.
// Returns a self-contained SVG data-URI tinted by category — swap `image` for a real URL later.
const BP_CAT_COLOR = { BIOHACKING: '#1A6AFF', LONGEVITY: '#2DD4BF', SLEEP: '#8B5CF6' };
function blueprintMock(category, name = '') {
  const c = BP_CAT_COLOR[(category || '').toUpperCase()] || '#1A6AFF';
  const label = (category || 'PROTOCOL').toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>`
    + `<defs>`
    + `<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#070709'/><stop offset='1' stop-color='${c}' stop-opacity='0.30'/></linearGradient>`
    + `<radialGradient id='r' cx='0.72' cy='0.28' r='0.65'><stop offset='0' stop-color='${c}' stop-opacity='0.38'/><stop offset='1' stop-color='${c}' stop-opacity='0'/></radialGradient>`
    + `</defs>`
    + `<rect width='600' height='400' fill='url(#g)'/><rect width='600' height='400' fill='url(#r)'/>`
    + `<circle cx='300' cy='176' r='66' fill='none' stroke='${c}' stroke-opacity='0.55' stroke-width='1.5'/>`
    + `<circle cx='300' cy='176' r='104' fill='none' stroke='${c}' stroke-opacity='0.22' stroke-width='1'/>`
    + `<text x='300' y='298' text-anchor='middle' font-family='monospace' font-size='17' letter-spacing='6' fill='${c}' fill-opacity='0.92'>${label}</text>`
    + `<text x='300' y='328' text-anchor='middle' font-family='monospace' font-size='10' letter-spacing='4' fill='#ffffff' fill-opacity='0.4'>PRONOIA PROTOCOL</text>`
    + `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    subtitle: 'Core Life OS System',
    price: 0,
    period: 'Dauerhaft',
    badge: 'ENTRY LEVEL',
    description: 'Für Bio-Cognitive Adepts, die ihr System manuell verwalten und das zirkadiane Kern-Protokoll austesten möchten.',
    features: [
      { text: 'Zugang zum Life OS Dashboard', available: true },
      { text: 'Max. 2 API-Konnektoren', available: true },
      { text: 'Zirkadianer Kalender & Skill Lab', available: true },
      { text: 'Automatisierte Nootropika-Refills', available: false },
      { text: 'Bio-Adaptive Fuel (curated meals)', available: false },
      { text: 'Functional Gear (Shell V1 Apparel)', available: false },
    ],
    ctaText: 'Kostenlos starten',
    accentColor: 'var(--text3)'
  },
  {
    id: 'premium',
    name: 'Premium',
    subtitle: 'Nootropics & Bio-Fuel Sync',
    price: 59,
    period: 'Monat',
    badge: 'POPULÄR',
    description: 'Für High-Performer, die ihre kognitiven Zyklen physisch mit nootropischen Refills und bio-nutritiven Lebensmittel-Boxen koppeln wollen.',
    features: [
      { text: 'Zugang zum Life OS Dashboard', available: true },
      { text: 'Unbegrenzte API-Konnektoren', available: true },
      { text: 'Zirkadianer Kalender & Skill Lab', available: true },
      { text: 'Automatisierte PX-V1 Refills', available: true },
      { text: 'Bio-Adaptive Fuel (curated meals)', available: true },
      { text: 'Functional Gear (Shell V1 Apparel)', available: false },
    ],
    ctaText: 'Premium aktivieren',
    accentColor: 'var(--theme-accent, var(--cobalt-bright))',
    featured: true
  },
  {
    id: 'max',
    name: 'Max',
    subtitle: 'Biometrics & Apparel Shield',
    price: 99,
    period: 'Monat',
    badge: 'ULTIMATIVE ERFAHRUNG',
    description: 'Das ultimative Pronoia-Substrat. Umfassende Biometrie-Kalibrierung, maximale Nährstoffzufuhr und quartalsweises Shell V1 Gear.',
    features: [
      { text: 'Zugang zum Life OS Dashboard', available: true },
      { text: 'Unbegrenzte API-Konnektoren', available: true },
      { text: 'Zirkadianer Kalender & Skill Lab', available: true },
      { text: 'Automatisierte PX-V1 Refills', available: true },
      { text: 'Erweiterte Bio-Meals & Superfoods', available: true },
      { text: 'Shell V1 Textile Apparel (Kleidung)', available: true },
    ],
    ctaText: 'System maximieren',
    accentColor: 'var(--tan)'
  }
];

const STORE_PRODUCTS = {
  apparel: [
    { id: 'gots_tee', name: 'GOTS Organic Tee', price: 120, desc: '100% chemiefreie, zertifizierte Bio-Baumwolle. Schützt die Hautbarriere vor Disruptoren.', badge: 'TEXTIL', status: 'AUF LAGER', tags: ['Organic', 'Toxin-Free', 'SkinShield'] },
    { id: 'barefoot_shoes', name: 'Pronoia Barefoot Shoes', price: 290, desc: 'Maximiert sensorisches Feedback, weitet die Zehenbox und reaktiviert Fußmuskulatur.', badge: 'FOOTWEAR', status: 'BEGRENZT', tags: ['Ergonomic', 'Proprioception', 'Zero-Drop'] },
    { id: 'merino_blazer', name: 'Merino Wool Blazer', price: 350, desc: 'Klimaregulierend, geruchsneutral und frei von synthetischen PFAS-Beschichtungen.', badge: 'APPAREL', status: 'AUF LAGER', tags: ['Merino', 'Thermoregulation', 'PFAS-Free'] },
    { id: 'grounding_sandals', name: 'Grounding Sandals', price: 180, desc: 'Sohle mit Kupfer-Plug zur elektrischen Erdung mit der Erdoberfläche.', badge: 'BIO-HACK', status: 'AUF LAGER', tags: ['Grounding', 'Bio-Electric', 'Earthing'] }
  ],
  supplements: [
    { id: 'mg_threonate', name: 'Magnesium-L-Threonat', price: 80, desc: 'Passiert die Blut-Hirn-Schranke zur Maximierung kognitiver Synapsen-Dichte.', badge: 'NOOTROPIC', status: 'AUTO-REFILL', tags: ['BBB-Crossing', 'Synapse-Density', 'Sleep'] },
    { id: 'alpha_gpc', name: 'Alpha-GPC Matrix', price: 90, desc: 'Direkter Cholin-Spender. Verbessert die Signalübertragung im Gehirn.', badge: 'FOCUS-FUEL', status: 'AUTO-REFILL', tags: ['Choline-Donor', 'Acetylcholine', 'Signal-Speed'] },
    { id: 'px_v1', name: 'PX-V1 Nootropic Core', price: 150, desc: 'Nootropisches Master-Substrat zur Steigerung von Fokus und Ausdauer.', badge: 'CORE-STACK', status: 'VERFÜGBAR', tags: ['Master-Formula', 'High-Stamina', 'Focus'] },
    { id: 'bromantane', name: 'Bromantane Formel', price: 120, desc: 'Fördert die Dopamin-Resynthese nachhaltig ohne Rezeptoren-Downregulation.', badge: 'DOPAMIN', status: 'VERFÜGBAR', tags: ['Dopamine-Synthesizer', 'Non-Depleting', 'Mood'] }
  ],
  food: [
    { id: 'microgreens', name: 'Frische Bio-Microgreens', price: 60, desc: 'Lebende Sprossen mit der 40-fachen Nährstoffdichte von ausgewachsenem Gemüse.', badge: 'SUPERFOOD', status: 'VERFÜGBAR', tags: ['Soil-to-Table', '40x-Density', 'Vitamins'] },
    { id: 'adaptogen_powder', name: 'Raw Adaptogen Complex', price: 90, desc: 'Mischung aus Cordyceps & Lion\'s Mane Extrakten zur Stressregulation.', badge: 'ADAPTOGEN', status: 'AUF LAGER', tags: ['Cordyceps', 'Lions-Mane', 'Stress-Control'] },
    { id: 'cacao_nibs', name: 'Rohe Kakao Nibs (Bio)', price: 50, desc: 'Mineralstoff-Bombe reich an Magnesium und zellschützenden Polyphenolen.', badge: 'ANTIOXIDANT', status: 'AUF LAGER', tags: ['Raw-Cacao', 'Polyphenols', 'Magnesium'] }
  ]
};


/* ─── Gate Screen ─── */
function GateScreen({ reason }) {
  const isAuth = reason === 'auth';
  const searchParams = useSearchParams();
  const tgId = searchParams.get('tg_id');
  const authUrl = tgId ? `/auth?tg_id=${tgId}` : '/auth';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(circle at 50% 40%, rgba(26,106,255,0.06) 0%, #030408 60%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', color: 'var(--text)', padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(15,18,26,0.95)', border: '1px solid rgba(26,106,255,0.2)',
        borderRadius: '20px', padding: '3rem 3.5rem', maxWidth: '480px', width: '100%',
        textAlign: 'center', backdropFilter: 'blur(20px)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)'
      }}>
        <img src="/pronoia-wordmark.png" alt="Pronoia" style={{
          height: '32px', width: 'auto', display: 'block', margin: '0 auto 1.5rem',
          filter: 'invert(1) brightness(1.6)'
        }} />
        <div style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>{isAuth ? '🔐' : '⚡'}</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700,
          color: 'var(--cobalt-bright)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem'
        }}>ZUGRIFF VERWEIGERT</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 400, marginBottom: '1rem', lineHeight: 1.2 }}>
          Anmeldung erforderlich
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Melde dich an, um das Life OS System zu starten.
        </p>
        <Link href={authUrl} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--cobalt)', color: '#fff', border: '1px solid var(--cobalt-bright)',
          borderRadius: '8px', padding: '0.9rem 2rem', fontSize: '0.85rem', fontWeight: 600,
          textDecoration: 'none', width: '100%'
        }}>
          Jetzt anmelden →
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
function LifeOSDashboard() {
  const { user, loading: authLoading, logout, resetPassword } = useAuth();
  const { chatUnreadCount, exportE2EPrivateKey, importE2EPrivateKey, resetE2EKeys } = useChat();
  const {
    blocks, blockIdx, timeLeft, totalTime, isRunning,
    circadianMode, setCircadianMode, overrideActiveBlockDuration,
    profile, profileLoading, stack, frictionLogs, dataSources, agentMsg, isTyping, directives,
    calendar, setCalendar, selectedDate, currentMonth, formatDate, selectDate, prevMonth, nextMonth,
    addCalendarBlock, editCalendarBlock, deleteCalendarBlock,
    generateDayAI, generateMonthAI, chatWithDayAI, syncToActive,
    generateSkillMaterials, completeSkillSession,
    toggleTimer, nextBlock, prevBlock, skipBlock, handleCommand, setAgentMsg,
    consumeStackItem, addStackItem, removeStackItem, updateStackItem,
    saveProfile, linkTelegramId, logFriction, loadProtocolQueue, addCustomBlock, uploadDataSource,
    manualPeekIdx, setManualPeekIdx, pendingQueueOverride, setPendingQueueOverride, confirmQueueOverride, restoreCalendarBlocks,
    activateOptimalProtocol, consensusData,
    consensusLoading, lastConsensusAt, refreshConsensus, acknowledgeDirective, dismissDirective
  } = useProtocol();

  const { data: managerConfig } = useTabData('managerConfig', { mappings: [], autoOpenEnabled: false });

  const { data: monkModeConfig } = useTabData('monkModeConfig', {
    initialTime: 5400,
    blockedProtocols: { youtube: true, social: true, gaming: false, caffeine: false, junkfood: true }
  });

  const isMonkModeActive = !!(monkModeConfig && monkModeConfig.activeSession);
  const blockedProtocols = monkModeConfig?.blockedProtocols || {};

  const isUrlBlockedByMonkMode = (url) => {
    if (!isMonkModeActive) return false;
    const lowerUrl = url.toLowerCase();
    if (blockedProtocols.youtube && (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('netflix.com') || lowerUrl.includes('twitch.tv'))) return 'Video Streaming';
    if (blockedProtocols.social && (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com') || lowerUrl.includes('instagram.com') || lowerUrl.includes('tiktok.com') || lowerUrl.includes('facebook.com'))) return 'Social Networks';
    if (blockedProtocols.gaming && (lowerUrl.includes('steampowered.com') || lowerUrl.includes('epicgames.com') || lowerUrl.includes('roblox.com'))) return 'Steam & Gaming';
    if (blockedProtocols.caffeine && (lowerUrl.includes('starbucks.com') || lowerUrl.includes('redbull.com') || lowerUrl.includes('nespresso.com'))) return 'Koffein Tracker';
    if (blockedProtocols.junkfood && (lowerUrl.includes('lieferando.de') || lowerUrl.includes('ubereats.com') || lowerUrl.includes('dominos.de') || lowerUrl.includes('pizza.de'))) return 'Fast-Food Portale';
    return false;
  };

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!isMonkModeActive) return;
      const anchor = e.target.closest('a');
      if (anchor && anchor.href) {
        const blockReason = isUrlBlockedByMonkMode(anchor.href);
        if (blockReason) {
          e.preventDefault();
          alert(`🛡️ Monk Mode Block\n\nDieser Link ist aktuell blockiert: ${blockReason}`);
        }
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [isMonkModeActive, blockedProtocols]);

  // Drag/Swipe gestures states on Chronometer
  const [dragStartX, setDragStartX] = useState(null);
  const [dragCurrentX, setDragCurrentX] = useState(null);

  const handleDragStart = (x, e = null) => {
    if (e && e.type === 'mousedown') {
      e.preventDefault(); // Prevents selection and ghost-dragging of SVG
    }
    setDragStartX(x);
    setDragCurrentX(x);
  };

  const handleDragMove = (x) => {
    if (dragStartX !== null) {
      setDragCurrentX(x);
    }
  };

  const handleDragEnd = () => {
    if (dragStartX === null || dragCurrentX === null) return;
    const diff = dragCurrentX - dragStartX;
    const threshold = 60;
    if (diff > threshold) {
      prevBlock();
    } else if (diff < -threshold) {
      skipBlock();
    }
    setDragStartX(null);
    setDragCurrentX(null);
  };

  // Global window listeners for drag gestures to allow dragging outside circle boundary
  useEffect(() => {
    if (dragStartX === null) return;

    const handleGlobalMouseMove = (e) => {
      handleDragMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragStartX, dragCurrentX]);

  // Time manual edit states
  const [showTimeEdit, setShowTimeEdit] = useState(false);
  const [editTimeMinutes, setEditTimeMinutes] = useState('');

  const handleTimeEditSubmit = (e) => {
    e.preventDefault();
    const mins = parseInt(editTimeMinutes);
    if (!isNaN(mins) && mins > 0) {
      overrideActiveBlockDuration(mins);
    }
    setShowTimeEdit(false);
  };

  /* ─── Access Gate ─── */
  const [gateState, setGateState] = useState('loading');
  const searchParams = useSearchParams();
  const [linkNotification, setLinkNotification] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    Promise.resolve().then(() => {
      if (!user) {
        setGateState('auth');
      } else {
        setGateState('ok');
      }
    });
  }, [authLoading, user]);

  useEffect(() => {
    const tgId = searchParams.get('tg_id');
    if (tgId && user && !profileLoading && profile) {
      const parsedId = parseInt(tgId);
      if (profile.telegramId !== parsedId) {
        linkTelegramId(parsedId, user).then((success) => {
          if (success) {
            setLinkNotification("Telegram-Konto erfolgreich verknüpft! ⊕");
          } else {
            setLinkNotification("Verknüpfungs-Fehler! Siehe Alert.");
          }
        });
        // Remove query param from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    }
  }, [searchParams, user, profile, profileLoading, linkTelegramId]);

  /* ─── Tab Navigation ─── */
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState('apps');

  useEffect(() => {
    if (tabParam) {
      // The Skill Lab is a modal, not a real tab. Switching activeTab to
      // 'skills' oscillates with the URL-mirror effect below (replaceState →
      // useSearchParams → setActiveTab → …), which the browser throttles with
      // "Too many calls to History API" → crash. Route the deep link straight
      // to the modal and leave activeTab untouched.
      if (tabParam === 'skills') {
        setIsSkillLabOpen(true);
        return;
      }
      Promise.resolve().then(() => {
        setActiveTab(tabParam);
      });
    }
  }, [tabParam]);

  // Mirror the active tab into the URL (shallow, no re-render) so deep links
  // and refresh land on the same tab. 'apps' is the default → clean URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (activeTab && activeTab !== 'apps') {
      if (url.searchParams.get('tab') === activeTab) return;
      url.searchParams.set('tab', activeTab);
    } else {
      if (!url.searchParams.has('tab')) return;
      url.searchParams.delete('tab');
    }
    window.history.replaceState(null, '', url.toString());
  }, [activeTab]);

  // Tab selection. The Skill Lab is a modal, not a tab — selecting it opens the
  // modal and leaves activeTab where it is. Routing it through activeTab (the
  // old "bounce" effect) caused an infinite setActiveTab ⇄ URL-mirror loop that
  // crashed the History API. Use this everywhere a tab/app is clicked.
  const selectTab = (id) => {
    if (id === 'skills') {
      setIsSkillLabOpen(true);
      return;
    }
    setActiveTab(id);
  };

  const [portalTab, setPortalTab] = useState('subscriptions'); // 'subscriptions' | 'store'
  const [storeView, setStoreView] = useState('grid'); // 'grid' | 'product' | 'cart'
  const [storeCategory, setStoreCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]); // [{ id, name, price, image, category, qty }]

  /* ─── Live Clock ─── */
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ─── Core State ─── */
  const [messages, setMessages] = useState([
    { role: 'agent', text: 'System-Performance aktiv. Bereit für kognitives Laden.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDuration, setCustomDuration] = useState('30');
  const [newGoalText, setNewGoalText] = useState('');
  const [editHrv, setEditHrv] = useState('');
  const [editSleep, setEditSleep] = useState('');

  /* ─── Liabilities Edit State & Handlers ─── */
  const [editingLiability, setEditingLiability] = useState(null);

  const handleLiabilityClick = (block) => {
    const found = (profile?.liabilities || []).find(l => l.id === block.id || (l.title === block.title && l.day === block.day));
    if (found) {
      setEditingLiability(found);
    } else {
      setEditingLiability({
        id: block.id || `liab_${Date.now()}`,
        title: block.title,
        day: block.day || 'Montag',
        startTime: block.startTime || '09:00',
        endTime: block.endTime || '17:00'
      });
    }
  };

  const handleSaveEditedLiability = (e) => {
    e.preventDefault();
    if (!editingLiability) return;
    const currentLiabs = profile?.liabilities || [];
    let updatedLiabs;
    if (currentLiabs.some(l => l.id === editingLiability.id)) {
      updatedLiabs = currentLiabs.map(l => l.id === editingLiability.id ? editingLiability : l);
    } else {
      updatedLiabs = [...currentLiabs, editingLiability];
    }
    const optWeek = profile?.optimalWeek || {
      chronotype: 'balanced',
      wakeTime: '07:00',
      bedTime: '23:00',
      goals: { deepWorkHours: 15, sportSessions: 3, recoverySessions: 3 }
    };
    activateOptimalProtocol(
      optWeek.chronotype,
      optWeek.wakeTime,
      optWeek.bedTime,
      updatedLiabs,
      optWeek.goals
    );
    setEditingLiability(null);
  };

  const handleDeleteEditedLiability = () => {
    if (!editingLiability) return;
    const currentLiabs = profile?.liabilities || [];
    const updatedLiabs = currentLiabs.filter(l => l.id !== editingLiability.id);
    const optWeek = profile?.optimalWeek || {
      chronotype: 'balanced',
      wakeTime: '07:00',
      bedTime: '23:00',
      goals: { deepWorkHours: 15, sportSessions: 3, recoverySessions: 3 }
    };
    activateOptimalProtocol(
      optWeek.chronotype,
      optWeek.wakeTime,
      optWeek.bedTime,
      updatedLiabs,
      optWeek.goals
    );
    setEditingLiability(null);
  };

  const handleDeleteLiabilityFromBlock = (block) => {
    const found = (profile?.liabilities || []).find(l => l.id === block.id || (l.title === block.title && l.day === block.day));
    if (found) {
      const currentLiabs = profile?.liabilities || [];
      const updatedLiabs = currentLiabs.filter(l => l.id !== found.id);
      const optWeek = profile?.optimalWeek || {
        chronotype: 'balanced',
        wakeTime: '07:00',
        bedTime: '23:00',
        goals: { deepWorkHours: 15, sportSessions: 3, recoverySessions: 3 }
      };
      activateOptimalProtocol(
        optWeek.chronotype,
        optWeek.wakeTime,
        optWeek.bedTime,
        updatedLiabs,
        optWeek.goals
      );
    }
  };

  /* ─── Ecosystem Shop State ─── */
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Custom interactive states for generated pages
  const [expandedConnectors, setExpandedConnectors] = useState({ whoop: false, notion: false, paypal: false, zapier: false });
  const [connectorPermissions, setConnectorPermissions] = useState({
    whoop: { sleep: true, hrv: true, recovery: true },
    notion: { read: true, write: true },
    paypal: { payments: false, transactions: false },
    zapier: { webhook: true }
  });
  const [profileToast, setProfileToast] = useState('');

  /* ─── Modals ─── */
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isSkillLabOpen, setIsSkillLabOpen] = useState(false);
  const [skillContent, setSkillContent] = useState('');
  const [isGeneratingSkill, setIsGeneratingSkill] = useState(false);
  const [dayChatInput, setDayChatInput] = useState('');

  /* ─── Interactive Skill Lab State ─── */
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [skillNotes, setSkillNotes] = useState({});
  const [completedSteps, setCompletedSteps] = useState({});
  const [watchedVideos, setWatchedVideos] = useState({});

  /* ─── Manager Tab State ─── */
  const [managerHistory, setManagerHistory] = useState([]);

  /* ─── Tutorial ─── */
  const [tutorialStep, setTutorialStep] = useState(0);

  /* ─── Vault ─── */
  const [vaultItems, setVaultItems] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(true);
  // vaultFilterTag now lives in VaultTab via useTabData('vaultFilter') — persisted per user.
  const [vaultForm, setVaultForm] = useState({ type: 'note', title: '', content: '', tags: '' });
  const [vaultSaving, setVaultSaving] = useState(false);
  const [vaultToast, setVaultToast] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- NorthStar (Future Self agent) states ---
  const [nsDraft, setNsDraft] = useState(null);
  const [nsMessage, setNsMessage] = useState('');
  const [nsBusy, setNsBusy] = useState(false);
  const [nsNudge, setNsNudge] = useState('');
  const [nsRecalInput, setNsRecalInput] = useState('');
  const [nsRecalMsg, setNsRecalMsg] = useState('');
  const [nsRecalBusy, setNsRecalBusy] = useState(false);
  const [nsReexplore, setNsReexplore] = useState(false);
  const nsEditedRef = useRef(false);

  // --- Library Module States & Handlers ---
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [librarySaving, setLibrarySaving] = useState(false);
  const [libraryToast, setLibraryToast] = useState('');
  const [libraryForm, setLibraryForm] = useState({
    title: '',
    author: '',
    genre: '',
    status: 'reading',
    rating: 5,
    progress: 0,
    notes: '',
    quote: '',
  });

  const triggerLibraryToast = (msg) => { setLibraryToast(msg); setTimeout(() => setLibraryToast(''), 3000); };

  // --- Blueprint Module States & Handlers ---
  const [blueprints, setBlueprints] = useState([
    {
      id: 'huberman_dopamine',
      name: 'Huberman Dopamin-Protokoll',
      creator: 'Andrew Huberman',
      category: 'BIOHACKING',
      price: 149,
      rating: 4.9,
      difficulty: 'Intermediate',
      duration: '6 Wochen',
      description: 'Optimiere deine Dopamin-Baselines, steigere die Motivation und etabliere gesunde neurologische Zyklen.',
      overview: 'Ein evidenzbasiertes 6-Wochen-Protokoll zur Wiederherstellung gesunder Dopamin-Baselines. Durch gezielte Reizkontrolle, Kältexposition und zeitlich getaktete Belohnungen lernst du, intrinsische Motivation aufzubauen statt sie an kurzfristige Dopamin-Spitzen zu verlieren.',
      benefits: ['Höhere intrinsische Motivation', 'Besseres Dopamin-Gleichgewicht', 'Gesteigerte Konzentration'],
      protocol: [
        ['Phase 1 · Baseline-Reset', 'Eliminiere künstliche Dopamin-Spitzen für 7 Tage (Reizfasten).'],
        ['Phase 2 · Kälte & Licht', 'Morgendliches Sonnenlicht + Kälteexposition zur Rezeptor-Sensibilisierung.'],
        ['Phase 3 · Effort-Reward', 'Koppele Anstrengung an die Belohnung, nicht das Ergebnis.'],
      ],
      includes: ['Tägliche Protokoll-Checkliste', 'Audio-Briefings', 'Tracking-Vorlage für Baselines'],
      image: blueprintMock('BIOHACKING'),
    },
    {
      id: 'bryan_johnson_blueprint',
      name: 'Bryan Johnson Blueprint',
      creator: 'Bryan Johnson',
      category: 'LONGEVITY',
      price: 299,
      rating: 4.8,
      difficulty: 'Advanced',
      duration: '12 Wochen',
      description: 'Zelluläre Verjüngung und organische Langlebigkeit durch präzise circadiane und biologische Taktung.',
      overview: 'Das vollständige Langlebigkeits-Betriebssystem: präzise Mahlzeiten-Taktung, Schlaf-Architektur und Bewegungsdosierung, abgestimmt auf messbare Biomarker. Ein anspruchsvolles Protokoll für Anwender, die ihr biologisches Alter aktiv senken wollen.',
      benefits: ['Zelluläre Regeneration', 'Reduziertes biologisches Alter', 'Optimale Organ-Funktion'],
      protocol: [
        ['Phase 1 · Messung', 'Erhebe Baseline-Biomarker (HRV, Schlaf, Entzündungswerte).'],
        ['Phase 2 · Taktung', 'Feste Mahlzeiten-Fenster + circadiane Lichthygiene.'],
        ['Phase 3 · Optimierung', 'Iterative Anpassung anhand wöchentlicher Messwerte.'],
      ],
      includes: ['Biomarker-Tracking-Dashboard', 'Mahlzeiten-Taktungsplan', 'Wöchentliche Review-Vorlage'],
      image: blueprintMock('LONGEVITY'),
    },
    {
      id: 'sleep_synergy_v4',
      name: 'Sleep Synergy V4',
      creator: 'Pronoia Core',
      category: 'SLEEP',
      price: 89,
      rating: 5.0,
      difficulty: 'Beginner',
      duration: '4 Wochen',
      description: 'Maximierung des Tiefschlaf-Anteils und Senkung der Latenzzeit durch neuro-auditorisches Entrainment.',
      overview: 'Ein sanftes 4-Wochen-Einsteigerprotokoll, das Tiefschlaf-Anteil und Einschlaflatenz verbessert. Kombiniert abendliche Lichthygiene, Temperaturabsenkung und neuro-auditorisches Entrainment zu einer verlässlichen Schlafroutine.',
      benefits: ['Tiefschlaf-Steigerung um 35%', 'Schnelleres Einschlafen', 'Erhöhter morgendlicher HRV-Wert'],
      protocol: [
        ['Phase 1 · Wind-Down', 'Blaulicht-Reduktion + Temperaturabsenkung 90 Min vor dem Schlaf.'],
        ['Phase 2 · Entrainment', 'Neuro-auditorische Delta-Frequenzen beim Einschlafen.'],
        ['Phase 3 · Konsolidierung', 'Feste Schlaf-/Wachzeiten zur circadianen Stabilisierung.'],
      ],
      includes: ['Abend-Routine-Checkliste', 'Delta-Frequenz-Audiospuren', 'Schlaf-Tracking-Vorlage'],
      image: blueprintMock('SLEEP'),
    }
  ]);
  const [blueprintsLoading, setBlueprintsLoading] = useState(false);
  const [installedBlueprints, setInstalledBlueprints] = useState([]);
  const [blueprintSearch, setBlueprintSearch] = useState('');
  const [blueprintCategory, setBlueprintCategory] = useState('all');
  const [selectedBlueprint, setSelectedBlueprint] = useState(null);
  const [bpPriceCap, setBpPriceCap] = useState(null); // null = no cap (show all)
  const [bpInstallToast, setBpInstallToast] = useState(null); // { type:'ok'|'err', msg }

  useEffect(() => {
    if (!db) return;
    setBlueprintsLoading(true);
    const blueprintsRef = collection(db, 'blueprints');
    const q = query(blueprintsRef);
    getDocs(q).then((snap) => {
      if (!snap.empty) {
        const list = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setBlueprints(list);
      }
      setBlueprintsLoading(false);
    }).catch((err) => {
      console.warn("Could not load blueprints from firestore, using defaults:", err);
      setBlueprintsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setInstalledBlueprints([]);
      return;
    }
    const installedRef = collection(db, 'users', user.uid, 'installedBlueprints');
    const unsub = onSnapshot(installedRef, (snap) => {
      const list = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setInstalledBlueprints(list);
    }, (err) => {
      console.error("Failed to load installed blueprints:", err);
    });
    return () => unsub();
  }, [user]);

  const handleInstallBlueprint = async (blueprint) => {
    if (!user) {
      setBpInstallToast({ type: 'err', msg: 'Bitte melde dich an, um Protokolle zu installieren.' });
      return;
    }
    try {
      const installedDocRef = doc(db, 'users', user.uid, 'installedBlueprints', blueprint.id);
      await setDoc(installedDocRef, {
        name: blueprint.name,
        installedAt: new Date().toISOString(),
        status: 'active'
      });
      setBpInstallToast({ type: 'ok', msg: `„${blueprint.name}" wurde installiert.` });
    } catch (err) {
      console.error("Failed to install blueprint:", err);
      setBpInstallToast({ type: 'err', msg: 'Fehler beim Installieren des Protokolls.' });
    }
  };

  // Auto-dismiss the blueprint install toast.
  useEffect(() => {
    if (!bpInstallToast) return;
    const t = setTimeout(() => setBpInstallToast(null), 3200);
    return () => clearTimeout(t);
  }, [bpInstallToast]);

  useEffect(() => {
    if (!user || !db) {
      setLibraryBooks([]);
      setLibraryLoading(false);
      return;
    }
    setLibraryLoading(true);
    const booksRef = collection(db, 'users', user.uid, 'books');
    const q = query(booksRef, orderBy('addedAt', 'desc'));
    
    const unsub = onSnapshot(q, (snap) => {
      const booksList = [];
      snap.forEach((doc) => {
        booksList.push({ id: doc.id, ...doc.data() });
      });
      setLibraryBooks(booksList);
      setLibraryLoading(false);
    }, (err) => {
      console.error("Failed to load personal library:", err);
      setLibraryLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleSaveBook = async (e) => {
    if (e) e.preventDefault();
    if (!libraryForm.title.trim()) return triggerLibraryToast('Buchtitel ist erforderlich.');
    if (!libraryForm.author.trim()) return triggerLibraryToast('Autor ist erforderlich.');
    
    setLibrarySaving(true);
    try {
      const booksRef = collection(db, 'users', user.uid, 'books');
      await addDoc(booksRef, {
        title: libraryForm.title.trim(),
        author: libraryForm.author.trim(),
        genre: libraryForm.genre.trim() || 'Allgemein',
        status: libraryForm.status,
        rating: Number(libraryForm.rating) || 5,
        progress: Number(libraryForm.progress) || 0,
        notes: libraryForm.notes.trim(),
        quote: libraryForm.quote.trim(),
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setLibraryForm({
        title: '',
        author: '',
        genre: '',
        status: 'reading',
        rating: 5,
        progress: 0,
        notes: '',
        quote: '',
      });
      triggerLibraryToast('Buch erfolgreich hinzugefügt.');
    } catch (err) {
      console.error("Failed to save book:", err);
      triggerLibraryToast('Fehler beim Speichern des Buches.');
    } finally {
      setLibrarySaving(false);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!confirm('Möchtest du dieses Buch wirklich löschen?')) return;
    try {
      const bookDocRef = doc(db, 'users', user.uid, 'books', bookId);
      await deleteDoc(bookDocRef);
      triggerLibraryToast('Buch gelöscht.');
    } catch (err) {
      console.error("Failed to delete book:", err);
      triggerLibraryToast('Fehler beim Löschen des Buches.');
    }
  };

  const handleUpdateBookProgress = async (bookId, newProgress) => {
    try {
      const progressNum = Math.min(100, Math.max(0, Number(newProgress) || 0));
      const bookDocRef = doc(db, 'users', user.uid, 'books', bookId);
      await updateDoc(bookDocRef, {
        progress: progressNum,
        status: progressNum === 100 ? 'completed' : progressNum > 0 ? 'reading' : 'unread',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to update book progress:", err);
    }
  };

  // --- App Launcher States & Handlers ---
  const defaultApps = useMemo(() => [
    { id: 'dashboard',  name: 'Dashboard',   desc: 'Kognitiver Taktgeber & System-Chronometer', icon: 'dashboard' },
    { id: 'northstar',  name: 'North Star',  desc: 'Dein Future Self & langfristige Vision',   icon: 'northstar' },
    { id: 'frequencies',name: 'Frequencies', desc: 'Binaurale Beats & Audio-Entrainment',      icon: 'frequencies' },
    { id: 'biometrics', name: 'Biometrie',   desc: 'Bio-Stack & Biometrische Indikatoren',     icon: 'biometrics' },
    { id: 'skills',     name: 'Skill Lab',   desc: 'Agentic Deliberate Practice Lab',          icon: 'skills' },
    { id: 'store',      name: 'Ecosystem',   desc: 'Abonnements & Auto-Replenishment',         icon: 'store' },
    { id: 'connectors', name: 'Konnektoren', desc: 'Schnittstellen zu Wearables & Notion',     icon: 'connectors' },
    { id: 'vault',      name: 'Vault',       desc: 'Wissens-Repository & Dokumente',           icon: 'vault' },
    { id: 'library',    name: 'Bibliothek',  desc: 'Deine persönliche Bibliothek & Notizen',   icon: 'local_library' },
    { id: 'agents',     name: 'Agenten',     desc: 'Kognitive Sub-Agenten consensus status',   icon: 'agents' },
    { id: 'social',     name: 'Social Hub',  desc: 'Freunde, Chats & Community Channel',       icon: 'social' },
    { id: 'tribe',      name: 'Tribe',       desc: 'Bruderschaft Leaderboard & Bookclub',      icon: 'tribe' },
    { id: 'lab',        name: 'Pronoia Lab', desc: 'Nootropics Library & Stack Builder',      icon: 'lab' },
    { id: 'games',      name: 'Schach-Labor', desc: 'Schach & Bio-kognitive Spielanalyse',     icon: 'sports_esports' },
    { id: 'manager',    name: 'Manager',     desc: 'Automatischer Link-Öffner für aktive Blöcke', icon: 'manager' },
    { id: 'monk-mode',  name: 'Monk Mode',   desc: 'Dopamin Detox & Deep Work Hub',             icon: 'monk_mode' },
    { id: 'gym',        name: 'Gym',         desc: 'KI-Workouts & Trainings-Log',              icon: 'gym' },
    { id: 'behavior',   name: 'Verhalten',   desc: 'Gewohnheiten aufbauen, ablegen & verändern', icon: 'behavior' },
  ], []);

  const appsList = useMemo(() => profile?.appConfig?.apps || defaultApps, [profile?.appConfig?.apps, defaultApps]);
  const [sidebarDragOver, setSidebarDragOver] = useState(false);
  const [reorderDragOverId, setReorderDragOverId] = useState(null);

  const sidebarItems = useMemo(() => {
    const baseItems = [{ id: 'apps', name: 'Apps', label: 'Apps', icon: 'apps' }];
    const pinnedIds = profile?.appConfig?.pinnedAppIds || ['dashboard', 'northstar', 'frequencies', 'biometrics', 'skills', 'lab', 'social'];
    const pinned = pinnedIds
      .map(id => appsList.find(a => a.id === id) || defaultApps.find(a => a.id === id))
      .filter(Boolean);
    return [...baseItems, ...pinned];
  }, [profile?.appConfig?.pinnedAppIds, appsList, defaultApps]);

  const handlePinApp = (appId, targetId = null) => {
    if (!appId) return;
    if (appId === 'apps' || appId === 'profile') return;

    const currentPinned = profile?.appConfig?.pinnedAppIds || ['dashboard', 'northstar', 'frequencies', 'biometrics', 'skills', 'lab', 'social'];
    
    if (currentPinned.includes(appId) && !targetId) return;

    let newPinned = [...currentPinned];
    if (currentPinned.includes(appId)) {
      newPinned = newPinned.filter(id => id !== appId);
    }

    if (targetId) {
      const targetIndex = newPinned.indexOf(targetId);
      if (targetIndex !== -1) {
        newPinned.splice(targetIndex, 0, appId);
      } else {
        newPinned.push(appId);
      }
    } else {
      newPinned.push(appId);
    }

    saveProfile({
      appConfig: {
        ...(profile?.appConfig || {}),
        pinnedAppIds: newPinned
      }
    });
  };

  const handleUnpinApp = (appId) => {
    const currentPinned = profile?.appConfig?.pinnedAppIds || ['dashboard', 'northstar', 'frequencies', 'biometrics', 'skills', 'lab', 'social'];
    const newPinned = currentPinned.filter(id => id !== appId);
    saveProfile({
      appConfig: {
        ...(profile?.appConfig || {}),
        pinnedAppIds: newPinned
      }
    });
    if (activeTab === appId) {
      setActiveTab('apps');
    }
  };

  const handleReorderPinnedApps = (draggedId, targetId) => {
    const currentPinned = profile?.appConfig?.pinnedAppIds || ['dashboard', 'northstar', 'frequencies', 'biometrics', 'skills', 'lab', 'social'];
    if (!currentPinned.includes(draggedId) || !currentPinned.includes(targetId)) return;

    const newPinned = [...currentPinned];
    const draggedIndex = newPinned.indexOf(draggedId);
    newPinned.splice(draggedIndex, 1);
    
    const targetIndex = newPinned.indexOf(targetId);
    newPinned.splice(targetIndex, 0, draggedId);

    saveProfile({
      appConfig: {
        ...(profile?.appConfig || {}),
        pinnedAppIds: newPinned
      }
    });
  };

  const [editingAppId, setEditingAppId] = useState(null);
  const [editAppName, setEditAppName] = useState('');
  const [editAppDesc, setEditAppDesc] = useState('');
  const [uploadingAppIcon, setUploadingAppIcon] = useState(null);

  const handleEditAppClick = (app, e) => {
    e.stopPropagation();
    setEditingAppId(app.id);
    setEditAppName(app.name);
    setEditAppDesc(app.desc || '');
  };

  const handleSaveAppEdit = (e) => {
    e?.preventDefault();
    if (!editAppName.trim()) return;
    const updatedApps = appsList.map(app => 
      app.id === editingAppId ? { ...app, name: editAppName.trim(), desc: editAppDesc.trim() } : app
    );
    saveProfile({ appConfig: { ...(profile?.appConfig || {}), apps: updatedApps } });
    setEditingAppId(null);
  };

  const handleAppIconFileChange = async (appId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAppIcon(appId);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const fileName = `app-icon-${appId}-${new Date().getTime()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const userId = user?.uid || 'local';
      const uploadUrl = `${supabaseUrl}/storage/v1/object/vault/${userId}/${fileName}`;

      try {
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': file.type
          },
          body: file
        });
        if (res.ok) {
          const publicURL = `${supabaseUrl}/storage/v1/object/public/vault/${userId}/${fileName}`;
          const updatedApps = appsList.map(app => 
            app.id === appId ? { ...app, image: publicURL } : app
          );
          saveProfile({ appConfig: { ...(profile?.appConfig || {}), apps: updatedApps } });
          setUploadingAppIcon(null);
          return;
        }
      } catch (err) {
        console.warn("Supabase app icon upload failed, falling back to data URL...", err);
      }
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        if (dataUrl.length > 250 * 1024) {
          alert("Das Bild ist zu groß für Offline-Speicherung. Bitte wähle ein Bild unter 150KB oder konfiguriere Supabase.");
          setUploadingAppIcon(null);
          return;
        }
        const updatedApps = appsList.map(app => 
          app.id === appId ? { ...app, image: dataUrl } : app
        );
        saveProfile({ appConfig: { ...(profile?.appConfig || {}), apps: updatedApps } });
        setUploadingAppIcon(null);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("App icon load failed:", err);
      setUploadingAppIcon(null);
    }
  };

  const handleResetApps = () => {
    if (confirm("Möchtest du alle App-Icons und Namen auf Standard zurücksetzen?")) {
      saveProfile({ appConfig: null });
    }
  };

  const chatEndRef = useRef(null);
  
  // Connectors Terminal Logs
  const [terminalLogs, setTerminalLogs] = useState([
    '[SYS] Pronoia Connector Engine v1.0.0 is ready.',
    '[SYS] Listening for local wearable and Notion webhook updates...'
  ]);
  const [isSyncingWhoop, setIsSyncingWhoop] = useState(false);
  const [isExportingNotion, setIsExportingNotion] = useState(false);

  const handleWhoopSync = async () => {
    if (isSyncingWhoop) return;
    if (!user) {
      setTerminalLogs(prev => [...prev, `[WHOOP] Bitte zuerst einloggen, um WHOOP zu verbinden.`]);
      return;
    }
    setIsSyncingWhoop(true);
    setTerminalLogs(prev => [...prev, `[WHOOP] Frage Recovery & Sleep ab...`]);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/connectors/whoop/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` }
      });
      const data = await res.json();

      if (data.connected === false) {
        // Not linked yet → start OAuth consent flow.
        setTerminalLogs(prev => [...prev, `[WHOOP] Noch nicht verbunden. Starte OAuth2-Autorisierung...`]);
        const authRes = await fetch('/api/connectors/whoop/authorize', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        const auth = await authRes.json();
        if (auth.authorizeUrl) {
          window.location.href = auth.authorizeUrl;
          return;
        }
        setTerminalLogs(prev => [...prev, `[WHOOP] ${auth.message || 'Autorisierung nicht verfügbar.'}`]);
      } else if (data.success && data.data) {
        const { hrv, sleep } = data.data;
        setTerminalLogs(prev => [...prev, `[WHOOP] Empfangen: HRV=${hrv ?? '—'}ms Sleep=${sleep ?? '—'}%`, `[SYS] Übernehme Biometrie...`]);
        const metrics = { ...(profile?.metrics || {}) };
        if (hrv != null) metrics.hrv = hrv;
        if (sleep != null) metrics.sleep = sleep;
        saveProfile({ metrics });
      } else {
        setTerminalLogs(prev => [...prev, `[WHOOP] ${data.message || 'Sync fehlgeschlagen.'}`]);
      }
    } catch (err) {
      setTerminalLogs(prev => [...prev, `[WHOOP] Fehler: ${err.message}`]);
    } finally {
      setIsSyncingWhoop(false);
    }
  };

  const handleNotionExport = async () => {
    if (isExportingNotion) return;
    const conn = profile?.connectors || {};
    if (!conn.notionToken) {
      setTerminalLogs(prev => [...prev, `[NOTION] Kein Integration-Token hinterlegt. Bitte oben eintragen.`]);
      return;
    }
    if (!conn.notionDatabaseId) {
      setTerminalLogs(prev => [...prev, `[NOTION] Keine Database-ID hinterlegt. Bitte oben eintragen.`]);
      return;
    }
    setIsExportingNotion(true);
    const dateStr = formatDate(new Date());
    setTerminalLogs(prev => [...prev, `[NOTION] Übertrage Protokoll für ${dateStr}...`]);
    try {
      const res = await fetch('/api/connectors/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export_protocol',
          token: conn.notionToken,
          databaseId: conn.notionDatabaseId,
          date: dateStr,
          blocks: blocks.map(b => ({ title: b.title, startTime: b.startTime, pillar: b.pillar || b.type }))
        })
      });
      const data = await res.json();
      if (data.success) {
        setTerminalLogs(prev => [...prev, `[NOTION] ${blocks.length} Blöcke übertragen.`, `[SYS] Export abgeschlossen!`]);
      } else {
        setTerminalLogs(prev => [...prev, `[NOTION] ${data.message || 'Export fehlgeschlagen.'}`]);
      }
    } catch (err) {
      setTerminalLogs(prev => [...prev, `[NOTION] Fehler: ${err.message}`]);
    } finally {
      setIsExportingNotion(false);
    }
  };

  // Wire the connector engine with the signed-in user's token + connector creds
  // so agent-driven dispatches (callWithIntent) can reach the real routes.
  useEffect(() => {
    Connectors.setContext({
      getIdToken: user ? () => user.getIdToken() : null,
      connectors: profile?.connectors || {},
    });
  }, [user, profile?.connectors]);

  // Surface the WHOOP OAuth + Stripe checkout callback results
  // (redirected back with ?whoop=... / ?checkout=...).
  useEffect(() => {
    const whoopStatus = searchParams.get('whoop');
    if (whoopStatus === 'connected') {
      setTerminalLogs(prev => [...prev, `[WHOOP] ✓ Verbunden. Klicke "Sync WHOOP", um Metriken zu laden.`]);
    } else if (whoopStatus === 'error') {
      setTerminalLogs(prev => [...prev, `[WHOOP] ✗ Autorisierung fehlgeschlagen oder abgebrochen.`]);
    }

    const checkout = searchParams.get('checkout');
    const checkoutKind = searchParams.get('kind');
    if (checkout === 'success') {
      setAgentMsg(
        checkoutKind === 'products'
          ? 'Zahlung erfolgreich. Vielen Dank für deinen Einkauf — deine Bestellung wird bearbeitet.'
          : 'Zahlung erfolgreich. Dein Abo wird nach Bestätigung durch Stripe aktiviert.'
      );
    } else if (checkout === 'cancel') {
      setAgentMsg(
        checkoutKind === 'products'
          ? 'Bezahlung abgebrochen. Dein Warenkorb ist weiterhin gespeichert.'
          : 'Checkout abgebrochen. Kein Abo abgeschlossen.'
      );
    }
  }, [searchParams]);

  /* ─── Feature gating (Free vs Premium/Max) ─── */
  // A single active upgrade prompt: { title?, message?, requiredTier }. The gated
  // control stays usable; the gate is enforced by the helpers below, which open
  // this prompt instead of performing the action.
  const [upgradeGate, setUpgradeGate] = useState(null);

  // Connector slot gate. Free is capped (see lib/tiers.js); premium/max unlimited.
  // Returns true when there's room to install another connector, false (and opens
  // the upgrade prompt) when the limit is reached.
  const requireConnectorSlot = (currentCount) => {
    const limit = connectorLimit(profile);
    if (currentCount < limit) return true;
    setUpgradeGate({
      requiredTier: 'premium',
      title: 'Mehr Konnektoren',
      message: `Dein Free-Abo erlaubt max. ${limit} API-Konnektoren. Mit Premium oder Max verbindest du unbegrenzt viele Datenquellen.`,
    });
    return false;
  };

  /* ─── Subscription checkout (used by the PricingCard selector) ─── */
  const [tierCheckoutBusy, setTierCheckoutBusy] = useState(false);
  // Inline status shown on the pricing UI itself. agentMsg only surfaces in the
  // agent chat panel, which is not visible on the Store tab — so a checkout
  // failure there would otherwise be silent. { type: 'error' | 'success' | 'info', text }
  const [tierCheckoutMsg, setTierCheckoutMsg] = useState(null);
  const handleTierCheckout = async (tierId) => {
    const tier = TIERS.find(t => t.id === tierId);
    if (!tier || authLoading || tierCheckoutBusy) return;
    setTierCheckoutMsg(null);

    // Free tier needs no payment — set it directly.
    if (tier.price === 0) {
      try {
        await saveProfile({ subscriptionTier: tier.id });
        setAgentMsg(`Abonnement auf ${tier.name} aktualisiert.`);
        setTierCheckoutMsg({ type: 'success', text: `Abonnement auf ${tier.name} aktualisiert.` });
      } catch (e) {
        setAgentMsg('Fehler beim Speichern des System-Abos.');
        setTierCheckoutMsg({ type: 'error', text: 'Fehler beim Speichern des System-Abos. Bitte erneut versuchen.' });
      }
      return;
    }
    if (!user) {
      setAgentMsg('Bitte zuerst einloggen, um ein Abo abzuschließen.');
      setTierCheckoutMsg({ type: 'error', text: 'Bitte zuerst einloggen, um ein Abo abzuschließen.' });
      return;
    }
    setTierCheckoutBusy(true);
    setAgentMsg(`Leite zur sicheren Stripe-Kasse für ${tier.name}…`);
    setTierCheckoutMsg({ type: 'info', text: `Leite zur sicheren Stripe-Kasse für ${tier.name}…` });
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ tierId: tier.id })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setAgentMsg(`Checkout nicht verfügbar: ${data.error || 'unbekannter Fehler'}`);
      setTierCheckoutMsg({ type: 'error', text: 'Checkout ist derzeit nicht verfügbar. Bitte versuche es später erneut oder kontaktiere den Support.' });
    } catch (e) {
      setAgentMsg(`Checkout-Fehler: ${e.message}`);
      setTierCheckoutMsg({ type: 'error', text: 'Verbindung zur Kasse fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.' });
    } finally {
      setTierCheckoutBusy(false);
    }
  };

  /* ─── Ecosystem Shop Checkout & Stripe WebSocket client ─── */
  const addToCart = (product) => {
    setCart(prev => {
      const found = prev.find(i => i.id === product.id);
      if (found) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: product.id, name: product.name, price: product.price, image: product.image, category: product.category, qty: 1 }];
    });
    setAgentMsg(`${product.name} in den Warenkorb gelegt.`);
  };
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const setCartQty = (id, delta) => setCart(prev => prev
    .map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));

  // Real one-time checkout for the physical store products via Stripe.
  // The server resolves prices from product ids, so we only send id + qty.
  const [cartCheckoutBusy, setCartCheckoutBusy] = useState(false);
  const [cartCheckoutMsg, setCartCheckoutMsg] = useState(null); // { type, text }
  const handleCartCheckout = async () => {
    if (cart.length === 0 || cartCheckoutBusy) return;
    if (!user) {
      setCartCheckoutMsg({ type: 'error', text: 'Bitte zuerst einloggen, um zu bestellen.' });
      return;
    }
    setCartCheckoutBusy(true);
    setCartCheckoutMsg({ type: 'info', text: 'Leite zur sicheren Stripe-Kasse…' });
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/stripe/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ items: cart.map(i => ({ id: i.id, qty: i.qty })) }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCartCheckoutMsg({ type: 'error', text: 'Kasse ist derzeit nicht verfügbar. Bitte versuche es später erneut.' });
    } catch (e) {
      setCartCheckoutMsg({ type: 'error', text: 'Verbindung zur Kasse fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.' });
    } finally {
      setCartCheckoutBusy(false);
    }
  };

  const handleOrderProduct = (product) => {
    const timeVal = new Date().getTime();
    const orderId = `PRN-OS-${Math.floor(100000 + (timeVal % 900000))}`;
    setActiveInvoice({
      item: product.name,
      cost: product.price,
      date: new Date().toLocaleDateString('de-DE'),
      orderId
    });
    setAgentMsg(`Bestellung für ${product.name} erfasst. Zirkadianer Supply-Chain-Sync aktiv.`);

    // Supplement restocking
    let matchName = product.name.toLowerCase();
    let restocked = false;

    stack.forEach((item, idx) => {
      let itemLower = item.name.toLowerCase();
      if (matchName.includes(itemLower) || itemLower.includes(matchName) ||
          (matchName.includes("magnesium") && itemLower.includes("mg-threonate")) ||
          (matchName.includes("mg-threonat") && itemLower.includes("mg-threonate")) ||
          (matchName.includes("gpc") && itemLower.includes("gpc")) ||
          (matchName.includes("px-v1") && itemLower.includes("oxiracetam"))
      ) {
        updateStackItem(idx, 'supply', 100);
        restocked = true;
      }
    });

    if (restocked) {
      setAgentMsg(`Bio-Stack restocked! Vorrat für ${product.name} auf 100% angehoben.`);
    }

    // Auto-log the purchase in the Finance Tracker (Manager → Finanzen),
    // so store orders show up as expenses without manual entry.
    try {
      const categoryByBadge = {
        TEXTIL: 'Living', FOOTWEAR: 'Living', APPAREL: 'Living', 'BIO-HACK': 'Health/Bio',
        NOOTROPIC: 'Health/Bio', 'FOCUS-FUEL': 'Health/Bio', 'CORE-STACK': 'Health/Bio', DOPAMIN: 'Health/Bio',
        SUPERFOOD: 'Food', ADAPTOGEN: 'Food', ANTIOXIDANT: 'Food'
      };
      const newTx = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: product.price,
        type: 'expense',
        category: categoryByBadge[product.badge] || 'Health/Bio',
        date: new Date().toISOString().substring(0, 10),
        description: `${product.name} (Pronoia Store, ${orderId})`,
        source: 'store'
      };

      if (user && db) {
        const userRef = doc(db, 'users', user.uid);
        getDoc(userRef).then(snap => {
          const userData = snap.exists() ? snap.data() : {};
          const tabs = userData.tabs || {};
          const currentConfig = tabs.managerConfig || userData.profile?.managerConfig || {};
          const financeConfig = currentConfig.finance || {};
          const currentTx = financeConfig.transactions || [];
          
          const updatedConfig = {
            ...currentConfig,
            finance: {
              ...financeConfig,
              transactions: [newTx, ...currentTx]
            }
          };
          setDoc(userRef, { tabs: { managerConfig: updatedConfig } }, { merge: true })
            .catch(err => console.error("Store purchase log to Firestore failed:", err));
        });
      } else if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('pronoia_tab_managerConfig');
        const currentConfig = raw ? JSON.parse(raw) : {};
        const financeConfig = currentConfig.finance || {};
        const currentTx = financeConfig.transactions || [];
        const updatedConfig = {
          ...currentConfig,
          finance: {
            ...financeConfig,
            transactions: [newTx, ...currentTx]
          }
        };
        window.localStorage.setItem('pronoia_tab_managerConfig', JSON.stringify(updatedConfig));
      }
    } catch (e) {
      console.warn('Store purchase finance auto-log failed:', e);
    }
  };



  // Customizer dynamic accent and UI Mode effect
  useEffect(() => {
    if (!profile?.customization) return;
    const { accent, mode } = profile.customization;
    const root = document.documentElement;

    // Noir is a monochrome variant of the os baseline: it reuses all os
    // styling (so DOM ui-mode stays "os") and only recolors the accent to the
    // text color, which adapts to light/dark automatically.
    const isNoir = mode === 'noir';
    root.setAttribute('data-ui-mode', isNoir ? 'os' : (mode || 'os'));

    if (isNoir) {
      root.setAttribute('data-accent', 'noir');
      root.style.setProperty('--theme-accent', 'var(--text)');
      root.style.setProperty('--theme-accent-dark', 'var(--text2)');
      root.style.setProperty('--theme-accent-dim', 'var(--bg3)');
      root.style.setProperty('--theme-accent-glow', 'transparent');
      return;
    }
    root.removeAttribute('data-accent');

    // Map accents
    const ACCENTS = {
      blue: { accent: '#1A6AFF', dark: '#0047AB', dim: 'rgba(26, 106, 255, 0.12)', glow: 'rgba(26, 106, 255, 0.18)' },
      green: { accent: '#00C48C', dark: '#00855A', dim: 'rgba(0, 196, 140, 0.12)', glow: 'rgba(0, 196, 140, 0.18)' },
      tan: { accent: '#d5b893', dark: '#8A6E4D', dim: 'rgba(213, 184, 147, 0.12)', glow: 'rgba(213, 184, 147, 0.18)' },
      amber: { accent: '#F5A623', dark: '#A06000', dim: 'rgba(245, 166, 35, 0.12)', glow: 'rgba(245, 166, 35, 0.18)' },
      red: { accent: '#FF4D4D', dark: '#B30000', dim: 'rgba(255, 77, 77, 0.12)', glow: 'rgba(255, 77, 77, 0.18)' },
      pink: { accent: '#FF33A8', dark: '#B30071', dim: 'rgba(255, 51, 168, 0.12)', glow: 'rgba(255, 51, 168, 0.18)' }
    };

    const sel = ACCENTS[accent] || ACCENTS.blue;
    root.style.setProperty('--theme-accent', sel.accent);
    root.style.setProperty('--theme-accent-dark', sel.dark);
    root.style.setProperty('--theme-accent-dim', sel.dim);
    root.style.setProperty('--theme-accent-glow', sel.glow);
  }, [profile?.customization]);

  // NorthStar: sync the editable draft from the persisted future self until the
  // user starts editing (handles async Firestore load without clobbering edits).
  useEffect(() => {
    if (!profile?.futureSelf || nsEditedRef.current) return;
    const fs = profile.futureSelf;
    setNsDraft({
      identity: fs.identity || '',
      visions: { y1: '', y3: '', y5: '', ...(fs.visions || {}) },
      values: fs.values || [],
      pillarTargets: { focus: 3, health: 3, skills: 3, social: 3, recovery: 3, ...(fs.pillarTargets || {}) },
      archetypeName: fs.archetypeName || '',
      shadowWork: { recognizedShadow: '', hiddenPower: '', integration: '', ...(fs.shadowWork || {}) }
    });
  }, [profile?.futureSelf]);

  const saveFutureSelf = () => {
    if (!nsDraft) return;
    saveProfile({ futureSelf: nsDraft });
    setNsReexplore(false);
    setAgentMsg('NorthStar: Vision aktualisiert. Ich richte dein Protokoll daran aus.');
  };

  const callNorthStar = async (mode = 'mentor', userInput = '') => {
    try {
      const res = await fetch('/api/northstar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          userInput,
          futureSelf: nsDraft || profile?.futureSelf || {},
          context: {
            goals: profile?.goals || '',
            metrics: profile?.metrics || {},
            todayBlocks: (blocks || []).slice(0, 6).map(b => b.title)
          }
        })
      });
      const data = await res.json();
      return data.message || 'NorthStar ist momentan nicht erreichbar.';
    } catch (e) {
      return 'NorthStar ist momentan nicht erreichbar.';
    }
  };

  const askNorthStar = async () => {
    setNsBusy(true);
    setNsMessage(await callNorthStar('mentor'));
    setNsBusy(false);
  };

  const recalibrate = async () => {
    if (!nsRecalInput.trim()) return;
    setNsRecalBusy(true);
    setNsRecalMsg(await callNorthStar('recalibrate', nsRecalInput.trim()));
    setNsRecalBusy(false);
  };

  // Daily "thought from your future self" — fetched once per day, cached locally.
  // Only once a vision actually exists (otherwise the nudge has nothing to say).
  useEffect(() => {
    if (!nsDraft || nsNudge) return;
    const hasVision = (nsDraft.identity || '').trim() ||
      Object.values(nsDraft.visions || {}).some(v => (v || '').trim());
    if (!hasVision) return;
    const today = new Date().toDateString();
    try {
      const cached = JSON.parse(localStorage.getItem('pronoia_ns_nudge') || 'null');
      if (cached && cached.date === today && cached.message) { setNsNudge(cached.message); return; }
    } catch (e) {}
    callNorthStar('nudge').then(msg => {
      setNsNudge(msg);
      try { localStorage.setItem('pronoia_ns_nudge', JSON.stringify({ date: today, message: msg })); } catch (e) {}
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nsDraft, nsNudge]);

  /* ─── Effects ─── */
  useEffect(() => {
    if (profile?.metrics) {
      Promise.resolve().then(() => {
        setEditHrv(profile.metrics.hrv?.toString() || '72');
        setEditSleep(profile.metrics.sleep?.toString() || '84');
      });
    }
  }, [profile]);

  useEffect(() => {
    if (agentMsg) {
      Promise.resolve().then(() => {
        setMessages(prev => {
          if (prev[prev.length - 1]?.text === agentMsg) return prev;
          return [...prev, { role: 'agent', text: agentMsg }];
        });
      });
    }
  }, [agentMsg]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const lastOpenedBlockRef = useRef('');

  useEffect(() => {
    const activeBlock = blocks[blockIdx];
    if (!activeBlock || !activeBlock.title || activeBlock.title === 'Kein aktiver Block') return;
    if (activeBlock.title === lastOpenedBlockRef.current) return;
    
    lastOpenedBlockRef.current = activeBlock.title;

    if (managerConfig && managerConfig.autoOpenEnabled && managerConfig.mappings) {
      const titleLower = activeBlock.title.toLowerCase();
      // Find matching mappings (case-insensitive substring match)
      const matches = managerConfig.mappings.filter(m => 
        m.pattern && titleLower.includes(m.pattern.toLowerCase())
      );

      if (matches.length > 0) {
        setAgentMsg(`Öffne Links für den aktiven Block "${activeBlock.title}"...`);
        matches.forEach(m => {
          let url = m.url.trim();
          if (url) {
            if (!/^https?:\/\//i.test(url)) {
              url = 'https://' + url;
            }
            const blockReason = isUrlBlockedByMonkMode(url);
            if (blockReason) {
              setAgentMsg(`[MONK MODE BLOCK] Link blockiert: ${blockReason} (${url})`);
              setManagerHistory(prev => [
                {
                  id: `hist_${Date.now()}_${Math.random()}`,
                  time: new Date().toLocaleTimeString('de-DE'),
                  blockTitle: activeBlock.title,
                  url,
                  success: false,
                  reason: `Blockiert durch Monk Mode (${blockReason})`
                },
                ...prev
              ].slice(0, 50));
              return;
            }
            try {
              window.open(url, '_blank');
              setManagerHistory(prev => [
                {
                  id: `hist_${Date.now()}_${Math.random()}`,
                  time: new Date().toLocaleTimeString('de-DE'),
                  blockTitle: activeBlock.title,
                  url,
                  success: true
                },
                ...prev
              ].slice(0, 50));
            } catch (err) {
              console.error("Failed to auto-open tab:", err);
            }
          }
        });
      }
    }
  }, [blocks, blockIdx, managerConfig]);

  useEffect(() => {
    if (profile && profile.hasCompletedTutorial === false && tutorialStep === 0) {
      const t = setTimeout(() => setTutorialStep(1), 1200);
      return () => clearTimeout(t);
    }
  }, [profile, tutorialStep]);

  // Auto-open UI tabs during onboarding tour
  useEffect(() => {
    if (tutorialStep === 0) return;
    Promise.resolve().then(() => {
      switch (tutorialStep) {
        case 1:
          setActiveTab('dashboard');
          setShowCalendarModal(false);
          break;
        case 2:
          setShowCalendarModal(true);
          break;
        case 3:
          setActiveTab('biometrics');
          setShowCalendarModal(false);
          break;
        case 4:
        case 5:
          setActiveTab('dashboard');
          setShowCalendarModal(false);
          break;
        case 6:
          setActiveTab('biometrics'); // Bio-Stack is now inside the biometrics tab
          setShowCalendarModal(false);
          break;
        case 7:
          setActiveTab('agents');
          setShowCalendarModal(false);
          break;
        default:
          break;
      }
    });
  }, [tutorialStep]);

  /* ─── Vault CRUD ─── */
  const handleVaultFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      triggerVaultToast("Fehler: Datei ist zu groß (Limit: 100 MB für Supabase-Upload).");
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Fallback/mock upload simulator if Supabase is not configured
      setUploadingFile(true);
      setUploadProgress(0);
      const fileName = `${new Date().getTime()}_${file.name}`;
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setUploadProgress(currentProgress);
        if (currentProgress >= 100) {
          clearInterval(interval);
          const simulatedURL = `https://supabase-mock-bucket.co/storage/v1/object/public/vault/${user?.uid || 'local'}/${fileName}`;
          setVaultForm(f => ({
            ...f,
            title: f.title ? f.title : file.name,
            content: simulatedURL
          }));
          triggerVaultToast("Datei hochgeladen (Simuliert).");
          setUploadingFile(false);
        }
      }, 150);
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);

    const fileName = `${new Date().getTime()}_${file.name}`;
    const userId = user?.uid || 'local';
    const uploadUrl = `${supabaseUrl}/storage/v1/object/vault/${userId}/${fileName}`;

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('apikey', supabaseAnonKey);
      xhr.setRequestHeader('Authorization', `Bearer ${supabaseAnonKey}`);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(progress));
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const publicURL = `${supabaseUrl}/storage/v1/object/public/vault/${userId}/${fileName}`;
          setVaultForm(f => ({
            ...f,
            title: f.title ? f.title : file.name,
            content: publicURL
          }));
          triggerVaultToast("Datei erfolgreich in Supabase Storage geladen.");
        } else {
          console.error("Direct upload error status:", xhr.status, xhr.responseText);
          triggerVaultToast(`Upload fehlgeschlagen: HTTP ${xhr.status}`);
        }
        setUploadingFile(false);
      };

      xhr.onerror = () => {
        triggerVaultToast("Netzwerkfehler während des Uploads.");
        setUploadingFile(false);
      };

      xhr.send(file);

    } catch (err) {
      console.error("Upload error:", err);
      triggerVaultToast("Upload-Fehler: " + err.message);
      setUploadingFile(false);
    }
  };

  const loadVaultItems = async () => {
    setVaultLoading(true);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const userId = user?.uid || 'local';

    if (supabaseUrl && supabaseAnonKey) {
      try {
        // --- Auto-migrate local storage items to Supabase ---
        const localItems = JSON.parse(localStorage.getItem('px_vault') || '[]');
        if (localItems.length > 0) {
          console.log(`Migrating ${localItems.length} local vault items to Supabase...`);
          for (const item of localItems) {
            const payload = {
              user_id: userId,
              type: item.type,
              title: item.title,
              content: item.content,
              url: item.url || null,
              tags: item.tags || [],
              created_at: item.created_at || new Date().toISOString()
            };
            
            await fetch(`${supabaseUrl}/rest/v1/vault_items`, {
              method: 'POST',
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });
          }
          localStorage.removeItem('px_vault');
          console.log("Migration complete!");
        }

        const res = await fetch(`${supabaseUrl}/rest/v1/vault_items?user_id=eq.${userId}&order=created_at.desc`, {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setVaultItems(data);
          setVaultLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Failed to load/migrate vault items from Supabase:", err);
      }
    }

    // Fallback to local storage if Supabase is unavailable
    setVaultItems(JSON.parse(localStorage.getItem('px_vault') || '[]'));
    setVaultLoading(false);
  };
  useEffect(() => {
    Promise.resolve().then(() => {
      loadVaultItems();
    });
  }, [user]);

  const triggerVaultToast = (msg) => { setVaultToast(msg); setTimeout(() => setVaultToast(''), 3000); };

  const handleSaveVaultItem = async () => {
    if (!vaultForm.title.trim()) return triggerVaultToast('Titel ist erforderlich.');
    setVaultSaving(true);
    const payload = {
      user_id: user?.uid || 'local',
      type: vaultForm.type,
      title: vaultForm.title.trim(),
      content: vaultForm.content.trim(),
      tags: vaultForm.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      created_at: new Date().toISOString(),
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let saved = false;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/vault_items`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          saved = true;
        }
      } catch (err) {
        console.warn("Failed to save vault item to Supabase:", err);
      }
    }

    if (!saved) {
      const local = JSON.parse(localStorage.getItem('px_vault') || '[]');
      localStorage.setItem('px_vault', JSON.stringify([{ id: new Date().getTime().toString(), ...payload }, ...local]));
    }

    await loadVaultItems();
    setVaultForm({ type: 'note', title: '', content: '', tags: '' });
    setVaultSaving(false);
    triggerVaultToast('Erfolgreich in den Vault eingespeist.');
  };

  const handleDeleteVaultItem = async (id) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let deleted = false;
    if (supabaseUrl && supabaseAnonKey && isNaN(Number(id))) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/vault_items?id=eq.${id}`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        });
        if (res.ok) {
          deleted = true;
        }
      } catch (err) {
        console.warn("Failed to delete vault item from Supabase:", err);
      }
    }

    if (!deleted) {
      const local = JSON.parse(localStorage.getItem('px_vault') || '[]');
      localStorage.setItem('px_vault', JSON.stringify(local.filter(i => i.id !== id)));
    }

    setVaultItems(prev => prev.filter(i => i.id !== id));
    triggerVaultToast('Eintrag gelöscht.');
  };

  /* ─── Handlers ─── */
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: chatInput }]);
    const prompt = chatInput;
    setChatInput('');
    await handleCommand(prompt);
  };

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    saveProfile({ weeklyGoals: [...(profile.weeklyGoals || []), { text: newGoalText, completed: false }] });
    setNewGoalText('');
  };

  const toggleGoal = (idx) => {
    saveProfile({ weeklyGoals: (profile.weeklyGoals || []).map((g, i) => i === idx ? { ...g, completed: !g.completed } : g) });
  };

  const handleSaveMetrics = (e) => {
    e.preventDefault();
    saveProfile({ metrics: { hrv: parseInt(editHrv) || 70, sleep: parseInt(editSleep) || 80 } });
  };

  const handleAddBlock = (e) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    addCustomBlock(customTitle, parseInt(customDuration) || 30, 'Focus', 'focus');
    setCustomTitle('');
  };

  const handleAddCalendarBlock = () => {
    const t = prompt('Titel des neuen Blocks:');
    if (!t) return;
    const time = prompt('Startzeit (HH:MM):', '12:00');
    addCalendarBlock(t, time);
  };

  const handleAddCalendarNote = () => {
    const dateStr = formatDate(selectedDate);
    const currentNote = calendar[dateStr]?.note || '';
    const note = prompt('Notiz für diesen Tag hinzufügen:', currentNote);
    if (note !== null) {
      setCalendar(prev => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          note
        }
      }));
    }
  };

  const handleEditCalendarBlock = (idx, currentTitle, currentTime) => {
    const newTitle = prompt('Titel anpassen:', currentTitle);
    const newTime = prompt('Startzeit anpassen (HH:MM):', currentTime);
    editCalendarBlock(idx, { title: newTitle ?? currentTitle, startTime: newTime ?? currentTime });
  };

  const handleDayChatSubmit = async (e) => {
    e.preventDefault();
    if (!dayChatInput.trim()) return;
    await chatWithDayAI(dayChatInput);
    setDayChatInput('');
  };

  const handleOpenSkillLab = async () => {
    setIsGeneratingSkill(true);
    setSkillContent('');
    setActiveModuleId(null);
    setSkillNotes({});
    setCompletedSteps({});
    setWatchedVideos({});
    const content = await generateSkillMaterials();
    setSkillContent(content);
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.modules && parsed.modules.length > 0) {
        setActiveModuleId(parsed.modules[0].id);
      }
    } catch (e) {
      console.error("[Skill Lab] Error initializing module selection:", e);
    }
    setIsGeneratingSkill(false);
  };

  /* ─── Computed Values ─── */
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalTime > 0 ? (timeLeft / totalTime) : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinToTime = (min) => {
    const h = Math.floor((min % (24 * 60)) / 60);
    const m = Math.floor(min % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const currentBlock = blocks[blockIdx] || {
    title: 'Kein aktiver Block', type: 'Focus', pillar: 'focus',
    rec: 'Keine Empfehlungen geladen.', insight: 'Initialisiere das Pronoia System.'
  };

  /* ─── Live Clock Helpers ─── */
  const clockHH = liveTime.getHours().toString().padStart(2, '0');
  const clockMM = liveTime.getMinutes().toString().padStart(2, '0');
  const clockSS = liveTime.getSeconds().toString().padStart(2, '0');
  const greeting = useMemo(() => {
    const h = liveTime.getHours();
    if (h < 5)  return 'Nacht-Modus';
    if (h < 12) return 'Guten Morgen';
    if (h < 17) return 'Guten Tag';
    if (h < 21) return 'Guten Abend';
    return 'Erholung-Modus';
  }, [clockHH]);

  const todayStr = liveTime.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });

  /* ─── Focus Score ─── */
  const focusScore = useMemo(() => {
    const hrv    = profile?.metrics?.hrv   || 72;
    const sleep  = profile?.metrics?.sleep || 84;
    const hrvNorm  = Math.min(100, (hrv / 100) * 100);
    const raw = Math.round((hrvNorm * 0.55) + (sleep * 0.45));
    return Math.max(10, Math.min(99, raw));
  }, [profile]);

  const focusLabel = focusScore >= 80 ? 'PEAK' : focusScore >= 60 ? 'OPTIMAL' : focusScore >= 40 ? 'MODERAT' : 'KRITISCH';
  const focusColor = focusScore >= 80 ? 'var(--green)' : focusScore >= 60 ? 'var(--cobalt-bright)' : focusScore >= 40 ? 'var(--amber)' : 'var(--red)';

  const prog = totalTime > 0 ? 1 - timeLeft / totalTime : 0;
  let ltpPotential = 45;
  let plasticity = 50;
  if (currentBlock.pillar === 'skills') { ltpPotential = Math.min(98, Math.round(70 + prog * 28)); plasticity = Math.min(95, Math.round(60 + prog * 35)); }
  else if (currentBlock.pillar === 'focus') { ltpPotential = Math.min(85, Math.round(50 + prog * 20)); plasticity = Math.min(90, Math.round(55 + prog * 25)); }
  else { ltpPotential = Math.max(20, Math.round(50 - prog * 30)); plasticity = Math.max(30, Math.round(60 - prog * 20)); }

  const getAgentStatus = (agentId) => {
    if (consensusData?.agentStatuses?.[agentId]) {
      return consensusData.agentStatuses[agentId];
    }
    const isFocus = currentBlock.pillar === 'focus';
    const isSkills = currentBlock.pillar === 'skills';
    const isRecovery = currentBlock.pillar === 'recovery';
    const isHealth = currentBlock.pillar === 'health';
    const recentFriction = frictionLogs.length > 0 && (liveTime.getTime() - frictionLogs[frictionLogs.length - 1].timestamp < 60000);
    const lastFrictionStatus = frictionLogs.length > 0 ? frictionLogs[frictionLogs.length - 1].status : null;
    switch (agentId) {
      case 'A.01': return isFocus ? { status: 'LEADING', text: 'Kognitiver Fokus-Index: 94% — Notification-Filter aktiv.' } : { status: 'MONITORING', text: 'Bereitschaft hoch. Überwacht kognitive Baseline.' };
      case 'A.02': return currentBlock.title?.toLowerCase().includes('stack') ? { status: 'LEADING', text: 'PX-V1 Absorption Peak: 78%. Biosynthese nominal.' } : { status: 'MONITORING', text: 'Glukose & Insulin stabil.' };
      case 'A.03': return currentBlock.title?.toLowerCase().includes('sleep') ? { status: 'LEADING', text: 'Circadian Gate OFFEN. Melatonin-Synthese aktiv.' } : { status: 'MONITORING', text: 'Licht-Synchronisation nominal.' };
      case 'A.04': return isRecovery ? { status: 'LEADING', text: 'PNS-Aktivierung aktiv. HRV steigt.' } : { status: 'MONITORING', text: `HRV: ${profile?.metrics?.hrv || 72}ms. Regeneration im Plan.` };
      case 'A.05': return (recentFriction && lastFrictionStatus === 'miss') ? { status: 'ACTIVE', text: 'Friction detektiert! Anpassung aktiv.' } : { status: 'MONITORING', text: 'Habit-Adhärenz hoch.' };
      case 'A.06': return { status: 'SUPERVISING', text: `Consensus nominal. Steuert: ${currentBlock.title}.` };
      default: return { status: 'MONITORING', text: 'Aktiv.' };
    }
  };

  const getStandingRank = (level) => {
    if (level >= 8) return 'Bio-Cognitive Pioneer';
    if (level >= 4) return 'Bio-Cognitive Specialist';
    return 'Bio-Cognitive Adept';
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    let startPadding = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const dayCells = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) dayCells.push({ day: prevMonthDays - i, isCurrent: false, date: new Date(year, month - 1, prevMonthDays - i) });
    for (let d = 1; d <= totalDays; d++) dayCells.push({ day: d, isCurrent: true, date: new Date(year, month, d) });
    for (let i = 1; i <= 42 - dayCells.length; i++) dayCells.push({ day: i, isCurrent: false, date: new Date(year, month + 1, i) });
    return dayCells;
  };

  const days = getDaysInMonth();
  const dateStrSelected = formatDate(selectedDate);
  const dateStrToday = formatDate(new Date());
  const selectedDateStr = formatDate(selectedDate);
  const daySchedule = calendar[selectedDateStr] || { blocks: [] };
  const hasTodayCalBlocks = calendar[dateStrToday]?.blocks?.length > 0;

  /* ─── Gate Renders ─── */
  if (gateState === 'loading') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: '#080a0f',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#6a7890', letterSpacing: '0.15em', gap: '1.5rem'
      }}>
        <div style={{ width: '36px', height: '36px', border: '2px solid rgba(26,106,255,0.15)', borderTopColor: '#1A6AFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        LIFE_OS_INITIALIZING...
      </div>
    );
  }
  if (gateState === 'auth') return <GateScreen reason="auth" />;

  /* ═══════════════════════════════════════════════════════
     MAIN RENDER
  ═══════════════════════════════════════════════════════ */
  const renderLibraryTabContent = () => {
    const BOOK_STATUS = {
      unread: 'Ungelesen',
      reading: 'Aktuell am Lesen',
      completed: 'Gelesen'
    };
    
    const allBookGenres = [...new Set(libraryBooks.map(b => b.genre || 'Allgemein'))];
    
    return (
      <div className={styles.vtView}>
        <div className={styles.vtGlow} aria-hidden="true" style={{ background: 'radial-gradient(circle, rgba(34,220,238,0.06) 0%, transparent 65%)' }} />

        <header className={styles.vtHero}>
          <div className={styles.vtEyebrow}>Library · Ingestion &amp; Wisdom Vault</div>
          <h1 className={styles.vtTitle}>Deine persönliche<br />Bibliothek.</h1>
          <p className={styles.vtLede}>Archiviere gelesene Werke, erfasse deine Erkenntnisse und verwalte deinen Lesefortschritt.</p>
          <div className={styles.vtStats}>
            <span><strong>{libraryBooks.length}</strong> Bücher</span>
            <span><strong>{allBookGenres.length}</strong> Genres</span>
          </div>
        </header>

        <div className={styles.vtGrid}>
          <section className={styles.vtCard}>
            <div className={styles.vtCardHead}>
              <span className={styles.vtCardIndex}>+</span>
              Buch hinzufügen
            </div>
            <div className={styles.vtCardBody}>
              {libraryToast && <div className={styles.vtToast} style={{ background: 'rgba(34,220,238,0.15)', color: '#22D3EE', border: '1px solid rgba(34,220,238,0.3)' }}>{libraryToast}</div>}
              
              <label className={styles.vtLabel}>Buchtitel</label>
              <input 
                type="text" 
                className={styles.vtInput} 
                placeholder="z.B. Meditations..." 
                value={libraryForm.title} 
                onChange={e => setLibraryForm(f => ({ ...f, title: e.target.value }))} 
              />
              
              <label className={styles.vtLabel}>Autor</label>
              <input 
                type="text" 
                className={styles.vtInput} 
                placeholder="z.B. Marcus Aurelius..." 
                value={libraryForm.author} 
                onChange={e => setLibraryForm(f => ({ ...f, author: e.target.value }))} 
              />
              
              <label className={styles.vtLabel}>Genre / Tag</label>
              <input 
                type="text" 
                className={styles.vtInput} 
                placeholder="z.B. Philosophie, Psychologie..." 
                value={libraryForm.genre} 
                onChange={e => setLibraryForm(f => ({ ...f, genre: e.target.value }))} 
              />

              <label className={styles.vtLabel}>Status</label>
              <div className={styles.vtTypeGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {[
                  { v: 'unread', label: 'Ungelesen' },
                  { v: 'reading', label: 'Lesen' },
                  { v: 'completed', label: 'Gelesen' }
                ].map(s => (
                  <button
                    type="button"
                    key={s.v}
                    className={`${styles.vtTypeBtn} ${libraryForm.status === s.v ? styles.vtTypeBtnActive : ''}`}
                    style={libraryForm.status === s.v ? { borderColor: '#22D3EE', color: '#22D3EE', background: 'rgba(34,220,238,0.06)' } : {}}
                    onClick={() => setLibraryForm(f => ({ ...f, status: s.v, progress: s.v === 'completed' ? 100 : s.v === 'unread' ? 0 : f.progress }))}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {libraryForm.status === 'reading' && (
                <>
                  <label className={styles.vtLabel} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Lesefortschritt</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#22D3EE' }}>{libraryForm.progress}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    className={styles.vtInput}
                    style={{ accentColor: '#22D3EE', cursor: 'pointer', height: '4px', padding: 0 }}
                    value={libraryForm.progress} 
                    onChange={e => setLibraryForm(f => ({ ...f, progress: Number(e.target.value) }))} 
                  />
                </>
              )}

              <label className={styles.vtLabel}>Bewertung (1-5★)</label>
              <div className={styles.vtTypeGrid} style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                {[1, 2, 3, 4, 5].map(stars => (
                  <button
                    type="button"
                    key={stars}
                    className={`${styles.vtTypeBtn} ${Number(libraryForm.rating) === stars ? styles.vtTypeBtnActive : ''}`}
                    style={Number(libraryForm.rating) === stars ? { borderColor: '#22D3EE', color: '#22D3EE', background: 'rgba(34,220,238,0.06)' } : {}}
                    onClick={() => setLibraryForm(f => ({ ...f, rating: stars }))}
                  >
                    {stars}★
                  </button>
                ))}
              </div>

              <label className={styles.vtLabel}>Wichtige Erkenntnis / Zitat</label>
              <input 
                type="text" 
                className={styles.vtInput} 
                placeholder="Lieblingszitat aus dem Buch..." 
                value={libraryForm.quote} 
                onChange={e => setLibraryForm(f => ({ ...f, quote: e.target.value }))} 
              />

              <label className={styles.vtLabel}>Persönliche Notizen &amp; Erkenntnisse</label>
              <textarea 
                className={styles.vtInput} 
                rows={4} 
                style={{ resize: 'none' }} 
                placeholder="Was hast du aus diesem Buch gelernt?..." 
                value={libraryForm.notes} 
                onChange={e => setLibraryForm(f => ({ ...f, notes: e.target.value }))} 
              />
              
              <button 
                className={styles.vtIngestBtn} 
                style={{ background: 'linear-gradient(135deg, #22D3EE 0%, #0891B2 100%)', color: '#000', fontWeight: 'bold' }}
                onClick={handleSaveBook} 
                disabled={librarySaving}
              >
                {librarySaving ? 'Archiviere...' : 'Buch archivieren →'}
              </button>
            </div>
          </section>

          <aside className={styles.vtCard}>
            <div className={styles.vtCardHead}>
              <span className={styles.vtCardIndex}>◫</span>
              Bücherregal
            </div>
            <div className={styles.vtCardBody}>
              <div className={styles.vtItemScroll} style={{ maxHeight: '680px' }}>
                {libraryLoading ? (
                  <p className={styles.vtEmpty}>Lade Bibliothek…</p>
                ) : libraryBooks.length === 0 ? (
                  <p className={styles.vtEmpty}>Noch keine Bücher archiviert.</p>
                ) : (
                  libraryBooks.map(book => {
                    const status = book.status || 'unread';
                    const progress = status === 'completed' ? 100 : (book.progress || 0);
                    const statusMeta = {
                      reading: { label: 'Aktuell am Lesen', color: '#22D3EE' },
                      completed: { label: 'Abgeschlossen', color: '#34d399' },
                      unread: { label: 'Ungelesen', color: 'rgba(255,255,255,0.4)' }
                    }[status];
                    return (
                      <div
                        key={book.id}
                        className={styles.vtItem}
                        style={{
                          display: 'flex',
                          gap: '1.25rem',
                          padding: '1.1rem',
                          borderLeft: 'none',
                          opacity: status === 'unread' ? 0.7 : 1
                        }}
                      >
                        {/* Cover spine */}
                        <div style={{ position: 'relative', flexShrink: 0, width: '84px', height: '128px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.35)', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.06), transparent)' }} />
                          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>
                            {book.author}
                          </span>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                                <span className={styles.vtItemType} style={{ color: '#22D3EE', background: 'rgba(34,220,238,0.1)' }}>{book.genre || 'Allgemein'}</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: statusMeta.color }}>
                                  {status === 'reading' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22D3EE', boxShadow: '0 0 8px #22D3EE' }} className={styles.pulseDot} />}
                                  {statusMeta.label}
                                </span>
                              </div>
                              <h4 className={styles.vtItemTitle} style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', margin: 0 }}>
                                {book.title}
                              </h4>
                              <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', opacity: 0.55 }}>{book.author}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                              {book.rating ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#22D3EE' }}>
                                  {book.rating}/5 <span style={{ color: '#F59E0B' }}>★</span>
                                </span>
                              ) : (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)' }}>–/5 ★</span>
                              )}
                              <button className={styles.vtItemDelete} onClick={() => handleDeleteBook(book.id)} aria-label="Löschen">✕</button>
                            </div>
                          </div>

                          {(book.notes || book.quote) ? (
                            book.quote ? (
                              <blockquote style={{ margin: '0.6rem 0 0', paddingLeft: '0.6rem', borderLeft: '2px solid rgba(34,220,238,0.3)', fontStyle: 'italic', fontSize: '0.76rem', color: 'var(--text2)', lineHeight: 1.4 }}>
                                &ldquo;{book.quote}&rdquo;
                              </blockquote>
                            ) : (
                              <p className={styles.vtItemContent} style={{ fontSize: '0.78rem', marginTop: '0.6rem', lineHeight: 1.45, opacity: 0.75 }}>{book.notes}</p>
                            )
                          ) : (
                            <p style={{ fontSize: '0.76rem', marginTop: '0.6rem', fontStyle: 'italic', opacity: 0.35 }}>Noch keine Notizen erfasst.</p>
                          )}

                          {/* Progress */}
                          <div style={{ marginTop: 'auto', paddingTop: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>Fortschritt</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: status === 'completed' ? 'rgba(255,255,255,0.5)' : '#22D3EE' }}>{progress}%</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '3px', width: '100%', overflow: 'hidden' }}>
                              <div style={{ background: status === 'completed' ? 'rgba(255,255,255,0.4)' : '#22D3EE', height: '100%', width: `${progress}%`, boxShadow: status === 'completed' ? 'none' : '0 0 10px rgba(34,211,238,0.5)' }} />
                            </div>
                            {status === 'reading' && (
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={book.progress || 0}
                                style={{ accentColor: '#22D3EE', height: '10px', padding: 0, width: '100%', marginTop: '0.4rem', cursor: 'pointer' }}
                                onChange={e => handleUpdateBookProgress(book.id, e.target.value)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  };

  const renderBlueprintsView = () => {
    const ACCENT = '#1A6AFF';
    const bpCats = ['all', ...Array.from(new Set(blueprints.map(b => b.category).filter(Boolean)))];
    const q = blueprintSearch.trim().toLowerCase();
    const prices = blueprints.map(b => b.price || 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const priceCap = bpPriceCap == null ? maxPrice : bpPriceCap;
    const visibleBlueprints = blueprints.filter(bp => {
      const catOk = blueprintCategory === 'all' || bp.category === blueprintCategory;
      const searchOk = !q || (bp.name + ' ' + (bp.creator || '') + ' ' + (bp.description || '')).toLowerCase().includes(q);
      const priceOk = (bp.price || 0) <= priceCap;
      return catOk && searchOk && priceOk;
    });
    const renderStars = (rating = 5) => {
      const full = Math.floor(rating);
      const half = rating - full >= 0.5;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1px', color: '#F59E0B' }}>
          {[0, 1, 2, 3, 4].map(i => (
            <span key={i} className="material-symbols-outlined" style={{ fontSize: '0.95rem', fontVariationSettings: i < full ? "'FILL' 1" : (i === full && half ? "'FILL' 1" : undefined), opacity: i < full || (i === full && half) ? 1 : 0.3 }}>
              {i === full && half ? 'star_half' : 'star'}
            </span>
          ))}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text3)', marginLeft: '0.35rem' }}>{(rating || 5).toFixed(1)}</span>
        </span>
      );
    };

    const toast = bpInstallToast ? (
      <div className={`${styles.bpToast} ${bpInstallToast.type === 'err' ? styles.bpToastErr : ''}`}>
        <span className="material-symbols-outlined">{bpInstallToast.type === 'err' ? 'error' : 'check_circle'}</span>
        {bpInstallToast.msg}
      </div>
    ) : null;

    // ─── Blueprint detail page ───
    if (selectedBlueprint) {
      const bp = selectedBlueprint;
      const isInstalled = installedBlueprints.some(i => i.id === bp.id);
      return (
        <div className={styles.ecoDetail} style={{ marginTop: '2rem' }}>
          {toast}
          <button className={styles.ecoBack} onClick={() => setSelectedBlueprint(null)}>← Zurück zu den Protokollen</button>
          <div className={styles.ecoDetailTop}>
            <div className={styles.ecoDetailImg}>
              <img src={bp.image} alt={bp.name} onError={(e) => { e.currentTarget.src = blueprintMock(bp.category); }} />
            </div>
            <div className={styles.ecoDetailInfo}>
              <div className={styles.ecoDetailCat}>{bp.category} · {bp.difficulty}{bp.duration ? ` · ${bp.duration}` : ''}</div>
              <h2 className={styles.ecoDetailName}>{bp.name}</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '0.25rem 0 0.6rem' }}>von {bp.creator}</p>
              <div style={{ marginBottom: '1rem' }}>{renderStars(bp.rating)}</div>
              <div className={styles.ecoDetailPrice}>{bp.price > 0 ? `${bp.price} €` : 'FREE'} <span>einmalig</span></div>
              <p className={styles.ecoDetailDesc}>{bp.overview || bp.description}</p>
              <button
                className={styles.ecoAddBtnLg}
                style={{ background: isInstalled ? 'rgba(26,106,255,0.1)' : ACCENT, color: isInstalled ? ACCENT : '#fff', border: isInstalled ? `1px solid ${ACCENT}` : 'none' }}
                onClick={() => handleInstallBlueprint(bp)}
                disabled={isInstalled}
              >
                {isInstalled ? '✓ Installiert' : 'Erwerben & installieren'}
              </button>
            </div>
          </div>
          <div className={styles.ecoDetailCards}>
            <div className={styles.ecoInfoCard}>
              <div className={styles.ecoInfoLabel}>Vorteile</div>
              <ul className={styles.ecoInfoList}>
                {(bp.benefits || []).map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
            <div className={styles.ecoInfoCard}>
              <div className={styles.ecoInfoLabel}>Das Protokoll</div>
              <div className={styles.ecoIngredients}>
                {(bp.protocol || []).map(([phase, detail], i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: '0.5rem 0', borderBottom: i < (bp.protocol.length - 1) ? '1px solid var(--border-s)' : 'none' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: ACCENT }}>{phase}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.5 }}>{detail}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.ecoInfoCard}>
              <div className={styles.ecoInfoLabel}>Enthalten</div>
              <ul className={styles.ecoInfoList}>
                {(bp.includes || []).map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ marginTop: '2rem', display: 'flex', gap: '2.5rem', alignItems: 'flex-start' }} className={styles.bpLayout}>
        {toast}
        {/* Left filter sidebar */}
        <aside className={styles.bpSidebar}>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '1.1rem' }}>search</span>
            <input
              type="text"
              value={blueprintSearch}
              onChange={e => setBlueprintSearch(e.target.value)}
              placeholder="Protokolle durchsuchen..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem 1rem 0.75rem 2.75rem', fontSize: '0.85rem', color: 'var(--text)', outline: 'none' }}
            />
          </div>

          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text3)', marginBottom: '1rem' }}>Kategorien</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {bpCats.map(c => {
                const active = blueprintCategory === c;
                return (
                  <li key={c}>
                    <button
                      onClick={() => setBlueprintCategory(c)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: active ? ACCENT : 'var(--text2)', transition: 'color 0.2s' }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? ACCENT : 'rgba(255,255,255,0.2)', boxShadow: active ? '0 0 8px rgba(26,106,255,0.8)' : 'none' }} />
                      {c === 'all' ? 'Alle' : c.charAt(0) + c.slice(1).toLowerCase()}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text3)' }}>Investment Level</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: ACCENT }}>≤ {priceCap} €</span>
            </div>
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              step={10}
              value={priceCap}
              onChange={(e) => setBpPriceCap(Number(e.target.value))}
              className={styles.bpSlider}
              aria-label="Maximaler Preis"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text3)', marginTop: '0.5rem' }}>
              <span>{minPrice} €</span>
              <span>{maxPrice} €</span>
            </div>
            {bpPriceCap != null && bpPriceCap < maxPrice && (
              <button
                onClick={() => setBpPriceCap(null)}
                style={{ marginTop: '0.75rem', background: 'none', border: 'none', color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        </aside>

        {/* Main grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {blueprintsLoading ? (
            <p className={styles.ecoEmpty}>Lade Blueprints…</p>
          ) : visibleBlueprints.length === 0 ? (
            <p className={styles.ecoEmpty}>Keine Protokolle gefunden.</p>
          ) : (
            <div className={styles.ecoGrid}>
              {visibleBlueprints.map((bp, idx) => {
                const isInstalled = installedBlueprints.some(i => i.id === bp.id);
                const featured = idx === 0;
                return (
                  <article
                    key={bp.id}
                    className={styles.ecoCard}
                    style={{ border: isInstalled ? `1px solid ${ACCENT}` : '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => setSelectedBlueprint(bp)}
                  >
                    <div className={styles.ecoCardImg} style={{ position: 'relative' }}>
                      <img src={bp.image} alt={bp.name} style={{ height: '180px', objectFit: 'cover', width: '100%' }} onError={(e) => { e.currentTarget.src = blueprintMock(bp.category); }} />
                      <span className={styles.ecoCardCat} style={{ background: featured ? ACCENT : 'rgba(255,255,255,0.1)' }}>
                        {featured ? 'Bestseller' : bp.category}
                      </span>
                    </div>
                    <div className={styles.ecoCardBody}>
                      <div style={{ marginBottom: '0.5rem' }}>{renderStars(bp.rating)}</div>
                      <div className={styles.ecoCardTop}>
                        <h3 className={styles.ecoCardName}>{bp.name}</h3>
                      </div>
                      <p style={{ fontSize: '0.72rem', opacity: 0.55, margin: '0 0 0.5rem' }}>von {bp.creator}</p>
                      <p className={styles.ecoCardDesc} style={{ minHeight: '3.2rem' }}>{bp.description}</p>
                      <div className={styles.ecoCardFoot} style={{ alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-s)', paddingTop: '1rem' }}>
                        <span className={styles.ecoCardPrice} style={{ fontFamily: 'var(--font-mono)' }}>
                          {bp.price > 0 ? `${bp.price} €` : 'FREE'}
                        </span>
                        <button
                          className={styles.ecoAddBtn}
                          style={{ background: isInstalled ? 'rgba(26,106,255,0.1)' : ACCENT, color: isInstalled ? ACCENT : '#fff', border: isInstalled ? `1px solid ${ACCENT}` : 'none' }}
                          onClick={(e) => { e.stopPropagation(); handleInstallBlueprint(bp); }}
                          disabled={isInstalled}
                        >
                          {isInstalled ? '✓ Installiert' : 'Erwerben'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'apps':
        return (
          <div className={styles.launcherShell}>
            <div className={styles.launcherHeader}>
              <div className={styles.launcherMeta}>Module</div>
              <h2 className={styles.launcherTitle}>Willkommen im Pronoia Life OS</h2>
              <p className={styles.launcherSub}>
                Wähle ein Modul, um es zu öffnen. Ziehe es in die Seitenleiste, um es anzupinnen — Icons und Namen lassen sich über das Zahnrad bearbeiten.
              </p>
            </div>

            <div className={styles.appsGrid}>
              {appsList.map((app, idx) => {
                const isEditing = editingAppId === app.id;
                return (
                  <div
                    key={app.id}
                    className={styles.appCard}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', app.id);
                      e.dataTransfer.effectAllowed = 'copyMove';
                    }}
                    onClick={() => {
                      if (!isEditing) {
                        selectTab(app.id);
                      }
                    }}
                  >
                    <span className={styles.appCardIndex}>{String(idx + 1).padStart(2, '0')}</span>
                    {/* App icon or custom image */}
                    <div className={styles.appCardIconWrapper}>
                      {app.image ? (
                        <img src={app.image} alt={app.name} className={styles.appCardCustomImg} />
                      ) : (
                        <span className={styles.appCardIconSymbol}>
                          {renderNavIcon(app.icon || app.id, true)}
                        </span>
                      )}
                      
                      {app.id === 'social' && chatUnreadCount > 0 && (
                        <div className={styles.appCardBadge}>{chatUnreadCount}</div>
                      )}
                      
                      {/* Edit overlay button */}
                      <button
                        className={styles.appCardEditBtn}
                        onClick={(e) => handleEditAppClick(app, e)}
                        title="App bearbeiten"
                      >
                        ⚙️
                      </button>
                    </div>

                    {isEditing ? (
                      <div className={styles.appCardEditForm} onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          className={styles.appCardInput}
                          value={editAppName}
                          onChange={e => setEditAppName(e.target.value)}
                          placeholder="App Name"
                          required
                        />
                        <input
                          type="text"
                          className={styles.appCardInput}
                          value={editAppDesc}
                          onChange={e => setEditAppDesc(e.target.value)}
                          placeholder="Beschreibung"
                        />
                        <div className={styles.appCardUploadRow}>
                          <label className={styles.appCardUploadLabel}>
                            {uploadingAppIcon === app.id ? 'Lädt...' : 'Icon hochladen'}
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleAppIconFileChange(app.id, e)}
                            />
                          </label>
                        </div>
                        <div className={styles.appCardEditActions}>
                          <button className={styles.appCardSaveBtn} onClick={handleSaveAppEdit}>✓</button>
                          <button className={styles.appCardCancelBtn} onClick={() => setEditingAppId(null)}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.appCardInfo}>
                        <div className={styles.appCardName}>{app.name}</div>
                        <div className={styles.appCardDesc}>{app.desc}</div>
                        <div className={styles.appCardOpen}>Öffnen<span aria-hidden="true"> →</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={styles.launcherFooter}>
              <button className={styles.resetAppsBtn} onClick={handleResetApps}>
                Standard-Apps wiederherstellen
              </button>
            </div>
          </div>
        );
      case 'social':
        return <SocialHub setActiveTab={setActiveTab} stack={stack} />;
      case 'tribe':
        return <TribeHub />;
      case 'lab':
        return <PronoiaLab setActiveTab={setActiveTab} />;
      case 'games':
        return <ChessLab setActiveTab={setActiveTab} />;
      case 'monk-mode':
        return <MonkMode setActiveTab={setActiveTab} />;
      case 'gym':
        return <GymTab setActiveTab={setActiveTab} />;
      case 'behavior':
        return <BehaviorTab setActiveTab={setActiveTab} />;
      case 'dashboard':
        return (
          <DashboardTab
            circadianMode={circadianMode}
            setCircadianMode={setCircadianMode}
            currentBlock={currentBlock}
            blocks={blocks}
            blockIdx={blockIdx}
            timeLeft={timeLeft}
            totalTime={totalTime}
            isRunning={isRunning}
            manualPeekIdx={manualPeekIdx}
            setManualPeekIdx={setManualPeekIdx}
            dragStartX={dragStartX}
            dragCurrentX={dragCurrentX}
            radius={radius}
            circumference={circumference}
            strokeDashoffset={strokeDashoffset}
            showTimeEdit={showTimeEdit}
            setShowTimeEdit={setShowTimeEdit}
            editTimeMinutes={editTimeMinutes}
            setEditTimeMinutes={setEditTimeMinutes}
            profile={profile}
            ltpPotential={ltpPotential}
            plasticity={plasticity}
            messages={messages}
            isTyping={isTyping}
            chatEndRef={chatEndRef}
            chatInput={chatInput}
            setChatInput={setChatInput}
            pendingQueueOverride={pendingQueueOverride}
            setPendingQueueOverride={setPendingQueueOverride}
            hasTodayCalBlocks={hasTodayCalBlocks}
            customTitle={customTitle}
            setCustomTitle={setCustomTitle}
            customDuration={customDuration}
            setCustomDuration={setCustomDuration}
            formatTime={formatTime}
            formatMinToTime={formatMinToTime}
            prevBlock={prevBlock}
            skipBlock={skipBlock}
            toggleTimer={toggleTimer}
            handleDragStart={handleDragStart}
            handleDragMove={handleDragMove}
            handleDragEnd={handleDragEnd}
            handleTimeEditSubmit={handleTimeEditSubmit}
            logFriction={logFriction}
            handleSendChat={handleSendChat}
            confirmQueueOverride={confirmQueueOverride}
            restoreCalendarBlocks={restoreCalendarBlocks}
            loadProtocolQueue={loadProtocolQueue}
            handleLiabilityClick={handleLiabilityClick}
            handleAddBlock={handleAddBlock}
            uploadDataSource={uploadDataSource}
            setActiveTab={setActiveTab}
            saveProfile={saveProfile}
            addCalendarBlock={addCalendarBlock}
          />
        );
      case 'biometrics':
        return (
          <BiometricsTab
            profile={profile}
            ltpPotential={ltpPotential}
            plasticity={plasticity}
            editHrv={editHrv}
            setEditHrv={setEditHrv}
            editSleep={editSleep}
            setEditSleep={setEditSleep}
            newGoalText={newGoalText}
            setNewGoalText={setNewGoalText}
            stack={stack}
            saveProfile={saveProfile}
            setActiveTab={setActiveTab}
            handleSaveMetrics={handleSaveMetrics}
            toggleGoal={toggleGoal}
            handleAddGoal={handleAddGoal}
            addStackItem={addStackItem}
            consumeStackItem={consumeStackItem}
            updateStackItem={updateStackItem}
            removeStackItem={removeStackItem}
          />
        );
      case 'skills': {
        let parsedSkillSession = null;
        try {
          if (skillContent) {
            parsedSkillSession = JSON.parse(skillContent);
          }
        } catch (e) {
          console.error("Failed to parse skill content JSON:", e);
        }

        const getModuleProgress = (mod) => {
          if (!mod) return 0;
          if (mod.type === 'video' || mod.type === 'theory') {
            return watchedVideos[mod.id] ? 100 : 0;
          }
          if (mod.type === 'practice') {
            const steps = mod.steps || [];
            if (steps.length === 0) return 0;
            const done = completedSteps[mod.id] || [];
            return Math.round((done.length / steps.length) * 100);
          }
          return 0;
        };

        const getOverallProgress = () => {
          if (!parsedSkillSession || !parsedSkillSession.modules) return 0;
          const total = parsedSkillSession.modules.reduce((acc, mod) => acc + getModuleProgress(mod), 0);
          return Math.round(total / parsedSkillSession.modules.length);
        };

        const overallProgress = getOverallProgress();
        const selectedModule = parsedSkillSession?.modules?.find(m => m.id === activeModuleId);

        const SK_TYPE = {
          video: { icon: '▶', label: 'Video Lesson' },
          theory: { icon: '◇', label: 'Theorie / Konzept' },
          practice: { icon: '⌘', label: 'Isolierte Übung' },
        };
        const skThumb = (type) => {
          if (type === 'video') {
            return <div className={styles.skThumb}><span className={styles.skThumbPlay}>▶</span></div>;
          }
          if (type === 'theory') {
            return (
              <div className={styles.skThumb}>
                <svg className={styles.skThumbNet} viewBox="0 0 100 60" aria-hidden="true">
                  <line x1="20" y1="30" x2="50" y2="15" /><line x1="20" y1="30" x2="50" y2="45" />
                  <line x1="50" y1="15" x2="80" y2="30" /><line x1="50" y1="45" x2="80" y2="30" />
                  <line x1="20" y1="30" x2="80" y2="30" />
                  <circle cx="20" cy="30" r="4" /><circle cx="50" cy="15" r="4" />
                  <circle cx="50" cy="45" r="4" /><circle cx="80" cy="30" r="4" />
                </svg>
              </div>
            );
          }
          return (
            <div className={styles.skThumb}>
              <div className={styles.skTerm}>
                <div className={styles.skTermDots}><span /><span /><span /></div>
                <div className={styles.skTermCode}>practice( )<br />&nbsp;&nbsp;focus…</div>
              </div>
            </div>
          );
        };
        const xpPct = Math.min(100, ((profile?.xp || 0) / (profile?.nextLevelXp || 500)) * 100);

        return (
          <div className={styles.skView}>
            <div className={styles.skGlow} aria-hidden="true" />

            {/* Hero */}
            <header className={styles.skHero}>
              <div className={styles.skEyebrow}>Skill Lab · Agentic Deliberate Practice</div>
              <h1 className={styles.skTitle}>Übe, was dich formt.</h1>
              <p className={styles.skLede}>Ein Raum für gezielte Meisterschaft und neuroplastisches Wachstum.</p>
            </header>

            {/* Setup row */}
            <div className={styles.skSetupRow}>
              <div className={styles.skCard}>
                <div className={styles.skCardLabel}>Ziel-Skill &amp; Stufe</div>
                <div className={styles.skSkillRow}>
                  <input
                    type="text"
                    className={styles.skSkillInput}
                    placeholder="Skill eingeben…"
                    value={profile?.skill || ''}
                    onChange={e => saveProfile({ skill: e.target.value })}
                  />
                  <div className={styles.skLvl}>
                    <span className={styles.skLvlLabel}>Lvl</span>
                    <input
                      type="number"
                      className={styles.skLvlInput}
                      value={profile?.skillLevel || 1}
                      onChange={e => saveProfile({ skillLevel: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.skCard}>
                <div className={styles.skCardLabel}>Kognitives Level &amp; XP</div>
                <div className={styles.skXpTop}>
                  <span className={styles.skXpLevel}>{profile?.skillLevel || 1}</span>
                  <span className={styles.skXpLabel}>{profile?.xp || 0} / {profile?.nextLevelXp || 500} XP</span>
                </div>
                <div className={styles.skXpBar}>
                  <div className={styles.skXpFill} style={{ width: `${xpPct}%` }} />
                </div>
              </div>
            </div>

            {/* Workspace */}
            <section className={styles.skWorkspace}>
              <div className={styles.skSectionLabel}>Deliberate Practice Workspace</div>

              {isGeneratingSkill ? (
                <div className={styles.skGenerating}>
                  <div className={styles.skSpinner} />
                  <div className={styles.skGenText}>GENERATING_NEURAL_PATHWAYS…</div>
                  <div className={styles.skGenSub}>Skill: {profile?.skill || 'Programmieren'} (Lvl {profile?.skillLevel || 1})</div>
                </div>
              ) : parsedSkillSession ? (
                <>
                  <div className={styles.skModuleGrid}>
                    {parsedSkillSession.modules.map(mod => {
                      const prog = getModuleProgress(mod);
                      const isActive = mod.id === activeModuleId;
                      const meta = SK_TYPE[mod.type] || SK_TYPE.practice;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          className={`${styles.skModCard} ${isActive ? styles.skModCardActive : ''}`}
                          onClick={() => setActiveModuleId(mod.id)}
                        >
                          <div className={styles.skModType}>
                            <span className={styles.skModTypeIcon}>{meta.icon}</span>
                            <span className={styles.skModTypeLabel}>{meta.label}</span>
                          </div>
                          {skThumb(mod.type)}
                          <h3 className={styles.skModTitle}>{mod.title}</h3>
                          <div className={styles.skModProgRow}>
                            <span className={styles.skModProgLabel}>Fortschritt</span>
                            <span className={styles.skModProgVal}>{prog}%</span>
                          </div>
                          <div className={styles.skModBar}>
                            <div className={styles.skModBarFill} style={{ width: `${prog}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedModule && (
                    <div className={styles.skDetailGrid}>
                      <div className={styles.skDetailMain}>
                        <div className={styles.skDetailHead}>
                          <h3 className={styles.skDetailTitle}>Aktive Session: {selectedModule.title}</h3>
                          <span className={styles.skStatus}>
                            {getModuleProgress(selectedModule) === 100 ? 'Abgeschlossen' : 'In Progress'}
                          </span>
                        </div>

                        {selectedModule.type === 'video' && (
                          <div className={styles.skVideo}>
                            <div className={styles.skVideoFrame}>
                              <iframe
                                className={styles.skVideoIframe}
                                src={selectedModule.videoUrl}
                                title={selectedModule.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            </div>
                            <p className={styles.skBodyText}>{selectedModule.summary}</p>
                            <button
                              type="button"
                              className={`${styles.skActionBtn} ${watchedVideos[selectedModule.id] ? styles.skActionBtnDone : ''}`}
                              onClick={() => setWatchedVideos(prev => ({ ...prev, [selectedModule.id]: !prev[selectedModule.id] }))}
                            >
                              {watchedVideos[selectedModule.id] ? 'Lektion wiederholen ↩' : 'Lektion abschließen ✓'}
                            </button>
                          </div>
                        )}

                        {selectedModule.type === 'theory' && (
                          <div className={styles.skTheory}>
                            <div className={styles.skBodyText}>
                              {selectedModule.content.split('\n\n').map((para, i) => (
                                <p key={i}>{para}</p>
                              ))}
                            </div>
                            <button
                              type="button"
                              className={`${styles.skActionBtn} ${watchedVideos[selectedModule.id] ? styles.skActionBtnDone : ''}`}
                              onClick={() => setWatchedVideos(prev => ({ ...prev, [selectedModule.id]: !prev[selectedModule.id] }))}
                            >
                              {watchedVideos[selectedModule.id] ? 'Als ungelesen markieren ↩' : 'Als gelesen markieren ✓'}
                            </button>
                          </div>
                        )}

                        {selectedModule.type === 'practice' && (
                          <div className={styles.skPractice}>
                            <p className={styles.skBodyText}>{selectedModule.instructions}</p>
                            <div className={styles.skChecklistLabel}>Checkliste</div>
                            <div className={styles.skChecklist}>
                              {(selectedModule.steps || []).map((step, idx) => {
                                const currentDone = completedSteps[selectedModule.id] || [];
                                const isChecked = currentDone.includes(idx);
                                return (
                                  <label key={idx} className={`${styles.skCheckRow} ${isChecked ? styles.skCheckRowDone : ''}`}>
                                    <input
                                      type="checkbox"
                                      className={styles.skCheckbox}
                                      checked={isChecked}
                                      onChange={() => {
                                        const updated = isChecked
                                          ? currentDone.filter(x => x !== idx)
                                          : [...currentDone, idx];
                                        setCompletedSteps(prev => ({ ...prev, [selectedModule.id]: updated }));
                                      }}
                                    />
                                    <span className={styles.skCheckText}>{step}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={styles.skNotes}>
                        <div className={styles.skCardLabel}>Persönliche Notizen</div>
                        <textarea
                          className={styles.skNotesArea}
                          placeholder="Notiere hier Erkenntnisse, Stolpersteine oder Heuristiken, die du während der Übung entdeckst…"
                          value={skillNotes[selectedModule.id] || ''}
                          onChange={(e) => setSkillNotes(prev => ({ ...prev, [selectedModule.id]: e.target.value }))}
                        />
                        <span className={styles.skNotesStatus}>Auto-saved locally</span>
                      </div>
                    </div>
                  )}

                  {/* Session footer */}
                  <div className={styles.skFooter}>
                    <div className={styles.skFooterProg}>
                      <div className={styles.skFooterProgTop}>
                        <span className={styles.skCardLabel}>Gesamt-Fortschritt</span>
                        <span className={styles.skFooterPct}>{overallProgress}%</span>
                      </div>
                      <div className={styles.skFooterBar}>
                        <div className={styles.skFooterFill} style={{ width: `${overallProgress}%` }} />
                      </div>
                    </div>
                    <div className={styles.skFooterActions}>
                      <button className={styles.skGhostBtn} onClick={handleOpenSkillLab}>Neu generieren</button>
                      <button
                        className={`${styles.skPrimaryBtn} ${overallProgress < 100 ? styles.skPrimaryBtnDisabled : ''}`}
                        disabled={overallProgress < 100}
                        onClick={() => {
                          if (overallProgress === 100) {
                            completeSkillSession(150);
                            setSkillContent('');
                            setActiveModuleId(null);
                            setSkillNotes({});
                            setCompletedSteps({});
                            setWatchedVideos({});
                          }
                        }}
                      >
                        Session abschließen (+150 XP) {overallProgress < 100 ? '🔒' : '✨'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.skEmpty}>
                  <p>Bereit für eine bio-kognitive Trainingseinheit? Generiere deinen adaptiven Trainingsplan.</p>
                  <button className={styles.skPrimaryBtn} onClick={handleOpenSkillLab}>Lab Session generieren</button>
                </div>
              )}
            </section>
          </div>
        );
      }
      case 'store':
        return (
          <StoreTab
            profile={profile}
            tiers={TIERS}
            storeCategory={storeCategory}
            setStoreCategory={setStoreCategory}
            cart={cart}
            portalTab={portalTab}
            setPortalTab={setPortalTab}
            storeView={storeView}
            setStoreView={setStoreView}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            tierCheckoutBusy={tierCheckoutBusy}
            tierCheckoutMsg={tierCheckoutMsg}
            handleTierCheckout={handleTierCheckout}
            handleCartCheckout={handleCartCheckout}
            cartCheckoutBusy={cartCheckoutBusy}
            cartCheckoutMsg={cartCheckoutMsg}
            renderBlueprintsView={renderBlueprintsView}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            setCartQty={setCartQty}
          />
        );
      case 'connectors':
        return (
          <ConnectorsTab
            connectorPermissions={connectorPermissions}
            setConnectorPermissions={setConnectorPermissions}
            expandedConnectors={expandedConnectors}
            setExpandedConnectors={setExpandedConnectors}
            profile={profile}
            saveProfile={saveProfile}
            requireConnectorSlot={requireConnectorSlot}
            terminalLogs={terminalLogs}
            handleWhoopSync={handleWhoopSync}
            isSyncingWhoop={isSyncingWhoop}
            handleNotionExport={handleNotionExport}
            isExportingNotion={isExportingNotion}
          />
        );
      case 'learn-your-way':
        return <LearnYourWay />;
      case 'library':
        return renderLibraryTabContent();
      case 'vault':
        return (
          <VaultTab
            vaultItems={vaultItems}
            vaultForm={vaultForm}
            setVaultForm={setVaultForm}
            vaultToast={vaultToast}
            uploadingFile={uploadingFile}
            uploadProgress={uploadProgress}
            vaultSaving={vaultSaving}
            vaultLoading={vaultLoading}
            handleVaultFileUpload={handleVaultFileUpload}
            handleSaveVaultItem={handleSaveVaultItem}
            handleDeleteVaultItem={handleDeleteVaultItem}
          />
        );
      case 'agents':
        return (
          <AgentsTab
            consensusData={consensusData}
            currentBlock={currentBlock}
            agents={AGENTS}
            getAgentStatus={getAgentStatus}
            directives={directives}
            refreshConsensus={refreshConsensus}
            consensusLoading={consensusLoading}
            lastConsensusAt={lastConsensusAt}
            acknowledgeDirective={acknowledgeDirective}
            dismissDirective={dismissDirective}
            logFriction={logFriction}
            frictionLogs={frictionLogs}
          />
        );
      case 'profile':
        return (
          <ProfileTab
            profile={profile}
            saveProfile={saveProfile}
            profileToast={profileToast}
            setProfileToast={setProfileToast}
            avatarPresets={AVATAR_PRESETS}
            getStandingRank={getStandingRank}
            setTutorialStep={setTutorialStep}
            user={user}
            resetPassword={resetPassword}
            logout={logout}
            exportE2EPrivateKey={exportE2EPrivateKey}
            importE2EPrivateKey={importE2EPrivateKey}
            resetE2EKeys={resetE2EKeys}
            setActiveTab={setActiveTab}
            calendar={calendar}
            stack={stack}
          />
        );
      case 'manager':
        return (
          <TabManager
            profile={profile}
            saveProfile={saveProfile}
            blocks={blocks}
            blockIdx={blockIdx}
            timeLeft={timeLeft}
            totalTime={totalTime}
            managerHistory={managerHistory}
            setManagerHistory={setManagerHistory}
            setAgentMsg={setAgentMsg}
          />
        );
      case 'northstar':
        return (
          <NorthStarTab
            nsDraft={nsDraft}
            setNsDraft={setNsDraft}
            nsEditedRef={nsEditedRef}
            profile={profile}
            nsReexplore={nsReexplore}
            setNsReexplore={setNsReexplore}
            nsNudge={nsNudge}
            nsMessage={nsMessage}
            nsBusy={nsBusy}
            nsRecalMsg={nsRecalMsg}
            nsRecalInput={nsRecalInput}
            setNsRecalInput={setNsRecalInput}
            nsRecalBusy={nsRecalBusy}
            saveFutureSelf={saveFutureSelf}
            askNorthStar={askNorthStar}
            recalibrate={recalibrate}
          />
        );
      case 'frequencies':
        return <FrequencyEngine />;
      default:
        return null;
    }
  };

  const isLabFullscreen = activeTab === 'lab';
  const APP_META = {
    apps: { name: 'Apps', desc: 'Alle Module' },
    profile: { name: 'Profil', desc: 'Konto & Anpassung' },
  };
  const activeApp = (appsList || defaultApps).find(a => a.id === activeTab)
    || APP_META[activeTab] || { name: activeTab, desc: '' };

  return (
    <div className={`${styles.shell} ${isLabFullscreen ? styles.fullscreenShell : ''}`}>
      {/* ═══ TOP TOOLBAR ═══ */}
      {!isLabFullscreen && (
        <div className={styles.desktopTitleBar}>
          <div className={styles.toolbarLeft}>
            <span className={styles.toolbarEyebrow}>{activeApp.desc || 'Pronoia Life OS'}</span>
            <span className={styles.toolbarTitle}>{activeApp.name}</span>
          </div>
          <div className={styles.toolbarRight}>
            <span className={styles.toolbarStatus}>
              <span className={styles.statusGlowDot} />
              Sync aktiv
            </span>
            <CinematicThemeSwitcher />
            <button className={styles.toolbarLogout} onClick={logout}>Logout</button>
          </div>
        </div>
      )}

      {linkNotification && (
        <div style={{
          position: 'fixed', top: '90px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,196,140,0.95)', color: '#fff', border: '1px solid #00c48c',
          padding: '0.75rem 1.5rem', borderRadius: '10px', zIndex: 10000,
          fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.05em',
          boxShadow: '0 10px 30px rgba(0,196,140,0.3)', display: 'flex', alignItems: 'center', gap: '10px',
          backdropFilter: 'blur(10px)'
        }}>
          <span>{linkNotification}</span>
          <button onClick={() => setLinkNotification(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', outline: 'none' }}>✕</button>
        </div>
      )}

      {/* ═══ SIDEBAR NAVIGATION ═══ */}
      {!isLabFullscreen && (
        <nav className={styles.sidebar}>
          {/* Brand masthead — links back to the main site */}
          <Link href="/" className={styles.sidebarLogo} aria-label="Zurück zur Hauptseite" title="Zurück zur Hauptseite">
            <img src="/pronoia-mark.png" alt="" aria-hidden="true" className={styles.sidebarLogoImg} />
            <img src="/pronoia-wordmark.png" alt="Pronoia" className={styles.sidebarWordmark} />
          </Link>

          {/* Section nav items */}
          <div 
            className={`${styles.sidebarNav} ${sidebarDragOver ? styles.sidebarNavDraggingOver : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setSidebarDragOver(true);
            }}
            onDragLeave={() => setSidebarDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSidebarDragOver(false);
              const appId = e.dataTransfer.getData('text/plain');
              if (appId) {
                handlePinApp(appId);
              }
            }}
          >
            {sidebarItems.map(item => (
              <button
                key={item.id}
                className={`${styles.sidebarBtn} ${activeTab === item.id ? styles.sidebarBtnActive : ''} ${reorderDragOverId === item.id ? styles.sidebarBtnDragOver : ''}`}
                onClick={() => selectTab(item.id)}
                title={item.name || item.label}
                draggable={item.id !== 'apps'}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/sidebar-id', item.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (item.id !== 'apps') {
                    setReorderDragOverId(item.id);
                  }
                }}
                onDragLeave={() => setReorderDragOverId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setReorderDragOverId(null);
                  const draggedId = e.dataTransfer.getData('text/sidebar-id');
                  if (draggedId && draggedId !== item.id) {
                    handleReorderPinnedApps(draggedId, item.id);
                  } else if (!draggedId) {
                    const appId = e.dataTransfer.getData('text/plain');
                    handlePinApp(appId, item.id);
                  }
                }}
              >
                <span className={styles.sidebarBtnIcon}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className={styles.sidebarCustomImg} />
                  ) : (
                    renderNavIcon(item.icon || item.id, activeTab === item.id)
                  )}
                </span>
                <span className={styles.sidebarBtnLabel}>{item.name || item.label}</span>
                
                {item.id === 'social' && chatUnreadCount > 0 && (
                  <div className={styles.sidebarBtnBadge}>{chatUnreadCount}</div>
                )}

                {item.id !== 'apps' && (
                  <span 
                    className={styles.sidebarUnpinBtn} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnpinApp(item.id);
                    }}
                    title="Aus Seitenleiste entfernen"
                  >
                    ✕
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Profile button at bottom */}
          <div className={styles.sidebarBottom}>
            <Link href="/" className={styles.sidebarBtn} title="Zurück zur Hauptseite">
              <span className={styles.sidebarBtnIcon}>
                <span className="material-symbols-outlined">home</span>
              </span>
              <span className={styles.sidebarBtnLabel}>Hauptseite</span>
            </Link>
            <button
              className={`${styles.sidebarBtn} ${activeTab === 'profile' ? styles.sidebarBtnActive : ''}`}
              onClick={() => setActiveTab('profile')}
              title="Profil"
            >
              <img
                src={profile?.avatar || AVATAR_PRESETS[0].url}
                alt="Avatar"
                className={styles.sidebarAvatar}
              />
              <span className={styles.sidebarBtnLabel}>Profil</span>
            </button>
          </div>
        </nav>
      )}

      {/* ═══ MAIN DASHBOARD WORKSPACE ═══ */}
      <main 
        className={`${styles.main} ${isLabFullscreen ? styles.mainFullscreen : ''} ${activeTab === 'social' ? styles.mainSocial : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const draggedSidebarId = e.dataTransfer.getData('text/sidebar-id');
          if (draggedSidebarId) {
            handleUnpinApp(draggedSidebarId);
          }
        }}
      >
        {!isLabFullscreen && activeTab === 'dashboard' && (
          /* ─── SYSTEM STATUS BAR ─── */
          <div className={styles.statusBar}>
            <div className={styles.statusBarLeft}>
              <div className={styles.clockDisplay}>
                <span className={styles.clockHH}>{clockHH}</span>
                <span className={styles.clockColon}>:</span>
                <span className={styles.clockMM}>{clockMM}</span>
                <span className={styles.clockSS}>:{clockSS}</span>
              </div>
              <div className={styles.statusBarInfo}>
                <span className={styles.statusGreeting}>{greeting}</span>
                <span className={styles.statusDate}>{todayStr}</span>
              </div>
            </div>
            <div className={styles.statusBarRight}>
              <div className={styles.focusScoreBadge}>
                <span className={styles.focusScoreNum} style={{ color: focusColor }}>{focusScore}</span>
                <span className={styles.focusScoreLabel}>FOCUS</span>
                <span className={styles.focusScoreTag} style={{ color: focusColor, borderColor: focusColor }}>{focusLabel}</span>
              </div>
              <div className={styles.statusActions}>
                <button
                  className={styles.calendarOpenBtn}
                  onClick={() => setShowCalendarModal(true)}
                  title="Kalender öffnen"
                >
                  📅
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB PANEL CONTENT RENDERER ─── */}
        {renderTabContent()}

      </main>

      {/* ═══ HOLOGRAPHIC INVOICE MODAL ═══ */}
      {activeInvoice && (
        <div className={styles.holoModalOverlay} onClick={() => setActiveInvoice(null)}>
          <div className={styles.holoModal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.holoTitle}>✦ Bestellung Ingestion ✦</h3>
            <p className={styles.holoSub}>PRONOIA SECURE NODE BILLING GATEWAY</p>
            <div className={styles.holoInvoice}>
              <div className={styles.holoRow}>
                <span className={styles.holoLabel}>Order-ID:</span>
                <span className={styles.holoValue}>{activeInvoice.orderId}</span>
              </div>
              <div className={styles.holoRow}>
                <span className={styles.holoLabel}>Produkt:</span>
                <span className={styles.holoValue}>{activeInvoice.item}</span>
              </div>
              <div className={styles.holoRow}>
                <span className={styles.holoLabel}>Wert:</span>
                <span className={styles.holoValue}>{activeInvoice.cost} €</span>
              </div>
              <div className={styles.holoRow}>
                <span className={styles.holoLabel}>Datum:</span>
                <span className={styles.holoValue}>{activeInvoice.date}</span>
              </div>
              <div className={styles.holoRow}>
                <span className={styles.holoLabel}>Log-Sync:</span>
                <span className={styles.holoValue} style={{ color: 'var(--green)' }}>ACTIVE // SUCCESS</span>
              </div>
            </div>
            <button className={styles.holoCloseBtn} onClick={() => setActiveInvoice(null)}>System freigeben</button>
          </div>
        </div>
      )}

      {/* ═══ CALENDAR MODAL ═══ */}
      {showCalendarModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCalendarModal(false)}>
          <div className={styles.calModal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowCalendarModal(false)}>✕</button>
            <div className={styles.calHeader}>
              <h2 className={styles.calTitle}>Zirkadianes Protokoll-Archiv</h2>
              <p className={styles.calSub}>Plane bio-kognitive Tage vorausschauend mit AI Sync.</p>
            </div>

            <div className={styles.calLayout}>
              {/* Left Column: Glass Calendar Card */}
              <div className={styles.calMain}>
                <GlassCalendar
                  selectedDate={selectedDate}
                  currentMonth={currentMonth}
                  onDateSelect={selectDate}
                  onPrevMonth={prevMonth}
                  onNextMonth={nextMonth}
                  onNewEvent={handleAddCalendarBlock}
                  onAddNote={handleAddCalendarNote}
                  calendar={calendar}
                />
              </div>

              {/* Right Column: Day Detail Sidebar */}
              <div className={styles.calSidebar}>
                <div className={styles.calSidebarHeader}>
                  <h3>{selectedDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</h3>
                  <div className={styles.calSidebarActions}>
                    <button className={styles.calSidebarBtn} onClick={handleAddCalendarBlock}>+ Block</button>
                    <button className={styles.calSidebarBtn} onClick={generateDayAI}>AI Sync</button>
                    <button className={styles.calSidebarBtnGreen} onClick={() => { syncToActive(); setShowCalendarModal(false); }}>Sync Active</button>
                  </div>
                </div>
                <div className={styles.calBlocks}>
                  {daySchedule.blocks?.map((block, idx) => {
                    const isLiab = block.liability;
                    return (
                      <div 
                        key={idx} 
                        className={styles.calBlock} 
                        style={isLiab ? { 
                          background: 'rgba(255, 255, 255, 0.04)', 
                          border: '1px dashed rgba(255, 255, 255, 0.15)', 
                          borderLeft: '3px solid rgba(255, 255, 255, 0.25)', 
                          cursor: 'pointer' 
                        } : { 
                          borderLeftColor: block.pillar === 'skills' ? 'var(--amber)' : block.pillar === 'recovery' ? 'var(--cobalt-bright)' : 'var(--green)' 
                        }}
                        onClick={isLiab ? () => handleLiabilityClick(block) : undefined}
                      >
                        <div style={{ flex: 1 }}>
                          <div className={styles.calBlockTitle}>{isLiab ? `🔒 ${block.title}` : block.title}</div>
                          <div className={styles.calBlockSub}>{block.rec}</div>
                        </div>
                        <div className={block.startTime ? styles.calBlockTime : ''} style={{ fontSize: '0.75rem', opacity: 0.8 }}>{block.startTime || '--:--'}</div>
                        <div className={styles.calBlockBtns} onClick={e => e.stopPropagation()}>
                          <button className={styles.calIconBtn} onClick={isLiab ? () => handleLiabilityClick(block) : () => handleEditCalendarBlock(idx, block.title, block.startTime)}>✎</button>
                          <button className={styles.calIconBtn} style={{ color: 'var(--red)' }} onClick={isLiab ? () => handleDeleteLiabilityFromBlock(block) : () => deleteCalendarBlock(idx)}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                  {(!daySchedule.blocks || daySchedule.blocks.length === 0) && (
                    <p className={styles.emptyState}>Kein Protokoll für diesen Tag. Nutze AI Sync.</p>
                  )}
                </div>
                <form onSubmit={handleDayChatSubmit} className={styles.calChatForm}>
                  <input type="text" className={styles.calChatInput} placeholder="Tagesplan mit AI anpassen…" value={dayChatInput} onChange={e => setDayChatInput(e.target.value)} disabled={isTyping} />
                  <button type="submit" className={styles.calChatBtn} disabled={isTyping}>Sync</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ GUIDED TOUR OVERLAY ═══ */}
      {tutorialStep > 0 && (
        <div className={styles.tourOverlay}>
          <div className={`${styles.tourCard} ${tutorialStep === 2 ? styles.tourCardBottomLeft : ''}`}>
            <div className={styles.tourTop}>
              <span className={styles.tourStep}>SCHRITT {tutorialStep} / 7</span>
              <button className={styles.tourClose} onClick={() => { saveProfile({ hasCompletedTutorial: true }); setTutorialStep(0); }}>✕</button>
            </div>
            <h3 className={styles.tourTitle}>
              {['', '⏳ Das Dashboard & Queue', '📅 Zirkadianer Kalender', '📊 Biometrie & Bio-Stack', '⏱️ Der Bio-Chronometer', '💬 AI-Chat & Friction', '💊 Bio-Stack Vorrat', '🤖 6 Agenten-Hub'][tutorialStep]}
            </h3>
            <p className={styles.tourText}>
              {['',
                'Klicke auf das ⏳ Dashboard-Icon im linken Sidebar, um deine Ablauf-Queue auf der rechten Seite des Workspace zu öffnen, vordefinierte Zyklen zu laden oder eigene Blöcke zu erstellen.',
                'Klicke oben rechts im Hauptbereich auf das 📅 Kalender-Icon. Hier kannst du Tage vorausschauend planen und per AI Sync synchronisieren.',
                'Das 📊 Biometrie-Icon im linken Sidebar öffnet den Biometrie-Bereich im Hauptworkspace. Hier verwaltest du HRV, Schlafwerte und siehst dein Bio-Stack.',
                'Der Chronometer in der Mitte des Dashboards ist dein bio-kognitiver Taktgeber. Starte oder pausiere hier deinen aktiven Protokollblock.',
                'Unten im Dashboard siehst du deinen AI-Chat zur Steuerung per Text und den Friction Logger zur Protokollierung deines Fokus-Status.',
                'Im 📊 Biometrie-Bereich findest du auch das Bio-Stack Supplement-Inventar, in dem du Vorräte verwaltest.',
                'Das 🤖 Agenten-Icon im Sidebar zeigt dir die Aktivität und den Consensus-Status deiner 6 kognitiven Sub-Agenten im Hintergrund.'
              ][tutorialStep]}
            </p>
            <div className={styles.tourFooter}>
              <button className={styles.tourSkip} onClick={() => { saveProfile({ hasCompletedTutorial: true }); setTutorialStep(0); }}>Überspringen</button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {tutorialStep > 1 && <button className={styles.tourBtn} onClick={() => setTutorialStep(p => p - 1)}>Zurück</button>}
                <button className={`${styles.tourBtn} ${styles.tourBtnPrimary}`} onClick={() => tutorialStep < 7 ? setTutorialStep(p => p + 1) : (saveProfile({ hasCompletedTutorial: true }), setTutorialStep(0))}>
                  {tutorialStep < 7 ? 'Weiter' : 'Abschließen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ONBOARDING WIZARD OVERLAY ═══ */}
      {profile?.hasCompletedOnboarding === false && (
        <OnboardingWizard 
          profile={profile} 
          activateOptimalProtocol={activateOptimalProtocol} 
          setCalendar={setCalendar}
          saveProfile={saveProfile}
          onClose={() => {
            saveProfile({ hasCompletedOnboarding: true });
            setTimeout(syncToActive, 200);
          }}
        />
      )}

      {/* ═══ LIABILITIES EDIT OVERLAY ═══ */}
      {editingLiability && (
        <div className={styles.modalOverlay} onClick={() => setEditingLiability(null)}>
          <div className={styles.calModal} style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setEditingLiability(null)}>✕</button>
            <div className={styles.calHeader}>
              <h2 className={styles.calTitle}>🔒 Sperrzeit anpassen</h2>
              <p className={styles.calSub}>Ändere wöchentliche Liabilities für automatische Anpassungen.</p>
            </div>
            <form onSubmit={handleSaveEditedLiability} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
              <div>
                <label className={styles.formLabel}>Titel</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={editingLiability.title} 
                  onChange={e => setEditingLiability(prev => ({ ...prev, title: e.target.value }))} 
                  required 
                />
              </div>
              <div>
                <label className={styles.formLabel}>Wochentag</label>
                <select 
                  className={styles.formInput} 
                  value={editingLiability.day} 
                  onChange={e => setEditingLiability(prev => ({ ...prev, day: e.target.value }))}
                >
                  {['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className={styles.formLabel}>Startzeit</label>
                  <input 
                    type="time" 
                    className={styles.formInput} 
                    value={editingLiability.startTime} 
                    onChange={e => setEditingLiability(prev => ({ ...prev, startTime: e.target.value }))} 
                    required 
                  />
                </div>
                <div>
                  <label className={styles.formLabel}>Endzeit</label>
                  <input 
                    type="time" 
                    className={styles.formInput} 
                    value={editingLiability.endTime} 
                    onChange={e => setEditingLiability(prev => ({ ...prev, endTime: e.target.value }))} 
                    required 
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className={styles.calSidebarBtn} 
                  style={{ flex: 1, background: 'rgba(255, 77, 77, 0.15)', borderColor: 'var(--red)', color: 'var(--red)' }}
                  onClick={handleDeleteEditedLiability}
                >
                  Löschen
                </button>
                <button 
                  type="submit" 
                  className={styles.calSidebarBtnGreen} 
                  style={{ flex: 2 }}
                >
                  Speichern ✦
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSkillLabOpen && (
        <SkillLabErrorBoundary
          onClose={() => setIsSkillLabOpen(false)}
          onReset={() => {
            // Clear the corrupted Skill Lab state so the modal reopens clean.
            saveProfile({
              skillLabState: {
                phase: 'onboarding', skill: '', intent: '', domain: '', goal: '', hoursPerWeek: 2,
                curriculum: null, currentModuleIndex: 0, currentPhase: 'theory',
                spacedRepetitionQueue: [], completedSteps: {}, watchedVideos: {}, skillNotes: {},
                videoUrl: null, cachedTextbooks: {},
              },
            });
          }}
        >
          <SkillLabModal isOpen={isSkillLabOpen} onClose={() => setIsSkillLabOpen(false)} profile={profile} saveProfile={saveProfile} />
        </SkillLabErrorBoundary>
      )}

      <UpgradePrompt
        gate={upgradeGate}
        onClose={() => setUpgradeGate(null)}
        onUpgrade={() => { setUpgradeGate(null); setActiveTab('store'); }}
      />

      <FloatingChat />
      <SpotifyMiniPlayer profile={profile} saveProfile={saveProfile} />
    </div>
  );
}

export default function LifeOSPage() {
  useForceDarkTheme();
  return (
    <Suspense fallback={
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: '#080a0f',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#6a7890', letterSpacing: '0.15em', gap: '1.5rem'
      }}>
        <div style={{ width: '36px', height: '36px', border: '2px solid rgba(26,106,255,0.15)', borderTopColor: '#1A6AFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        LIFE_OS_INITIALIZING...
      </div>
    }>
      <LifeOSDashboard />
    </Suspense>
  );
}
