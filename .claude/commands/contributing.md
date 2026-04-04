# _apps contributing rules

## Non-negotiables
- **Never hardcode colors.** Always use CSS variables.
- **CSS Modules only.** camelCase class names. No shared styles between pages.
- **No barrel index files.** Import by path: `import Foo from './components/Foo'`
- **Every app gets `<AppHeader title="appname" />`** — lowercase, matches landing name.
- **Transitions are always `0.15s`** — color, border, opacity only. Never layout or size.

---

## CSS variables
```
--bg        background
--fg        foreground / primary text
--muted     secondary text, idle button text
--dim       tertiary text, disabled borders
--rule      dividers
--font-display   Playfair Display 900
--font-mono      Courier Prime (body default)
```

---

## Typography
| Use | Rule |
|-----|------|
| Big numbers, headings | `font-family: var(--font-display); font-weight: 900` |
| Labels | `font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted)` |
| Quieter labels | Same but `color: var(--dim)` |

---

## Buttons — two tiers only

**`ActionButton` component** — primary action. Fills on hover.
```css
background: none; border: 1px solid var(--fg); color: var(--fg);
/* hover */ background: var(--fg); color: var(--bg);
transition: background 0.15s, border-color 0.15s, color 0.15s;
```

**Inline app buttons** — controls, presets, toggles. Color-only hover.
```css
background: none; border: 1px solid var(--dim); color: var(--muted);
/* hover */ border-color: var(--muted); color: var(--fg);
/* active/selected */ border-color: var(--fg); color: var(--fg);
transition: border-color 0.15s, color 0.15s;
```

---

## Layout
```css
.app {
  max-width: 620px;
  margin: 0 auto;
  padding: 1.5rem 2rem 4rem;
  min-height: 100vh;
}
```

---

## File structure
```
src/pages/MyApp/
  index.tsx          # all state/logic here
  MyApp.module.css

src/components/MyComponent/
  index.tsx          # typed Props interface, default export
  MyComponent.module.css
```

---

## State management
| Situation | Use |
|-----------|-----|
| 1–3 independent values | `useState` |
| 4+ related values or 4+ action types | `useReducer` |
| Changes during events, must not re-render | `useRef` |

`useReducer` pattern — define above component in this order:
```ts
type State = { ... }
type Action = { type: 'FOO' } | { type: 'BAR'; payload: number }
const initial: State = { ... }
function reducer(state: State, action: Action): State { ... }
```

---

## Shared components
| Component | Use for |
|-----------|---------|
| `AppHeader` | Every app: `<AppHeader title="appname" />` |
| `ActionButton` | Primary action with fill-on-hover |
| `DragNumber` | Draggable number input (`value`, `min`, `max`, `onChange`, optional `pixelsPerUnit`) |
| `RangeSlider` | Styled range input with touch support |
| `BackLink` | Back navigation (rendered in Layout) |
| `DropZone` | File drag-and-drop |
| `StatusMessage` | Transient feedback |

---

## Shared utilities
| Utility | Path | Use for |
|---------|------|---------|
| `downloadCanvas` | `src/utils/downloadCanvas.ts` | Canvas → png/jpg/webp file download. Always use this — never inline. |

---

## UX patterns

**Copy-on-click:** click value → copy → show "copied" for 1.2s via `setTimeout`.

**Touch:** `touch-action: none` on draggable elements. Always use pointer events, not mouse/touch separately.

**No number spinners:**
```css
input[type="number"] { -moz-appearance: textfield; }
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }
```

**Vertical sliders:** `writing-mode: vertical-lr; direction: rtl` → bottom=min, top=max.

---

## Landscape / focus mode

`AppHeader` and layout top bar hide automatically in landscape. Apps handle their own content only.

Use `@media (orientation: landscape) and (pointer: coarse)` — targets touch devices, not desktop narrow windows.

**Full-screen overlay pattern** (preferred for interactive apps):

Use the shared hook and render a `focusOverlay` in place of the normal `.app` container:

```ts
import { useIsLandscapeMobile } from '../../hooks/useIsLandscapeMobile'

const isLandscapeMobile = useIsLandscapeMobile()

const inner = <div className={styles.content}>...</div>

if (isLandscapeMobile) {
  return <div className={styles.focusOverlay}>{inner}</div>
}

return (
  <div className={styles.app}>
    <AppHeader title="appname" />
    {inner}
  </div>
)
```

```css
.focusOverlay {
  position: fixed;
  inset: 0;
  background: var(--bg);
  z-index: 120;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
```

**Scale primary content:**
```css
.display {
  font-size: clamp(5rem, 22vw, 14rem); /* always use clamp() */
}
```

**Hide secondary UI:**
```css
@media (orientation: landscape) and (pointer: coarse) {
  .app { max-width: 100%; padding: 0.5rem 1.5rem 1rem; }
  .inputForm { display: none; }
}
```

Only add landscape mode where it genuinely improves the experience.

---

## Adding a new app — checklist
1. Create `src/pages/NewApp/index.tsx` + `NewApp.module.css`
2. Add route in `src/App.tsx` inside the Layout `children` array:
   ```tsx
   { path: '/newapp', element: <NewApp /> }
   ```
3. Add to `apps` array in `src/pages/Landing/index.tsx`:
   ```ts
   { path: '/newapp', name: 'newapp' }
   ```
4. Use `<AppHeader title="newapp" />` — lowercase, matches landing name
5. Follow `.app` container pattern in CSS
6. Verify dark and light mode
