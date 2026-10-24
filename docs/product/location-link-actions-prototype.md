# Location link actions prototype

The isolated route `/plans/:planId/location-link-prototype` compares two ways to expose **Copy link** and **Open link** for configured locations. It does not replace the live schedule link.

| Pattern                   | Benefits                                                                                   | Tradeoffs                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Compact dialog            | Clear choice, ample touch targets, modal focus management reduces background distractions. | Interrupts the schedule context and adds a step before either action.   |
| Non-modal disclosure menu | Keeps the schedule visible and feels lightweight for two straightforward actions.          | Takes inline space while open; less visually prominent than the dialog. |

**Recommendation:** Prefer the non-modal disclosure for the production schedule. The two actions are simple and keeping context is more valuable than a modal interruption. Keep the dialog as an alternative if usability testing shows people overlook the disclosure or need larger touch targets.

Both variants use the configured URL as-is, announce clipboard success/failure, and open external URLs in a new tab with `noopener noreferrer`. A missing URL renders only the location name.
