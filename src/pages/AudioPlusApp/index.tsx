import { useReducer, useRef, useEffect } from 'react'
import AppHeader from '../../components/AppHeader'
import { useIsLandscapeMobile } from '../../hooks/useIsLandscapeMobile'
import { AudioPlusEngine } from './engine'
import type { EngineTrack } from './engine'
import { mixDown } from './mixDown'
import { saveProject, loadProject } from './serialize'
import { useWaveform } from './useWaveform'
import { encodeWAV } from '../../utils/audio/wavEncoder'
import { encodeMP3 } from '../../utils/audio/mp3Encoder'
import styles from './AudioPlusApp.module.css'

const SIDEBAR_WIDTH = 180
const TRACK_ROW_HEIGHT = 72

// ── Types ────────────────────────────────────────────────────────────────────

type Track = {
  id: string
  name: string
  audioData: ArrayBuffer
  startOffset: number   // seconds from timeline start; negative allowed
  trimStart: number     // seconds to skip at buffer start
  trimEnd: number       // seconds to skip at buffer end
  volume: number        // 0–1
  pan: number           // -1 to +1
  muted: boolean
}

type State = {
  phase: 'idle' | 'recording'
  projectName: string
  bpm: number
  metronomeOn: boolean
  isPlaying: boolean
  playheadTime: number
  tracks: Track[]
  latencyOffsetMs: number
  pxPerSec: number
}

type Action =
  | { type: 'ADD_TRACK'; track: Track }
  | { type: 'REMOVE_TRACK'; id: string }
  | { type: 'RENAME_TRACK'; id: string; name: string }
  | { type: 'SET_VOLUME'; id: string; volume: number }
  | { type: 'SET_PAN'; id: string; pan: number }
  | { type: 'TOGGLE_MUTE'; id: string }
  | { type: 'SET_OFFSET'; id: string; startOffset: number }
  | { type: 'SET_TRIM'; id: string; trimStart: number; trimEnd: number }
  | { type: 'SET_BPM'; bpm: number }
  | { type: 'TOGGLE_METRONOME' }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_PLAYHEAD'; time: number }
  | { type: 'SET_PHASE'; phase: State['phase'] }
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'SET_LATENCY'; ms: number }
  | { type: 'SET_PX_PER_SEC'; pxPerSec: number }
  | { type: 'LOAD_PROJECT'; projectName: string; bpm: number; latencyOffsetMs: number; tracks: Track[] }

const initial: State = {
  phase: 'idle',
  projectName: 'untitled',
  bpm: 120,
  metronomeOn: false,
  isPlaying: false,
  playheadTime: 0,
  tracks: [],
  latencyOffsetMs: 0,
  pxPerSec: 100,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TRACK':
      return { ...state, tracks: [...state.tracks, action.track] }
    case 'REMOVE_TRACK':
      return { ...state, tracks: state.tracks.filter(t => t.id !== action.id) }
    case 'RENAME_TRACK':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, name: action.name } : t) }
    case 'SET_VOLUME':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, volume: action.volume } : t) }
    case 'SET_PAN':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, pan: action.pan } : t) }
    case 'TOGGLE_MUTE':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, muted: !t.muted } : t) }
    case 'SET_OFFSET':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, startOffset: action.startOffset } : t) }
    case 'SET_TRIM':
      return { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, trimStart: action.trimStart, trimEnd: action.trimEnd } : t) }
    case 'SET_BPM':
      return { ...state, bpm: Math.max(20, Math.min(300, action.bpm)) }
    case 'TOGGLE_METRONOME':
      return { ...state, metronomeOn: !state.metronomeOn }
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.isPlaying }
    case 'SET_PLAYHEAD':
      return { ...state, playheadTime: action.time }
    case 'SET_PHASE':
      return { ...state, phase: action.phase }
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.name }
    case 'SET_LATENCY':
      return { ...state, latencyOffsetMs: action.ms }
    case 'SET_PX_PER_SEC':
      return { ...state, pxPerSec: action.pxPerSec }
    case 'LOAD_PROJECT':
      return {
        ...state,
        phase: 'idle',
        isPlaying: false,
        playheadTime: 0,
        projectName: action.projectName,
        bpm: action.bpm,
        latencyOffsetMs: action.latencyOffsetMs,
        tracks: action.tracks,
      }
    default:
      return state
  }
}

// Placeholder — full component added in Tasks 8–9
export default function AudioPlusApp() {
  const [state, dispatch] = useReducer(reducer, initial)
  const isLandscapeMobile = useIsLandscapeMobile()
  void state; void dispatch; void isLandscapeMobile
  return <div>state model ready</div>
}
