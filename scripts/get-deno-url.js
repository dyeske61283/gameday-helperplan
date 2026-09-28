/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
// @ts-check
/**
 * This script identifies the Deno Deploy deployment URL for a specific commit using V2 API.
 * Strategies:
 * 1. Deno Deploy V2 API (primary)
 */

/** @typedef {{ id: string, status: 'succeeded' | 'queued' | 'failed' | 'building' | 'skipped', failure_reason?: string, timelines?: Array<{ hostnames?: string[] }> }} Revision */

import process from "node:process";

const DEPLOY_TOKEN = process.env.DENO_DEPLOY_TOKEN;
const GITHUB_SHA = process.env.GITHUB_SHA;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

const API_BASE = "https://api.deno.com";

async function getRevisionIdFromGitHub(headers) {
  const deploymentsUrl = new URL(`https://api.github.com/repos/${GITHUB_REPOSITORY}/deployments`);
  deploymentsUrl.searchParams.set("sha", GITHUB_SHA);
  deploymentsUrl.searchParams.set("environment", "test");
  deploymentsUrl.searchParams.set("per_page", "10");

  const deploymentsResponse = await fetch(deploymentsUrl, { headers });
  if (!deploymentsResponse.ok)
    throw new Error(`GitHub deployments fetch failed: ${deploymentsResponse.status}`);

  /** @type {Array<{ statuses_url: string }>} */
  const deployments = await deploymentsResponse.json();
  for (const deployment of deployments) {
    const statusesResponse = await fetch(deployment.statuses_url, { headers });
    if (!statusesResponse.ok)
      continue;

    /** @type {Array<{ state: string, target_url?: string }>} */
    const statuses = await statusesResponse.json();
    const targetUrl = statuses.find(status => status.state === "success")?.target_url;
    const revisionId = targetUrl?.match(/\/builds\/([^/?#]+)/)?.[1];
    if (revisionId)
      return revisionId;
  }

  return null;
}

async function main() {
  if (!DEPLOY_TOKEN || !GITHUB_SHA || !GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    console.error("DENO_DEPLOY_TOKEN, GITHUB_SHA, GITHUB_TOKEN, and GITHUB_REPOSITORY are required");
    process.exit(1);
  }

  const denoHeaders = {
    Authorization: DEPLOY_TOKEN.startsWith("Bearer ") ? DEPLOY_TOKEN : `Bearer ${DEPLOY_TOKEN}`,
    Accept: "application/json",
  };
  const githubHeaders = {
    "Authorization": `Bearer ${GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const maxRevisionLookups = 40;
  const delay = 3000;
  let revisionId = null;

  for (let attempt = 0; attempt < maxRevisionLookups; attempt++) {
    try {
      revisionId = await getRevisionIdFromGitHub(githubHeaders);
    }
    catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }

    if (revisionId)
      break;

    console.log(`Deno deployment for ${GITHUB_SHA} is not ready yet. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRevisionLookups})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  if (!revisionId) {
    console.error(`Could not find a successful Deno deployment for commit ${GITHUB_SHA} after ${maxRevisionLookups} attempts.`);
    process.exit(1);
  }

  const ready = await pollRevisionStatus(revisionId, denoHeaders);
  if (!ready)
    process.exit(1);

  const hostname = ready.timelines?.flatMap(timeline => timeline.hostnames ?? [])[0];
  const url = hostname && (hostname.startsWith("http://") || hostname.startsWith("https://") ? hostname : `https://${hostname}`);
  if (!url) {
    console.error(`Deno revision ${ready.id} succeeded but has no routed hostname.`);
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
 * @returns {Promise<Revision | null>} The succeeded revision, or null when deployment fails.
 */
async function pollRevisionStatus(revisionId, headers, maxRetries = 10, delay = 3000) {
  const url = `${API_BASE}/v2/revisions/${revisionId}`;
  for (let attempts = 0; attempts < maxRetries; attempts++) {
    try {
      const response = await fetch(url, { headers });
      /** @type {Revision} */
      const data = await response.json();

      if (data.status === "succeeded") {
        console.log("Success!", data);
        return data;
      }
      if (data.status === "failed" || data.status === "skipped") {
        console.error("Deno deployment failed or was skipped:", data.failure_reason ?? "no reason given");
        return false;
      }

      console.log(`Status is ${data.status}. Retrying in ${delay}ms... (Attempt ${attempts + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    catch (error) {
      console.error("Fetch failed:", error);
      return false;
    }
  }

  console.error("Max retries reached. Resource is still not ready.");
  return false;
}
