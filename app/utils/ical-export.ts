import type { SeasonPlan } from "./plan-types";

export type ICalEvent = {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
};

function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
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
    const uid = `duty-${start}-${Math.random().toString(36).substring(2, 9)}@gameday-helperplan`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title.replace(/[,;\\]/g, "\\$&")}`,
    );

    if (event.location) {
      lines.push(`LOCATION:${event.location.replace(/[,;\\]/g, "\\$&")}`);
    }

    if (event.description) {
      lines.push(`DESCRIPTION:${event.description.replace(/\n/g, "\\n").replace(/[,;\\]/g, "\\$&")}`);
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

  // Look through matches
  for (const match of Object.values(plan.matches)) {
    const assignedSlots = match.slots.filter(s => s.assignedMemberId === memberId);
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
        title: `Duty: ${roleName} (${homeTeam} vs ${match.awayTeamName})`,
        location: location?.name || "Home Turf",
        description: `Helper Duty for ${roleName}\\nMatch: ${homeTeam} vs ${match.awayTeamName}${shareUrl ? `\\nPlan Link: ${shareUrl}` : ""}`,
        startDate: matchTime,
        endDate: endTime,
      });
    }
  }

  return generateICS(events);
}
