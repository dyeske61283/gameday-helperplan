# Design System Strategy: The Kinetic Court

## 1. Overview & Creative North Star

The Creative North Star for this design system is **"The Kinetic Court."**

Handball is a sport of high-velocity precision, physical layering, and constant movement. To move beyond a generic "management tool" look, this system rejects the static, boxed-in nature of traditional SaaS. Instead, we embrace **Tactile Momentum.**

The experience must feel editorial and "pro-league." We achieve this through:

- **Intentional Asymmetry:** Using large `display-lg` typography offset against compact data points.
- **Tonal Depth:** Replacing rigid lines with a hierarchy of blue-tinted surfaces that mimic the layered flooring of a modern handball arena.
- **Fluid Transitions:** A "glass-and-steel" aesthetic that balances the authoritative `primary` blue with the high-energy `secondary` orange.

## 2. Colors & Surface Philosophy

We are moving away from the "grid of boxes" layout. The interface should feel like a single, cohesive environment.

### The "No-Line" Rule

**Borders are prohibited for sectioning.** To separate a sidebar from a main feed, or a header from a content area, use a background shift.

- _Example:_ A side navigation in `surface-container-low` (#eef4ff) sitting against a main dashboard in `surface` (#f8f9ff).

### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers.

1. **Base Layer:** `surface` (#f8f9ff) — The stadium floor.
2. **Zone Layer:** `surface-container` (#e9eef9) — Defining large functional areas.
3. **Object Layer:** `surface-container-lowest` (#ffffff) — Individual cards or interactive elements. This creates a "lift" through contrast rather than shadows.

### The Glass & Gradient Rule

To inject "Soul" into the athletic blue:

- **CTAs:** Use a subtle linear gradient from `primary` (#003d9b) to `primary_container` (#0052cc) at a 135-degree angle.
- **Overlays:** Use `surface_container_lowest` with a 70% opacity and a `20px` backdrop-blur for modals and floating dropdowns to maintain the "Kinetic" feel.

## 3. Typography

We utilize a dual-font system to balance "High-Performance Athletics" with "Operational Clarity."

- **Display & Headlines (Plus Jakarta Sans):** Chosen for its geometric, modern sporting feel. Use `headline-lg` for player names or match scores to create an authoritative, editorial impact.
- **Body & Labels (Inter):** The workhorse. Use `body-md` for all management data. Its high x-height ensures readability during high-stress match-day management.

**The Hierarchy Rule:**

- **Primary Action:** `title-md` (Inter, Bold) in `on_primary_fixed_variant` (#0040a2).
- **Secondary Metadata:** `label-md` (Inter, Medium) in `on_surface_variant` (#434654).

## 4. Elevation & Depth

In this system, depth is earned through **Tonal Layering**, not heavy shadows.

- **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background. The slight delta in hex values creates a sophisticated, "soft-touch" elevation.
- **Ambient Shadows:** For floating elements (like a "New Match" FAB), use a shadow: `0px 12px 32px rgba(0, 61, 155, 0.08)`. Notice the shadow is tinted with the `primary` color, not black.
- **The Ghost Border Fallback:** If a UI element (like an empty state) requires a container, use a `1px` stroke of `outline_variant` (#c3c6d6) at **20% opacity**.

## 5. Components

### Cards & Lists (The Management Core)

- **Rule:** Forbid divider lines. Use `spacing-4` (1rem) of vertical white space or a shift to `surface-container-high` on hover to define list items.
- **Card Radius:** Always use `rounded-lg` (1rem) for containers. This "stadium-turn" radius feels more premium than standard small rounding.

### Buttons (The Kinetic Triggers)

- **Primary:** Gradient (`primary` to `primary_container`), `rounded-full`, `label-md` uppercase.
- **Secondary (Action):** `secondary_container` (#fe6b00) background with `on_secondary_container` text. Use this sparingly for "Urgent" actions like "Penalty Issued" or "Injury Timeout."
- **Tertiary:** No background. Use `primary` text with a `surface-container-highest` background on hover.

### Chips (Player Stats & Status)

- **Status Chips:** Use `secondary_fixed` (#ffdbcc) for alerts.
- **Player Position Chips:** Use `primary_fixed` (#dae2ff) with `on_primary_fixed` (#001848) text.

### Input Fields

- Avoid the "box" look. Use a `surface-container-lowest` fill with a `2px` bottom-bar in `outline_variant`. On focus, the bottom-bar transforms into `primary` blue.

### Custom Handball Components

- **The Scoreboard Tile:** A high-contrast card using `inverse_surface` (#2b3139) with `display-md` typography for the score, creating a focal point in the dashboard.
- **The "Player Card" Stack:** Overlapping avatars using the `spacing-2` negative margin to represent team chemistry.

## 6. Do's and Don'ts

### Do:

- **Do** use `tertiary` (#7b2600) for deep functional alerts (e.g., "Red Card" or "Registration Expired").
- **Do** use the `xl` (1.5rem) roundedness for large hero sections to mimic the curves of a handball.
- **Do** allow typography to "breathe" with `spacing-12` (3rem) margins between major sections.

### Don't:

- **Don't** use 100% black text. Always use `on_surface` (#161c24) to maintain the premium navy-tinted depth.
- **Don't** use standard 1px gray dividers. If you must separate content, use a `2px` height line with a gradient that fades to 0% opacity at both ends.
- **Don't** use the `secondary` orange for everything. It is a "high-energy" alert color; overusing it will exhaust the user's attention.
