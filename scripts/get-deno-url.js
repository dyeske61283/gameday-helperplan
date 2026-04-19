/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
/**
 * This script identifies the Deno Deploy deployment URL for a specific commit SHA.
 * It uses multiple strategies:
 * 1. Deno Deploy API (requires DENO_DEPLOY_TOKEN)
 * 2. GitHub API (requires GITHUB_TOKEN) to check for deployment statuses
 * 3. Guessing (requires DENO_PROJECT_NAME and DENO_ORG_NAME)
 * It waits until the deployment is successful and provides a warm-up period.
 */

const PROJECT_ID = process.env.DENO_PROJECT_ID;
const DEPLOY_TOKEN = process.env.DENO_DEPLOY_TOKEN ? process.env.DENO_DEPLOY_TOKEN.trim() : null;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_SHA = process.env.GITHUB_SHA;
const REPO = process.env.GITHUB_REPOSITORY;
const PROJECT_NAME = process.env.DENO_PROJECT_NAME;
const ORG_NAME = process.env.DENO_ORG_NAME;

if (!GITHUB_SHA) {
  console.error("Missing required environment variable: GITHUB_SHA");
  process.exit(1);
}

const API_BASE = "https://api.deno.com/v1";

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
      console.warn(`Deno API error: ${response.status} ${text}`);
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
    console.warn(`Deno API fetch failed: ${error.message}`);
    return null;
  }
}

/**
 * Strategy 2: Check GitHub Statuses/Deployments
 */
async function getUrlFromGitHub() {
  if (!GITHUB_TOKEN || !REPO)
    return null;

  try {
    // Check Commit Statuses
    const statusUrl = `https://api.github.com/repos/${REPO}/commits/${GITHUB_SHA}/status`;
    const statusResponse = await fetch(statusUrl, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      // Look for Deno Deploy status
      const denoStatus = statusData.statuses.find(s =>
        s.context.includes("deno") || s.target_url?.includes("deno.dev") || s.target_url?.includes("deno.net"),
      );
      if (denoStatus && denoStatus.state === "success" && denoStatus.target_url) {
        return denoStatus.target_url;
      }
    }

    // Check Deployments API
    const deployUrl = `https://api.github.com/repos/${REPO}/deployments?sha=${GITHUB_SHA}`;
    const deployResponse = await fetch(deployUrl, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (deployResponse.ok) {
      const deployments = await deployResponse.json();
      if (deployments.length > 0) {
        const lastDeploy = deployments[0];
        const statusUrl = `https://api.github.com/repos/${REPO}/deployments/${lastDeploy.id}/statuses`;
        const res = await fetch(statusUrl, {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
        if (res.ok) {
          const statuses = await res.json();
          const successStatus = statuses.find(s => s.state === "success" && s.environment_url);
          if (successStatus)
            return successStatus.environment_url;
        }
      }
    }
  }
  catch (error) {
    console.warn(`GitHub API check failed: ${error.message}`);
  }
  return null;
}

/**
 * Strategy 3: Guess (best effort fallback)
 */
function guessUrl() {
  if (!PROJECT_NAME || !ORG_NAME)
    return null;

  // Branch name is needed for construction
  const branchName = process.env.BRANCH_NAME || "";
  if (!branchName)
    return null;

  // Deno Deploy URL construction logic
  // handle branch name to be cut to max 25 characters and replace slashes with dashes
  let trimmed = branchName.substring(0, 25);
  if (trimmed.endsWith("-")) {
    trimmed = branchName.substring(0, 26);
  }
  const branchPart = trimmed.replace(/\//g, "-").toLowerCase();

  if (branchName === "main" || branchName === "master") {
    return `https://${PROJECT_NAME}.${ORG_NAME}.deno.net`;
  }
  return `https://${PROJECT_NAME}--${branchPart}.${ORG_NAME}.deno.net`;
}

async function main() {
  const maxAttempts = 60; // 10 minutes
  const interval = 10000;

  console.log(`Searching for Deno Deploy URL for SHA: ${GITHUB_SHA}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let url = await getDeploymentFromDenoApi();

    if (!url) {
      url = await getUrlFromGitHub();
    }

    if (url) {
      console.log(`Successfully identified deployment URL: ${url}`);
      console.log("Waiting 15 seconds for warm-up...");
      await new Promise(resolve => setTimeout(resolve, 15000));
      console.log(`DEPLOYMENT_URL_OUTPUT=${url}`);
      return;
    }

    console.log(`Attempt ${attempt}: URL not found yet...`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  // Final fallback to guess
  const guessed = guessUrl();
  if (guessed) {
    console.log(`Timeout reached. Using guessed URL as last resort: ${guessed}`);
    console.log(`DEPLOYMENT_URL_OUTPUT=${guessed}`);
    return;
  }

  console.error("Could not identify deployment URL and no guess available.");
  process.exit(1);
}

main();
