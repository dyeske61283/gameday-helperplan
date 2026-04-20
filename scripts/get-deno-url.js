/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
/**
 * This script identifies the Deno Deploy deployment URL for a specific commit SHA using V2 API.
 * Strategies:
 * 1. Deno Deploy V2 API (primary)
 * 2. GitHub API (fallback)
 * 3. Guessing (last resort)
 */

const APP_ID = process.env.DENO_PROJECT_ID; // In V2 this is the App ID or slug
const DEPLOY_TOKEN = process.env.DENO_DEPLOY_TOKEN ? process.env.DENO_DEPLOY_TOKEN.trim() : null;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_SHA = process.env.GITHUB_SHA;
const REPO = process.env.GITHUB_REPOSITORY;
const PROJECT_NAME = process.env.DENO_PROJECT_NAME;
const ORG_NAME = process.env.DENO_ORG_NAME;
const PR_NUMBER = process.env.PR_NUMBER;
const BRANCH_NAME = process.env.BRANCH_NAME;

if (!GITHUB_SHA) {
  console.error("Missing required environment variable: GITHUB_SHA");
  process.exit(1);
}

const API_BASE = "https://api.deno.com";

const DENO_NET_REGEX = /https:\/\/[a-z0-9-]+\.deno\.net/i;
const DENO_DEV_REGEX = /https:\/\/[a-z0-9-]+\.deno\.dev/i;

async function validateUrl(url) {
  if (!url) {
    return false;
  }
  try {
    console.log(`Validating URL: ${url}`);
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    if (text.includes("DEPLOYMENT_NOT_FOUND")) {
      console.log(`  Invalid: Deno reported DEPLOYMENT_NOT_FOUND for ${url}`);
      return false;
    }
    console.log(`  Valid: Received ${res.status} for ${url}`);
    return true;
  }
  catch (e) {
    console.log(`  Invalid: Fetch failed for ${url}: ${e.message}`);
    return false;
  }
}

/**
 * Strategy 1: Deno Deploy V2 API
 */
async function getUrlFromDenoV2() {
  if (!DEPLOY_TOKEN || !APP_ID) {
    return null;
  }

  const headers = {
    Authorization: DEPLOY_TOKEN.startsWith("Bearer ") ? DEPLOY_TOKEN : `Bearer ${DEPLOY_TOKEN}`,
    Accept: "application/json",
  };

  try {
    // 1. Get recent revisions for the app
    const revisionsUrl = `${API_BASE}/v2/apps/${APP_ID}/revisions?limit=20`;
    const revRes = await fetch(revisionsUrl, { headers });
    if (!revRes.ok) {
      console.warn(`  Deno API revisions fetch failed: ${revRes.status}`);
      return null;
    }

    const revisions = await revRes.json();
    // 2. Find revision matching our SHA
    const revision = revisions.find((r) => {
      return r.labels?.["custom.sha"] === GITHUB_SHA
        || r.labels?.sha === GITHUB_SHA
        || r.id === GITHUB_SHA;
    });

    if (!revision) {
      console.log(`  Revision for SHA ${GITHUB_SHA} not found in latest 20 revisions.`);
      return null;
    }

    console.log(`  Found revision: ${revision.id} (Status: ${revision.status})`);

    if (revision.status === "failed") {
      console.error(`  Revision ${revision.id} failed.`);
      process.exit(1);
    }

    if (revision.status !== "succeeded") {
      return null; // Still building or queued
    }

    // 3. Revision succeeded, now get its timelines to find the URL
    const timelinesUrl = `${API_BASE}/v2/revisions/${revision.id}/timelines`;
    const timeRes = await fetch(timelinesUrl, { headers });
    if (!timeRes.ok) {
      console.warn(`  Deno API timelines fetch failed: ${timeRes.status}`);
      return null;
    }

    const timelines = await timeRes.json();
    // Match timeline by branch
    const timeline = timelines.find((t) => {
      return t.partition?.["git.branch"] === BRANCH_NAME
        || t.slug === BRANCH_NAME.replace(/\//g, "-").toLowerCase()
        || (BRANCH_NAME === "main" && t.slug === "production");
    }) || timelines[0]; // Fallback to first timeline if no exact match

    if (timeline?.domains?.length > 0) {
      const domain = timeline.domains[0].domain;
      return `https://${domain}`;
    }
  }
  catch (error) {
    console.warn(`  Deno V2 API strategy failed: ${error.message}`);
  }
  return null;
}

/**
 * Strategy 2: Check GitHub Statuses/Deployments (Fallback)
 */
async function getUrlFromGitHub() {
  if (!GITHUB_TOKEN || !REPO) {
    return null;
  }
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  };
  try {
    const statusUrl = `https://api.github.com/repos/${REPO}/commits/${GITHUB_SHA}/status`;
    const statusResponse = await fetch(statusUrl, { headers });
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      const denoStatus = statusData.statuses.find((s) => {
        return (s.context.includes("deno") || s.target_url?.includes("deno")) && s.state === "success";
      });
      if (denoStatus?.target_url) {
        return denoStatus.target_url;
      }
    }

    const deployUrl = `https://api.github.com/repos/${REPO}/deployments?sha=${GITHUB_SHA}`;
    const deployResponse = await fetch(deployUrl, { headers });
    if (deployResponse.ok) {
      const deployments = await deployResponse.json();
      if (deployments.length > 0) {
        const res = await fetch(deployments[0].statuses_url, { headers });
        if (res.ok) {
          const statuses = await res.json();
          const successStatus = statuses.find(s => s.state === "success" && s.environment_url);
          if (successStatus) {
            return successStatus.environment_url;
          }
        }
      }
    }

    if (PR_NUMBER) {
      const commentUrl = `https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments`;
      const commentRes = await fetch(commentUrl, { headers });
      if (commentRes.ok) {
        const comments = await commentRes.json();
        for (const comment of comments.reverse()) {
          const match = comment.body.match(DENO_NET_REGEX) || comment.body.match(DENO_DEV_REGEX);
          if (match) {
            return match[0];
          }
        }
      }
    }
  }
  catch { /* ignore */ }
  return null;
}

/**
 * Strategy 3: Guessing (Fallback)
 */
async function findWorkingGuess() {
  if (!PROJECT_NAME || !ORG_NAME || !BRANCH_NAME) {
    return null;
  }
  const cleanBranch = BRANCH_NAME.replace(/\//g, "-").toLowerCase();
  const guesses = [
    `https://${PROJECT_NAME}.${ORG_NAME}.deno.net`,
    `https://${PROJECT_NAME}--${cleanBranch}.${ORG_NAME}.deno.net`,
  ];
  [25, 26].forEach((len) => {
    let trimmed = cleanBranch.substring(0, len);
    if (trimmed.endsWith("-")) {
      trimmed = cleanBranch.substring(0, len + 1);
    }
    guesses.push(`https://${PROJECT_NAME}--${trimmed}.${ORG_NAME}.deno.net`);
  });

  for (const guess of [...new Set(guesses)]) {
    if (await validateUrl(guess)) {
      return guess;
    }
  }
  return null;
}

async function main() {
  const maxAttempts = 60;
  const interval = 10000;

  console.log(`Searching for Deno Deploy URL for SHA: ${GITHUB_SHA}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Attempt ${attempt}:`);

    let url = await getUrlFromDenoV2();
    if (!url) {
      url = await getUrlFromGitHub();
    }

    if (url && await validateUrl(url)) {
      console.log(`Successfully identified deployment URL: ${url}`);
      console.log("Waiting 15 seconds for warm-up...");
      await new Promise(resolve => setTimeout(resolve, 15000));
      console.log(`DEPLOYMENT_URL_OUTPUT=${url}`);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  console.log("Timeout reached. Falling back to multi-guessing...");
  const guessed = await findWorkingGuess();
  if (guessed) {
    console.log(`Found working guess: ${guessed}`);
    console.log(`DEPLOYMENT_URL_OUTPUT=${guessed}`);
    return;
  }

  console.error("Could not identify a working deployment URL.");
  process.exit(1);
}

main();
