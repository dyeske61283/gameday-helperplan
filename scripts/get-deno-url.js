/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
/**
 * This script identifies the Deno Deploy deployment URL for a specific commit SHA.
 * It uses multiple strategies and validates the result.
 */

const PROJECT_ID = process.env.DENO_PROJECT_ID;
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

const API_BASE = "https://api.deno.com/v1";

const DENO_NET_REGEX = /https:\/\/[a-z0-9-]+\.deno\.net/i;
const DENO_DEV_REGEX = /https:\/\/[a-z0-9-]+\.deno\.dev/i;

/**
 * Validates if a URL is actually working and not returning Deno's 404.
 */
async function validateUrl(url) {
  if (!url)
    return false;
  try {
    console.log(`Validating URL: ${url}`);
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    if (text.includes("DEPLOYMENT_NOT_FOUND")) {
      console.log(`  Invalid: Deno reported DEPLOYMENT_NOT_FOUND for ${url}`);
      return false;
    }
    if (res.status === 404) {
      console.log(`  Invalid: Received 404 for ${url}`);
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
 * Strategy 1: Poll Deno Deploy API
 */
async function getDeploymentFromDenoApi() {
  if (!DEPLOY_TOKEN || !PROJECT_ID)
    return null;

  try {
    const url = `${API_BASE}/projects/${PROJECT_ID}/deployments?limit=50`;
    const response = await fetch(url, {
      headers: {
        Authorization: DEPLOY_TOKEN.startsWith("Bearer ") ? DEPLOY_TOKEN : `Bearer ${DEPLOY_TOKEN}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`  Deno API error: ${response.status} ${text}`);
      return null;
    }

    const deployments = await response.json();
    const deployment = deployments.find((d) => {
      if (d.description && d.description.includes(GITHUB_SHA))
        return true;
      if (d.gitCommit && d.gitCommit.sha === GITHUB_SHA)
        return true;
      if (d.attributes && d.attributes.gitCommit && d.attributes.gitCommit.sha === GITHUB_SHA)
        return true;
      return false;
    });

    if (deployment && deployment.status === "success") {
      const domain = deployment.domains?.[0];
      return domain ? `https://${domain}` : null;
    }
    return null;
  }
  catch (error) {
    console.warn(`  Deno API fetch failed: ${error.message}`);
    return null;
  }
}

/**
 * Strategy 2: Check GitHub Statuses/Deployments
 */
async function getUrlFromGitHub() {
  if (!GITHUB_TOKEN || !REPO)
    return null;

  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  };

  try {
    // Check Commit Statuses
    const statusUrl = `https://api.github.com/repos/${REPO}/commits/${GITHUB_SHA}/status`;
    const statusResponse = await fetch(statusUrl, { headers });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      const denoStatus = statusData.statuses.find(s =>
        (s.context.includes("deno") || s.target_url?.includes("deno")) && s.state === "success",
      );
      if (denoStatus?.target_url) {
        console.log(`  Found URL in GitHub Status: ${denoStatus.target_url}`);
        return denoStatus.target_url;
      }
    }

    // Check Deployments API
    const deployUrl = `https://api.github.com/repos/${REPO}/deployments?sha=${GITHUB_SHA}`;
    const deployResponse = await fetch(deployUrl, { headers });

    if (deployResponse.ok) {
      const deployments = await deployResponse.json();
      for (const deploy of deployments) {
        const res = await fetch(deploy.statuses_url, { headers });
        if (res.ok) {
          const statuses = await res.json();
          const successStatus = statuses.find(s => s.state === "success" && s.environment_url);
          if (successStatus) {
            console.log(`  Found URL in GitHub Deployment: ${successStatus.environment_url}`);
            return successStatus.environment_url;
          }
        }
      }
    }

    // Check PR comments if available
    if (PR_NUMBER) {
      const commentUrl = `https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments`;
      const commentRes = await fetch(commentUrl, { headers });
      if (commentRes.ok) {
        const comments = await commentRes.json();
        for (const comment of comments.reverse()) {
          const match = comment.body.match(DENO_NET_REGEX) || comment.body.match(DENO_DEV_REGEX);
          if (match) {
            console.log(`  Found URL in PR comment: ${match[0]}`);
            return match[0];
          }
        }
      }
    }
  }
  catch (error) {
    console.warn(`  GitHub API check failed: ${error.message}`);
  }
  return null;
}

/**
 * Strategy 3: Exhaustive Guessing and Validation
 */
async function findWorkingGuess() {
  if (!PROJECT_NAME || !ORG_NAME || !BRANCH_NAME)
    return null;

  const guesses = [];

  if (BRANCH_NAME === "main" || BRANCH_NAME === "master") {
    guesses.push(`https://${PROJECT_NAME}.${ORG_NAME}.deno.net`);
  }
  else {
    // Standard truncation
    const cleanBranch = BRANCH_NAME.replace(/\//g, "-").toLowerCase();

    // Try different truncation lengths
    [25, 26, 30, 40, 64].forEach((len) => {
      let trimmed = cleanBranch.substring(0, len);
      if (trimmed.endsWith("-"))
        trimmed = cleanBranch.substring(0, len + 1);
      guesses.push(`https://${PROJECT_NAME}--${trimmed}.${ORG_NAME}.deno.net`);
    });

    // Try full name
    guesses.push(`https://${PROJECT_NAME}--${cleanBranch}.${ORG_NAME}.deno.net`);
  }

  // Remove duplicates
  const uniqueGuesses = [...new Set(guesses)];

  for (const guess of uniqueGuesses) {
    if (await validateUrl(guess))
      return guess;
  }

  return null;
}

async function main() {
  const maxAttempts = 60; // 10 minutes
  const interval = 10000;

  console.log(`Searching for Deno Deploy URL for SHA: ${GITHUB_SHA}`);
  console.log(`Context: Project=${PROJECT_NAME}, Org=${ORG_NAME}, Branch=${BRANCH_NAME}, PR=${PR_NUMBER}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Attempt ${attempt}:`);

    let url = await getDeploymentFromDenoApi();
    if (!url)
      url = await getUrlFromGitHub();

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
