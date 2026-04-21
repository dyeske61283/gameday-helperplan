/**
 * NuLiga API Client
 *
 * This client provides access to the NuLiga API for fetching club, roster, and match data.
 * Base implementation follows the routes provided in the API documentation.
 */

const NULIGA_BASE_URL = "https://hbde-app.liga.nu/rs/federation";
const DEFAULT_FEDERATION = "BHV";

export const nuligaApi = {
  /**
   * Get current season information.
   * (German: Info welche season)
   * @param federation The federation ID (default: BHV)
   */
  async getSeasonInfo(federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}/season`, {
      query: {
        currentSeason: true,
        includeTopRegions: true,
      },
    });
  },

  /**
   * Get general federation information.
   * (German: Verbandsinfo)
   * @param federation The federation ID (default: BHV)
   */
  async getFederationInfo(federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}`);
  },

  /**
   * Get championships for a specific season.
   * (German: Regionsinfos)
   * @param season The season string (e.g. "25/26")
   * @param federation The federation ID (default: BHV)
   */
  async getChampionships(season: string, federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}/season/${encodeURIComponent(season)}/championship`, {
      query: {
        includeTopRegions: true,
      },
    });
  },

  /**
   * Get information for a specific championship.
   * (German: Regionsinfo 1 Region)
   * @param season The season string
   * @param championship The championship ID
   * @param federation The federation ID (default: BHV)
   */
  async getChampionship(season: string, championship: string, federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}/season/${encodeURIComponent(season)}/championship/${encodeURIComponent(championship)}`);
  },

  /**
   * Get all groups (leagues) for a championship.
   * (German: Spielklassen)
   * @param season The season string
   * @param championship The championship ID
   * @param federation The federation ID (default: BHV)
   */
  async getAllGroups(season: string, championship: string, federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}/season/${encodeURIComponent(season)}/championship/${encodeURIComponent(championship)}/allGroups`);
  },

  /**
   * Get a specific league group details.
   * (German: Spielklasse)
   * @param season The season string
   * @param championship The championship ID
   * @param league The league ID
   * @param group The group name
   * @param federation The federation ID (default: BHV)
   */
  async getGroupDetails(season: string, championship: string, league: string, group: string, federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}/season/${encodeURIComponent(season)}/championship/${encodeURIComponent(championship)}/league/${encodeURIComponent(league)}/group/${encodeURIComponent(group)}`);
  },

  /**
   * Get current meetings for a specific group.
   * (German: Aktuelle Begegnungen)
   * @param season The season string
   * @param championship The championship ID
   * @param league The league ID
   * @param group The group name
   * @param federation The federation ID (default: BHV)
   */
  async getCurrentMeetings(season: string, championship: string, league: string, group: string, federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}/season/${encodeURIComponent(season)}/championship/${encodeURIComponent(championship)}/league/${encodeURIComponent(league)}/group/${encodeURIComponent(group)}/meetings`, {
      query: {
        currentMeetings: true,
      },
    });
  },

  /**
   * Get tables for a specific group.
   * (German: Tabelle(n))
   * @param season The season string
   * @param championship The championship ID
   * @param league The league ID
   * @param group The group name
   * @param federation The federation ID (default: BHV)
   */
  async getTables(season: string, championship: string, league: string, group: string, federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}/season/${encodeURIComponent(season)}/championship/${encodeURIComponent(championship)}/league/${encodeURIComponent(league)}/group/${encodeURIComponent(group)}/tables`);
  },

  /**
   * Get all meetings for a specific group.
   * (German: Alle Begegnungen)
   * @param season The season string
   * @param championship The championship ID
   * @param league The league ID
   * @param group The group name
   * @param federation The federation ID (default: BHV)
   */
  async getAllMeetings(season: string, championship: string, league: string, group: string, federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}/season/${encodeURIComponent(season)}/championship/${encodeURIComponent(championship)}/league/${encodeURIComponent(league)}/group/${encodeURIComponent(group)}/meetings`);
  },

  /**
   * Search for clubs in the NuLiga system.
   * (German: Club Suche)
   * @param query The search string (e.g. club name or zip code)
   * @param federation The federation ID (default: BHV)
   */
  async searchClubs(query: string, federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}/clubs`, {
      query: {
        searchString: query,
        firstResult: 0,
        maxResults: 50,
      },
    });
  },

  /**
   * Get general information about a specific club.
   * (German: Club Infos)
   * @param clubId The unique identifier of the club
   * @param federation The federation ID (default: BHV)
   */
  async getClubData(clubId: string, federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}/clubs/${clubId}`);
  },

  /**
   * Retrieve all meetings for a specific club.
   * (German: Alle Club Begegnungen)
   * @param clubId The unique identifier of the club
   * @param currentMeetings Whether to filter for current meetings only
   * @param federation The federation ID (default: BHV)
   */
  async getMatchDays(clubId: string, currentMeetings = false, federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}/clubs/${clubId}/meetings`, {
      query: {
        currentMeetings,
      },
    });
  },

  /**
   * Retrieve all rosters/teams registered for a club.
   * (German: Teams eines Clubs)
   * @param clubId The unique identifier of the club
   * @param currentSeason Whether to filter for the current season only
   * @param federation The federation ID (default: BHV)
   */
  async getRosters(clubId: string, currentSeason = true, federation = DEFAULT_FEDERATION) {
    return $fetch(`${NULIGA_BASE_URL}/${federation}/clubs/${clubId}/teams`, {
      query: {
        currentSeason,
      },
    });
  },
};
