import type { SeasonPlan } from "./plan-types";

export type ICalEvent = {
  uid?: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
};

function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Escapes characters per RFC 5545 section 3.3.11.
 * Newlines must be encoded as literal \n.
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function generateICS(events: ICalEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gameday Helperplan//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const event of events) {
    const now = formatDateToICS(new Date());
    const start = formatDateToICS(new Date(event.startDate));
    const end = formatDateToICS(new Date(event.endDate));
    const uid = event.uid || `duty-${start}-${Math.random().toString(36).substring(2, 9)}@gameday-helperplan`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeICSText(event.title)}`,
    );

    if (event.location) {
      lines.push(`LOCATION:${escapeICSText(event.location)}`);
    }

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function generateMemberICal(plan: SeasonPlan, memberId: string, shareUrl?: string): string {
  const member = plan.members[memberId];
  if (!member)
    return generateICS([]);

  const events: ICalEvent[] = [];

  // 1. Look through match-specific slots
  for (const match of Object.values(plan.matches)) {
    const assignedSlots = (match.slots || []).filter(s => s.assignedMemberId === memberId);
    if (assignedSlots.length === 0)
      continue;

    const matchTime = new Date(match.time);
    const endTime = new Date(matchTime.getTime() + 90 * 60 * 1000); // 90 min default match duration

    const homeTeam = plan.teams[match.homeTeamId]?.name || match.homeTeamId;
    const matchGameday = Object.values(plan.gamedays).find(gd => gd.matchIds.includes(match.id));
    const location = plan.config.locations.find(loc => loc.id === matchGameday?.locationId);

    for (const slot of assignedSlots) {
      const role = plan.config.roles.find(r => r.id === slot.roleId);
      const roleName = role?.name || slot.roleId;

      events.push({
        uid: `duty-${memberId}-${match.id}-${slot.id}@gameday-helperplan`,
        title: `Duty: ${roleName} (${homeTeam} vs ${match.awayTeamName})`,
        location: location?.name || "Home Turf",
        description: `Helper Duty for ${roleName}\nMatch: ${homeTeam} vs ${match.awayTeamName}${shareUrl ? `\nPlan Link: ${shareUrl}` : ""}`,
        startDate: matchTime,
        endDate: endTime,
      });
    }
  }

  // 2. Look through gameday-level slots (e.g. Hall Opening, Catering)
  for (const gameday of Object.values(plan.gamedays)) {
    if (!gameday.slots)
      continue;
    const assignedSlots = gameday.slots.filter(s => s.assignedMemberId === memberId);
    if (assignedSlots.length === 0)
      continue;

    const location = plan.config.locations.find(loc => loc.id === gameday.locationId);
    const dateStr = gameday.date;
    const openingTime = gameday.openingTime || "09:00";
    const closingTime = gameday.closingTime || "18:00";

    const startTime = new Date(`${dateStr}T${openingTime}:00Z`);
    const endTime = new Date(`${dateStr}T${closingTime}:00Z`);

    for (const slot of assignedSlots) {
      const role = plan.config.roles.find(r => r.id === slot.roleId);
      const roleName = role?.name || slot.roleId;

      events.push({
        uid: `duty-${memberId}-gd-${gameday.id}-${slot.id}@gameday-helperplan`,
        title: `Duty: ${roleName} (Gameday ${dateStr})`,
        location: location?.name || "Home Turf",
        description: `Gameday Duty for ${roleName}\nDate: ${dateStr}${shareUrl ? `\nPlan Link: ${shareUrl}` : ""}`,
        startDate: Number.isNaN(startTime.getTime()) ? new Date() : startTime,
        endDate: Number.isNaN(endTime.getTime()) ? new Date() : endTime,
      });
    }
  }

  return generateICS(events);
}
