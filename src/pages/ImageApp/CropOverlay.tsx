import { useRef, useEffect } from 'react'
import type { RefObject } from 'react'
import styles from './ImageApp.module.css'
import type { CropRegion } from './imageTransforms'

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
type Box = { x: number; y: number; w: number; h: number }
type DragMode =
  | null
  | { kind: 'draw'; startX: number; startY: number }
  | { kind: 'move'; startX: number; startY: number; origBox: Box }
  | { kind: 'resize'; handle: Handle; startX: number; startY: number; origBox: Box }

type Props = {
  imgRef: RefObject<HTMLImageElement | null>
  naturalWidth: number
  naturalHeight: number
  rotation: number
  flipH: boolean
  flipV: boolean
  initialRegion: CropRegion | null
  onCrop: (region: CropRegion) => void
}

// For 90°/270° rotations the canvas is sized to the visual dims (H×W), so the
// "layout" dims used for scaling differ from the canvas dims. Derive them here.
function layoutDims(W: number, H: number, rotation: number): { WL: number; HL: number } {
  return rotation === 90 || rotation === 270
    ? { WL: H, HL: W }
    : { WL: W, HL: H }
}

// Forward: natural image pixel → canvas display position
function naturalToCanvas(
  nx: number, ny: number,
  W: number, H: number,
  natW: number, natH: number,
  rotation: number, flipH: boolean, flipV: boolean,
): { x: number; y: number } {
  const { WL, HL } = layoutDims(W, H, rotation)
  let dx = nx * WL / natW - WL / 2
  let dy = ny * HL / natH - HL / 2
  let rdx: number, rdy: number
  switch (rotation) {
    case 90:  rdx = -dy; rdy =  dx; break
    case 180: rdx = -dx; rdy = -dy; break
    case 270: rdx =  dy; rdy = -dx; break
    default:  rdx =  dx; rdy =  dy
  }
  if (flipH) rdx = -rdx
  if (flipV) rdy = -rdy
  return { x: W / 2 + rdx, y: H / 2 + rdy }
}

// Inverse: canvas display position → natural image pixel
function canvasToNatural(
  cx: number, cy: number,
  W: number, H: number,
  natW: number, natH: number,
  rotation: number, flipH: boolean, flipV: boolean,
): { x: number; y: number } {
  const { WL, HL } = layoutDims(W, H, rotation)
  let dx = cx - W / 2
  let dy = cy - H / 2
  if (flipV) dy = -dy
  if (flipH) dx = -dx
  let ndx: number, ndy: number
  switch (rotation) {
    case 90:  ndx =  dy; ndy = -dx; break
    case 180: ndx = -dx; ndy = -dy; break
    case 270: ndx = -dy; ndy =  dx; break
    default:  ndx =  dx; ndy =  dy
  }
  return { x: (WL / 2 + ndx) * natW / WL, y: (HL / 2 + ndy) * natH / HL }
}

function canvasBoxToNatural(
  box: Box, W: number, H: number, natW: number, natH: number,
  rotation: number, flipH: boolean, flipV: boolean,
): CropRegion {
  const pts = [
    canvasToNatural(box.x,         box.y,         W, H, natW, natH, rotation, flipH, flipV),
    canvasToNatural(box.x + box.w, box.y,         W, H, natW, natH, rotation, flipH, flipV),
    canvasToNatural(box.x,         box.y + box.h, W, H, natW, natH, rotation, flipH, flipV),
    canvasToNatural(box.x + box.w, box.y + box.h, W, H, natW, natH, rotation, flipH, flipV),
  ]
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(Math.max(...xs) - x),
    h: Math.round(Math.max(...ys) - y),
  }
}

function naturalBoxToCanvas(
  region: CropRegion, W: number, H: number, natW: number, natH: number,
  rotation: number, flipH: boolean, flipV: boolean,
): Box {
  const pts = [
    naturalToCanvas(region.x,            region.y,            W, H, natW, natH, rotation, flipH, flipV),
    naturalToCanvas(region.x + region.w, region.y,            W, H, natW, natH, rotation, flipH, flipV),
    naturalToCanvas(region.x,            region.y + region.h, W, H, natW, natH, rotation, flipH, flipV),
    naturalToCanvas(region.x + region.w, region.y + region.h, W, H, natW, natH, rotation, flipH, flipV),
  ]
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

const HANDLE_SIZE = 8
const HALF = HANDLE_SIZE / 2
const MIN_BOX = 10

function clampBox(b: Box, cw: number, ch: number): Box {
  const x = Math.max(0, Math.min(b.x, cw - b.w))
  const y = Math.max(0, Math.min(b.y, ch - b.h))
  const w = Math.min(b.w, cw - x)
  const h = Math.min(b.h, ch - y)
  return { x, y, w, h }
}

function handlePositions(box: Box): Record<Handle, { x: number; y: number }> {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  return {
    nw: { x: box.x,         y: box.y         },
    n:  { x: cx,            y: box.y         },
    ne: { x: box.x + box.w, y: box.y         },
    e:  { x: box.x + box.w, y: cy            },
    se: { x: box.x + box.w, y: box.y + box.h },
    s:  { x: cx,            y: box.y + box.h },
    sw: { x: box.x,         y: box.y + box.h },
    w:  { x: box.x,         y: cy            },
  }
}

function hitHandle(px: number, py: number, box: Box): Handle | null {
  for (const [h, pos] of Object.entries(handlePositions(box)) as [Handle, { x: number; y: number }][]) {
    if (px >= pos.x - HALF && px <= pos.x + HALF && py >= pos.y - HALF && py <= pos.y + HALF) return h
  }
  return null
}

function hitInterior(px: number, py: number, box: Box): boolean {
  return px > box.x + HALF && px < box.x + box.w - HALF &&
         py > box.y + HALF && py < box.y + box.h - HALF
}

const HANDLE_CURSOR: Record<Handle, string> = {
  nw: 'nw-resize', n: 'ns-resize', ne: 'ne-resize',
  e: 'ew-resize',  se: 'se-resize', s: 'ns-resize',
  sw: 'sw-resize', w: 'ew-resize',
}

export default function CropOverlay({ imgRef, naturalWidth, naturalHeight, rotation, flipH, flipV, initialRegion, onCrop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<Box | null>(null)
  const dragRef = useRef<DragMode>(null)
  const canvasSizeRef = useRef({ w: 0, h: 0 })
  const prevRotationRef = useRef(rotation)

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const box = boxRef.current
    if (!box) return

    ctx.fillStyle = 'rgba(0,0,0,0.62)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.clearRect(box.x, box.y, box.w, box.h)
  }

  // Sync canvas size and position to cover the full visual image area.
  // For 90°/270° rotations the visual image is H×W, so we swap dims and offset.
  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    function syncSize() {
      if (!canvasRef.current || !img) return
      const swapped = rotation === 90 || rotation === 270
      const newW = swapped ? img.clientHeight : img.clientWidth
      const newH = swapped ? img.clientWidth : img.clientHeight
      const { w: oldW, h: oldH } = canvasSizeRef.current
      const rotationChanged = prevRotationRef.current !== rotation
      prevRotationRef.current = rotation

      if (!rotationChanged && oldW > 0 && oldH > 0 && boxRef.current) {
        const b = boxRef.current
        boxRef.current = {
          x: b.x * newW / oldW,
          y: b.y * newH / oldH,
          w: b.w * newW / oldW,
          h: b.h * newH / oldH,
        }
      }

      canvasRef.current.width = newW
      canvasRef.current.height = newH
      // Offset canvas so it's centered over the visual image (which may overflow the layout box)
      canvasRef.current.style.left = swapped ? `${(img.clientWidth - img.clientHeight) / 2}px` : '0'
      canvasRef.current.style.top  = swapped ? `${(img.clientHeight - img.clientWidth) / 2}px` : '0'
      canvasSizeRef.current = { w: newW, h: newH }
      draw()
    }

    syncSize()
    const observer = new ResizeObserver(syncSize)
    observer.observe(img)
    return () => observer.disconnect()
  }, [imgRef, rotation])

  // Sync initialRegion prop → boxRef (on mount and when region or transforms change)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!initialRegion) {
      boxRef.current = null
      draw()
      return
    }
    const { width: cw, height: ch } = canvas
    if (cw === 0 || ch === 0 || naturalWidth === 0 || naturalHeight === 0) return
    boxRef.current = naturalBoxToCanvas(initialRegion, cw, ch, naturalWidth, naturalHeight, rotation, flipH, flipV)
    draw()
  }, [initialRegion, naturalWidth, naturalHeight, rotation, flipH, flipV])

  function getPos(e: React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!
    const r = canvas.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(e.clientX - r.left, canvas.width)),
      y: Math.max(0, Math.min(e.clientY - r.top, canvas.height)),
    }
  }

  function updateCursor(px: number, py: number) {
    const canvas = canvasRef.current!
    const box = boxRef.current
    if (!box) { canvas.style.cursor = 'crosshair'; return }
    const h = hitHandle(px, py, box)
    if (h) canvas.style.cursor = HANDLE_CURSOR[h]
    else if (hitInterior(px, py, box)) canvas.style.cursor = 'grab'
    else canvas.style.cursor = 'crosshair'
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = getPos(e)
    const box = boxRef.current

    if (box) {
      const h = hitHandle(x, y, box)
      if (h) { dragRef.current = { kind: 'resize', handle: h, startX: x, startY: y, origBox: { ...box } }; return }
      if (hitInterior(x, y, box)) {
        dragRef.current = { kind: 'move', startX: x, startY: y, origBox: { ...box } }
        ;(e.currentTarget as HTMLCanvasElement).style.cursor = 'grabbing'
        return
      }
    }

    dragRef.current = { kind: 'draw', startX: x, startY: y }
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current
    const { x, y } = getPos(e)

    if (!drag) { updateCursor(x, y); return }

    const canvas = canvasRef.current!
    const cw = canvas.width
    const ch = canvas.height
    const dx = x - drag.startX
    const dy = y - drag.startY

    if (drag.kind === 'draw') {
      boxRef.current = {
        x: Math.min(drag.startX, x),
        y: Math.min(drag.startY, y),
        w: Math.abs(dx),
        h: Math.abs(dy),
      }
    } else if (drag.kind === 'move') {
      boxRef.current = clampBox({ x: drag.origBox.x + dx, y: drag.origBox.y + dy, w: drag.origBox.w, h: drag.origBox.h }, cw, ch)
    } else {
      const ob = drag.origBox
      let { x: nx, y: ny, w: nw, h: nh } = ob

      switch (drag.handle) {
        case 'e':  nw = Math.max(MIN_BOX, ob.w + dx); break
        case 'w':  nw = Math.max(MIN_BOX, ob.w - dx); nx = ob.x + ob.w - nw; break
        case 's':  nh = Math.max(MIN_BOX, ob.h + dy); break
        case 'n':  nh = Math.max(MIN_BOX, ob.h - dy); ny = ob.y + ob.h - nh; break
        case 'se': nw = Math.max(MIN_BOX, ob.w + dx); nh = Math.max(MIN_BOX, ob.h + dy); break
        case 'sw': nw = Math.max(MIN_BOX, ob.w - dx); nx = ob.x + ob.w - nw; nh = Math.max(MIN_BOX, ob.h + dy); break
        case 'ne': nw = Math.max(MIN_BOX, ob.w + dx); nh = Math.max(MIN_BOX, ob.h - dy); ny = ob.y + ob.h - nh; break
        case 'nw': nw = Math.max(MIN_BOX, ob.w - dx); nx = ob.x + ob.w - nw; nh = Math.max(MIN_BOX, ob.h - dy); ny = ob.y + ob.h - nh; break
      }

      boxRef.current = clampBox({ x: nx, y: ny, w: nw, h: nh }, cw, ch)
    }

    draw()
  }

  function onPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current
    dragRef.current = null
    const { x, y } = getPos(e)

    const canvas = canvasRef.current
    const box = boxRef.current

    if (drag?.kind === 'draw' && box && (box.w <= 5 || box.h <= 5)) {
      boxRef.current = null
      draw()
    } else if (box && canvas && box.w > 5 && box.h > 5) {
      draw()
      onCrop(canvasBoxToNatural(box, canvas.width, canvas.height, naturalWidth, naturalHeight, rotation, flipH, flipV))
    }

    updateCursor(x, y)
  }

  return (
    <canvas
      ref={canvasRef}
      className={styles.cropOverlay}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  )
}
