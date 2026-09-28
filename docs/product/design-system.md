# Design System Strategy: The Kinetic Court

**Status:** exploratory reference

The interface aims for an editorial, mobile-first handball aesthetic built from
tonal layering rather than a generic grid of boxes.

## Principles

- Use asymmetry and strong display typography for match and player emphasis.
- Prefer blue-tinted surface shifts over borders for sectioning.
- Use tonal layering for depth; reserve tinted shadows for floating elements.
- Use a restrained orange accent for urgent actions, not general decoration.
- Prefer whitespace and surface changes over divider lines.
- Use rounded containers and responsive card layouts.
- Preserve semantic HTML, keyboard access, focus behavior, screen-reader labels,
  and sufficient contrast even when visual rules conflict.

## Typography

- Display and headlines: Plus Jakarta Sans.
- Body and labels: Inter.
- Use weight and hierarchy before adding more color or size.

## Accessibility Boundary

The no-line and tonal-layering concepts are not absolute requirements. Verify
contrast with the existing accessibility checks, and use a visible low-contrast
border fallback when a surface shift is insufficient.

Implementation-specific tokens belong in shared styling configuration or the
relevant component. This document is a design reference, not a product or
engineering contract.
