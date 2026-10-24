# Location link actions prototype

The isolated route `/plans/:planId/location-link-prototype` compares two ways to expose **Copy link** and **Open link** for configured locations. The live gameday card uses the dialog; its existing location-name link now opens the centered dialog instead of navigating immediately.

| Pattern                   | Benefits                                                                                   | Tradeoffs                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Compact dialog            | Clear choice, ample touch targets, modal focus management reduces background distractions. | Interrupts the schedule context and adds a step before either action.   |
| Non-modal disclosure menu | Keeps the schedule visible and feels lightweight for two straightforward actions.          | Takes inline space while open; less visually prominent than the dialog. |

**Recommendation:** Use the centered dialog for schedule locations. Make **Open link** the primary action with an external-link icon, and **Copy link** secondary with a checkmark/color reaction and visible copied status. This makes the choice clear without changing the familiar location-name link in the card. Keep the non-modal disclosure as the prototype alternative only.

Both variants use the configured URL as-is, announce clipboard success/failure, and open external URLs in a new tab with `noopener noreferrer`. A missing URL renders only the location name.
