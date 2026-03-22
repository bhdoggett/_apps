export type CropRegion = { x: number; y: number; w: number; h: number }

export type TransformState = {
  // positional
  flipH: boolean
  flipV: boolean
  rotation: number // 0 | 90 | 180 | 270
  crop: CropRegion | null
  // filter toggles
  greyscale: boolean
  sepia: boolean
  invert: boolean
  // filter adjustments
  brightness: number // -50 to +50
  contrast: number   // -50 to +50
  saturate: number   // -50 to +50
  hueRotate: number  // -180 to 180
  blur: number       // 0 to 20
  // background removal
  removeBg: boolean
  bgTolerance: number // 0–100
}

export const defaultTransforms: TransformState = {
  flipH: false,
  flipV: false,
  rotation: 0,
  crop: null,
  greyscale: false,
  sepia: false,
  invert: false,
  brightness: 0,
  contrast: 0,
  saturate: 0,
  hueRotate: 0,
  blur: 0,
  removeBg: false,
  bgTolerance: 30,
}

function detectBackgroundColor(data: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  const samples: [number, number, number][] = []
  const size = 10
  for (let cy = 0; cy < size; cy++) {
    for (let cx = 0; cx < size; cx++) {
      const corners = [
        [cx, cy],
        [width - 1 - cx, cy],
        [cx, height - 1 - cy],
        [width - 1 - cx, height - 1 - cy],
      ]
      for (const [x, y] of corners) {
        const i = (y * width + x) * 4
        if (data[i + 3] > 128) {
          samples.push([data[i], data[i + 1], data[i + 2]])
        }
      }
    }
  }
  if (samples.length === 0) return [255, 255, 255]
  samples.sort((a, b) => a[0] - b[0])
  const mid = Math.floor(samples.length / 2)
  const rSorted = [...samples].sort((a, b) => a[0] - b[0])
  const gSorted = [...samples].sort((a, b) => a[1] - b[1])
  const bSorted = [...samples].sort((a, b) => a[2] - b[2])
  return [rSorted[mid][0], gSorted[mid][1], bSorted[mid][2]]
}

function removeBgFromImageData(imageData: ImageData, bgColor: [number, number, number], tolerance: number): void {
  const { data, width, height } = imageData
  const maxDist = 441 // sqrt(3 * 255^2)
  const threshold = (tolerance / 100) * (maxDist / 2)
  const fadeZone = threshold * 0.2
  const [br, bg, bb] = bgColor
  for (let i = 0; i < width * height * 4; i += 4) {
    const dr = data[i] - br
    const dg = data[i + 1] - bg
    const db = data[i + 2] - bb
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)
    if (dist < threshold - fadeZone) {
      data[i + 3] = 0
    } else if (dist < threshold) {
      const t = (dist - (threshold - fadeZone)) / fadeZone
      data[i + 3] = Math.round(t * data[i + 3])
    }
  }
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255, gf = g / 255, bf = b / 255
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rf) h = ((gf - bf) / d + (gf < bf ? 6 : 0)) / 6
  else if (max === gf) h = ((bf - rf) / d + 2) / 6
  else h = ((rf - gf) / d + 4) / 6
  return [h, s, l]
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 0.5) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v] }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ]
}

// O(n) separable box blur using a sliding window.
function boxBlur(imageData: ImageData, r: number): ImageData {
  const { width: w, height: h } = imageData
  const src = imageData.data
  const tmp = new Uint8ClampedArray(src.length)
  const out = new Uint8ClampedArray(src.length)

  // Horizontal pass: src → tmp
  for (let y = 0; y < h; y++) {
    const rowOff = y * w * 4
    let rs = 0, gs = 0, bs = 0, as = 0, cnt = 0
    for (let x = 0; x <= r && x < w; x++) {
      const pi = rowOff + x * 4
      rs += src[pi]; gs += src[pi + 1]; bs += src[pi + 2]; as += src[pi + 3]; cnt++
    }
    for (let x = 0; x < w; x++) {
      const pi = rowOff + x * 4
      tmp[pi] = rs / cnt | 0; tmp[pi + 1] = gs / cnt | 0; tmp[pi + 2] = bs / cnt | 0; tmp[pi + 3] = as / cnt | 0
      if (x + r + 1 < w) { const ai = rowOff + (x + r + 1) * 4; rs += src[ai]; gs += src[ai + 1]; bs += src[ai + 2]; as += src[ai + 3]; cnt++ }
      if (x - r >= 0) { const ri = rowOff + (x - r) * 4; rs -= src[ri]; gs -= src[ri + 1]; bs -= src[ri + 2]; as -= src[ri + 3]; cnt-- }
    }
  }

  // Vertical pass: tmp → out
  for (let x = 0; x < w; x++) {
    let rs = 0, gs = 0, bs = 0, as = 0, cnt = 0
    for (let y = 0; y <= r && y < h; y++) {
      const pi = (y * w + x) * 4
      rs += tmp[pi]; gs += tmp[pi + 1]; bs += tmp[pi + 2]; as += tmp[pi + 3]; cnt++
    }
    for (let y = 0; y < h; y++) {
      const pi = (y * w + x) * 4
      out[pi] = rs / cnt | 0; out[pi + 1] = gs / cnt | 0; out[pi + 2] = bs / cnt | 0; out[pi + 3] = as / cnt | 0
      if (y + r + 1 < h) { const ai = ((y + r + 1) * w + x) * 4; rs += tmp[ai]; gs += tmp[ai + 1]; bs += tmp[ai + 2]; as += tmp[ai + 3]; cnt++ }
      if (y - r >= 0) { const ri = ((y - r) * w + x) * 4; rs -= tmp[ri]; gs -= tmp[ri + 1]; bs -= tmp[ri + 2]; as -= tmp[ri + 3]; cnt-- }
    }
  }

  return new ImageData(out, w, h)
}

// Apply color filters and blur to ImageData pixels directly — avoids ctx.filter
// which isn't supported in Safari < 18.
function applyFiltersToImageData(imageData: ImageData, t: TransformState): ImageData {
  const data = imageData.data
  const brightnessF = 1 + t.brightness / 100
  const contrastF = 1 + t.contrast / 100
  const saturateF = 1 + t.saturate / 100
  const hasColorFilters = t.greyscale || t.sepia || t.invert ||
    t.brightness !== 0 || t.contrast !== 0 || t.saturate !== 0 || t.hueRotate !== 0

  if (hasColorFilters) {
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2]

      if (t.greyscale) {
        const L = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)
        r = g = b = L
      }
      if (t.sepia) {
        const nr = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
        const ng = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
        const nb = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
        r = nr; g = ng; b = nb
      }
      if (t.invert) { r = 255 - r; g = 255 - g; b = 255 - b }
      if (t.brightness !== 0) { r = clamp(r * brightnessF); g = clamp(g * brightnessF); b = clamp(b * brightnessF) }
      if (t.contrast !== 0) {
        r = clamp((r - 128) * contrastF + 128)
        g = clamp((g - 128) * contrastF + 128)
        b = clamp((b - 128) * contrastF + 128)
      }
      if (t.saturate !== 0) {
        const f = saturateF
        const nr = clamp(r * (0.2126 + 0.7874 * f) + g * (0.7152 - 0.7152 * f) + b * (0.0722 - 0.0722 * f))
        const ng = clamp(r * (0.2126 - 0.2126 * f) + g * (0.7152 + 0.2848 * f) + b * (0.0722 - 0.0722 * f))
        const nb = clamp(r * (0.2126 - 0.2126 * f) + g * (0.7152 - 0.7152 * f) + b * (0.0722 + 0.9278 * f))
        r = nr; g = ng; b = nb
      }
      if (t.hueRotate !== 0) {
        const [h, s, l] = rgbToHsl(r, g, b)
        const newH = ((h + t.hueRotate / 360) % 1 + 1) % 1
        ;[r, g, b] = hslToRgb(newH, s, l)
      }

      data[i] = r; data[i + 1] = g; data[i + 2] = b
    }
  }

  return t.blur > 0 ? boxBlur(imageData, Math.round(t.blur)) : imageData
}

export function renderRemovedBg(img: HTMLImageElement, t: TransformState): ImageData {
  const srcX = t.crop ? t.crop.x : 0
  const srcY = t.crop ? t.crop.y : 0
  const srcW = t.crop ? t.crop.w : img.naturalWidth
  const srcH = t.crop ? t.crop.h : img.naturalHeight

  const rotated = t.rotation === 90 || t.rotation === 270
  const outW = rotated ? srcH : srcW
  const outH = rotated ? srcW : srcH

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!

  // No ctx.filter here — CSS filters are unreliable for getImageData across browsers.
  // Filters are applied via CSS style on the preview canvas element instead.
  const halfW = Math.round(outW / 2)
  const halfH = Math.round(outH / 2)
  ctx.save()
  ctx.translate(halfW, halfH)
  ctx.rotate((t.rotation * Math.PI) / 180)
  if (t.flipH) ctx.scale(-1, 1)
  if (t.flipV) ctx.scale(1, -1)
  ctx.drawImage(img, srcX, srcY, srcW, srcH, -Math.round(srcW / 2), -Math.round(srcH / 2), srcW, srcH)
  ctx.restore()

  const imageData = ctx.getImageData(0, 0, outW, outH)
  const bgColor = detectBackgroundColor(imageData.data, outW, outH)
  removeBgFromImageData(imageData, bgColor, t.bgTolerance)
  return imageData
}

export function applyTransforms(
  img: HTMLImageElement,
  t: TransformState,
  format: string,
  onBlob: (blob: Blob) => void,
) {
  const srcX = t.crop ? t.crop.x : 0
  const srcY = t.crop ? t.crop.y : 0
  const srcW = t.crop ? t.crop.w : img.naturalWidth
  const srcH = t.crop ? t.crop.h : img.naturalHeight

  const rotated = t.rotation === 90 || t.rotation === 270
  const outW = rotated ? srcH : srcW
  const outH = rotated ? srcW : srcH

  // Pass 1: apply spatial transforms (crop, rotation, flip) with no CSS filter.
  // ctx.filter combined with rotate/scale has cross-browser reliability issues,
  // so we separate the two concerns into two draw passes.
  const spatialCanvas = document.createElement('canvas')
  spatialCanvas.width = outW
  spatialCanvas.height = outH
  const spatialCtx = spatialCanvas.getContext('2d')!
  spatialCtx.save()
  spatialCtx.translate(outW / 2, outH / 2)
  spatialCtx.rotate((t.rotation * Math.PI) / 180)
  if (t.flipH) spatialCtx.scale(-1, 1)
  if (t.flipV) spatialCtx.scale(1, -1)
  spatialCtx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH)
  spatialCtx.restore()

  // Pass 2: get pixels, apply bg removal and filters via pixel manipulation.
  // (ctx.filter is not supported in Safari < 18, so we do it in JS instead.)
  let imageData = spatialCtx.getImageData(0, 0, outW, outH)

  if (t.removeBg && format !== 'jpeg') {
    const bgColor = detectBackgroundColor(imageData.data, outW, outH)
    removeBgFromImageData(imageData, bgColor, t.bgTolerance)
  }

  imageData = applyFiltersToImageData(imageData, t)

  // For JPEG: composite filtered pixels over white (handles transparent PNG sources).
  if (format === 'jpeg') {
    const { data } = imageData
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255
      data[i]     = Math.round(data[i]     * a + 255 * (1 - a))
      data[i + 1] = Math.round(data[i + 1] * a + 255 * (1 - a))
      data[i + 2] = Math.round(data[i + 2] * a + 255 * (1 - a))
      data[i + 3] = 255
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  canvas.getContext('2d')!.putImageData(imageData, 0, 0)

  canvas.toBlob((blob) => {
    if (blob) onBlob(blob)
  }, `image/${format}`)
}

export function exportAsPdf(img: HTMLImageElement, t: TransformState, filename: string) {
  applyTransforms(img, t, 'jpeg', (blob) => {
    void blob.arrayBuffer().then((buffer) => {
      const jpegBytes = new Uint8Array(buffer)
      const srcW = t.crop ? t.crop.w : img.naturalWidth
      const srcH = t.crop ? t.crop.h : img.naturalHeight
      const rotated = t.rotation === 90 || t.rotation === 270
      const w = rotated ? srcH : srcW
      const h = rotated ? srcW : srcH
      downloadPdf(w, h, jpegBytes, filename)
    })
  })
}

function downloadPdf(w: number, h: number, jpegBytes: Uint8Array, filename: string) {
  const enc = new TextEncoder()

  const csBytes = enc.encode(`q ${w} 0 0 ${h} 0 0 cm /Im Do Q`)
  const o1 = enc.encode(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`)
  const o2 = enc.encode(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`)
  const o3 = enc.encode(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents 4 0 R /Resources << /XObject << /Im 5 0 R >> >> >>\nendobj\n`)
  const o4h = enc.encode(`4 0 obj\n<< /Length ${csBytes.length} >>\nstream\n`)
  const o4f = enc.encode(`\nendstream\nendobj\n`)
  const o5h = enc.encode(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`)
  const o5f = enc.encode(`\nendstream\nendobj\n`)
  const hdr = enc.encode(`%PDF-1.4\n`)

  let off = hdr.length
  const offs: number[] = []
  offs.push(off); off += o1.length
  offs.push(off); off += o2.length
  offs.push(off); off += o3.length
  offs.push(off); off += o4h.length + csBytes.length + o4f.length
  offs.push(off); off += o5h.length + jpegBytes.length + o5f.length

  const xrefOff = off
  const xref = enc.encode(
    `xref\n0 6\n0000000000 65535 f \n` +
    offs.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  )
  const trailer = enc.encode(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF`)

  const parts = [hdr, o1, o2, o3, o4h, csBytes, o4f, o5h, jpegBytes, o5f, xref, trailer]
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  let pos = 0
  for (const p of parts) { out.set(p, pos); pos += p.length }

  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
