/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
// @ts-check
/**
 * This script identifies the Deno Deploy deployment URL for a specific branch using V2 API.
 * Strategies:
 * 1. Deno Deploy V2 API (primary)
 */

/** @typedef {{ slug: 'git-branch' | 'preview', partition: { "git.branch_sanitized"?: string, "deno.revision.id"?: string }, "domains": { "domain": string}[] }} Timeline */
/** @typedef {{ id: string, status: 'succeeded' | 'queued' | 'failed' | 'building' | 'skipped', failure_reason?: string }} Revision */

const APP_ID = process.env.DENO_PROJECT_ID;
const DEPLOY_TOKEN = process.env.DENO_DEPLOY_TOKEN;
const BRANCH_NAME = process.env.BRANCH_NAME;

const API_BASE = "https://api.deno.com";

const trimEndRegEx = /-+$/;
const trimFrontRegEx = /^-+/;

/**
 * Strategy 1: Deno Deploy V2 API
 */
async function getUrlFromDenoV2() {
  if (!DEPLOY_TOKEN || !APP_ID) {
    console.error("Deploy Token or APP_ID not set");
    return null;
  }

  if (!BRANCH_NAME) {
    console.error("Branch name undefined cannot determine correct deployment to test against");
    return null;
  }

  const slugifiedBranchName = BRANCH_NAME.toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/-{2,}/g, "-") // Replace multiple - with single -
    .replace(trimFrontRegEx, "") // Trim - from start
    .replace(trimEndRegEx, ""); // Trim - from end

  const headers = {
    Authorization: DEPLOY_TOKEN.startsWith("Bearer ") ? DEPLOY_TOKEN : `Bearer ${DEPLOY_TOKEN}`,
    Accept: "application/json",
  };

  const limit = 10;

  try {
    // 1. Get recent revisions for the app
    // {{baseUrl}}/v2/apps/:app/revisions?limit=5
    const revisionsUrl = `${API_BASE}/v2/apps/${APP_ID}/revisions?limit=${limit}`;
    const revRes = await fetch(revisionsUrl, { headers });
    if (!revRes.ok) {
      console.error(`Deno API revisions fetch failed: ${revRes.status}`);
      return null;
    }

    /** @type {Array.<Revision>} */
    const revisions = await revRes.json();
    if (!revisions.length) {
      console.error(`Something is off with the revisions reponse: ${revisions}`);
      return null;
    }
    // 2. Find timeline that matches our branch for a single revision
    for (const revision of revisions) {
      // {{baseUrl}}/v2/revisions/:revision/timelines
      const timelinesResponse = await fetch(`${API_BASE}/v2/revisions/${revision.id}/timelines`, { headers });

      /** @type {Array.<Timeline>} */
      const timelinesForRevision = await timelinesResponse.json();

      const timelineOfBranch = timelinesForRevision.find(v => v.slug === "git-branch" && v.partition["git.branch_sanitized"]);

      const denosBranchStringLength = timelineOfBranch?.partition["git.branch_sanitized"]?.length;
      const cutBranchname = slugifiedBranchName.slice(0, denosBranchStringLength);

      if (cutBranchname === timelineOfBranch?.partition["git.branch_sanitized"]) {
        console.log(`Branch ${BRANCH_NAME}(Slugged to: ${slugifiedBranchName}) is apparently hosted on ${timelineOfBranch.domains[0].domain} through revision ${revision.id} and denos branch name is ${timelineOfBranch.partition["git.branch_sanitized"]}`);

        // check, if we need to wait...
        if (revision.status !== "succeeded") {
          if (revision.status === "failed" || revision.status === "skipped") {
            console.error("Deno deployment failed or was skipped: ", revision.failure_reason ?? "no reason given");
            return null;
          }

          if (revision.status === "building" || revision.status === "queued") {
            pollRevisionStatus(revision.id, headers);
          }
        }

        return timelineOfBranch.domains[0].domain;
      }
    }

    // did not find it...
    console.error("Did not manage to find the url within the first revisions...");
    return null;
  }
  catch (error) {
    if (error instanceof Error) {
      console.warn(`Deno V2 API strategy failed with error: ${error.message}`);
    }
    else {
      console.warn(error);
    }
  }
  return null;
}

async function main() {
  const url = await getUrlFromDenoV2();
  if (!url) {
    console.error("Could not identify a working deployment URL.");
    process.exit(1);
  }
  console.log(`DEPLOYMENT_URL_OUTPUT=${url}`);
  return 0;
}

main();

/**
 * @param {string} revisionId - The endpoint to check
 * @param {HeadersInit} headers - The headers to send along
 * @param {number} maxRetries - Stop after this many attempts
 * @param {number} delay - Milliseconds between checks
 */
function pollRevisionStatus(revisionId, headers, maxRetries = 10, delay = 3000) {
  let attempts = 0;
  const url = `${API_BASE}/v2/revisions/${revisionId}`;
  const executePoll = async () => {
    try {
      const response = await fetch(url, {
        headers,
      });
      /** @type {Revision} */
      const data = await response.json();

      if (data.status === "succeeded") {
        console.log("Success!", data);
        return data;
      }

      // If not finished, check if we have retries left
      attempts++;
      if (attempts < maxRetries) {
        console.log(`Status is ${data.status}. Retrying in ${delay}ms... (Attempt ${attempts})`);
        setTimeout(executePoll, delay);
      }
      else {
        console.error("Max retries reached. Resource is still not ready.");
      }
    }
    catch (error) {
      console.error("Fetch failed:", error);
      // attempts++;
      // if (attempts < maxRetries) setTimeout(executePoll, delay);
    }
  };

  executePoll();
}
