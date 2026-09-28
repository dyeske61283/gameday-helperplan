/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
// @ts-check
/**
 * This script identifies the Deno Deploy deployment URL for a specific commit using V2 API.
 * Strategies:
 * 1. Deno Deploy V2 API (primary)
 */

/** @typedef {{ id: string, status: 'succeeded' | 'queued' | 'failed' | 'building' | 'skipped', failure_reason?: string, git?: { sha?: string }, preview_url?: string | null }} Revision */

import process from "node:process";

const APP_ID = process.env.DENO_PROJECT_ID;
const DEPLOY_TOKEN = process.env.DENO_DEPLOY_TOKEN;
const GITHUB_SHA = process.env.GITHUB_SHA;

const API_BASE = "https://api.deno.com";

async function getRevisionForCommit(headers) {
  let nextUrl = `${API_BASE}/v2/apps/${APP_ID}/revisions?limit=100`;
  while (nextUrl) {
    const response = await fetch(nextUrl, { headers });
    if (!response.ok)
      throw new Error(`Deno API revisions fetch failed: ${response.status}`);

    /** @type {Array.<Revision>} */
    const revisions = await response.json();
    const revision = revisions.find(item => item.git?.sha === GITHUB_SHA);
    if (revision)
      return revision;

    const nextPath = response.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
    nextUrl = nextPath ? new URL(nextPath, API_BASE).toString() : "";
  }

  return null;
}

async function main() {
  if (!DEPLOY_TOKEN || !APP_ID || !GITHUB_SHA) {
    console.error("DENO_PROJECT_ID, DENO_DEPLOY_TOKEN, and GITHUB_SHA are required");
    process.exit(1);
  }

  const headers = {
    Authorization: DEPLOY_TOKEN.startsWith("Bearer ") ? DEPLOY_TOKEN : `Bearer ${DEPLOY_TOKEN}`,
    Accept: "application/json",
  };

  const maxRevisionLookups = 40;
  const delay = 3000;
  let revision = null;

  for (let attempt = 0; attempt < maxRevisionLookups; attempt++) {
    try {
      revision = await getRevisionForCommit(headers);
    }
    catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }

    if (revision)
      break;

    console.log(`Revision for ${GITHUB_SHA} is not visible yet. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRevisionLookups})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  if (!revision) {
    console.error(`Could not find a Deno revision for commit ${GITHUB_SHA} after ${maxRevisionLookups} attempts.`);
    process.exit(1);
  }

  if (revision.status === "failed" || revision.status === "skipped") {
    console.error("Deno deployment failed or was skipped:", revision.failure_reason ?? "no reason given");
    process.exit(1);
  }

  if (revision.status !== "succeeded") {
    const ready = await pollRevisionStatus(revision.id, headers);
    if (!ready)
      process.exit(1);
    revision = ready;
  }

  const url = revision.preview_url;
  if (!url) {
    console.error(`Deno revision ${revision.id} succeeded but has no preview URL.`);
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
