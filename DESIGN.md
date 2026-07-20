# FSM Design System — Premium Stitch Aesthetic

This document defines the visual design system and tokens used for the Field Service Management (FSM) application. It focuses on a premium, high-contrast dark theme with sharp typography, dynamic gradients, glassmorphism, and structured hairline grid details ("stitches").

---

## 🎨 Color Palette

| Category | Token | Hex | Usage |
|---|---|---|---|
| **Backgrounds** | `--bg-deep` | `#050811` | Deep base background |
| | `--bg-panel` | `#0b101f` | Sidebar and panel backgrounds |
| | `--bg-card` | `rgba(13, 20, 38, 0.6)` | Semi-transparent card background |
| **Accents** | `--primary` | `#6366f1` | Main brand Indigo |
| | `--primary-glow` | `rgba(99, 102, 241, 0.15)` | Backlight card glows |
| | `--accent` | `#06b6d4` | Cyan details and focus states |
| **Status** | `--open` | `#f43f5e` | Rose/red for Open issues |
| | `--resolved` | `#10b981` | Emerald green for Resolved visits |
| | `--pending` | `#f59e0b` | Amber/gold for Pending items |
| | `--closed` | `#64748b` | Slate for Closed tickets |
| **Text** | `--text-primary` | `#f8fafc` | Crisp off-white body text |
| | `--text-secondary` | `#94a3b8` | Muted slate secondary text |
| | `--text-muted` | `#475569` | Low-contrast descriptions |

---

## 📐 Grid & "Stitch" Details
The design implements a **structured hairline layout** using precise 1px borders and grid accents:
*   **Hairlines**: Card borders and section dividers use a very thin `1px solid rgba(255, 255, 255, 0.08)`.
*   **Stitched Lines**: Subtle dashed outlines (`border: 1px dashed rgba(99, 102, 241, 0.25)`) highlight specific drop zones, active selections, and header dividers.
*   **Glow Backlights**: Hovering over cards activates a soft radial-gradient glow under the cursor, giving the dashboard an interactive, premium depth.

---

## ✍️ Typography
*   **Font Family**: `Inter`, system-ui, -apple-system, BlinkMacSystemFont, sans-serif.
*   **Font Weights**:
    *   300 (Light) — captions and details
    *   400 (Regular) — body text
    *   500 (Medium) — buttons, navigation links
    *   600 (Semi-Bold) — section headers, card titles
    *   700/800 (Bold/Black) — page titles, KPI values

---

## 🧊 Components Specification

### 1. Sidebar Navigation
*   Dark solid background (`#0b101f`) with a subtle `1px` vertical separator.
*   Hover states: soft dark-blue fill change, slide-in indicator line on the left.
*   Active state: gradient backfill with glowing indigo icon text.

### 2. Glassmorphic Cards
*   Blur filter: `backdrop-filter: blur(16px)`.
*   Soft drop shadows: `box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2)`.
*   Gradient borders to suggest metallic glass edge light.

### 3. Status Pills
*   Compact size, pill shape with 10% opacity color background, 35% opacity colored border, and high-contrast text.
