/* eslint-disable no-console */
/* eslint-disable node/no-process-env */
/**
 * This script polls the Deno Deploy API to find the deployment URL for a specific commit SHA.
 * It waits until the deployment is successful and provides a warm-up period.
 */

const PROJECT_ID = process.env.DENO_PROJECT_ID;
const DEPLOY_TOKEN = process.env.DENO_DEPLOY_TOKEN;
const GITHUB_SHA = process.env.GITHUB_SHA;

if (!PROJECT_ID || !DEPLOY_TOKEN || !GITHUB_SHA) {
  console.error("Missing required environment variables: DENO_PROJECT_ID, DENO_DEPLOY_TOKEN, GITHUB_SHA");
  process.exit(1);
}

const API_BASE = "https://api.deno.com/v1";

async function getDeployment() {
  // We list deployments for the project.
  // We might need to iterate through pages if there are many deployments,
  // but usually the latest ones are on the first page.
  const url = `${API_BASE}/projects/${PROJECT_ID}/deployments?limit=50`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${DEPLOY_TOKEN}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch deployments: ${response.status} ${text}`);
  }

  const deployments = await response.json();

  // Deno Deploy API response is an array of Deployment objects
  // We search for a deployment that matches the current commit SHA.
  // The SHA can be in various places depending on how it was triggered.
  return deployments.find((d) => {
    // Check if it's in the description (often contains commit info)
    if (d.description && d.description.includes(GITHUB_SHA)) {
      return true;
    }

    // Check git commit info if available (standard for GitHub integration)
    if (d.gitCommit && d.gitCommit.sha === GITHUB_SHA) {
      return true;
    }

    // Check attributes (some internal Deno Deploy structures)
    if (d.attributes && d.attributes.gitCommit && d.attributes.gitCommit.sha === GITHUB_SHA) {
      return true;
    }

    return false;
  });
}

async function main() {
  const maxAttempts = 60; // 10 minutes total
  const interval = 10000; // 10 seconds

  console.log(`Searching for Deno Deploy deployment for SHA: ${GITHUB_SHA}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const deployment = await getDeployment();

      if (deployment) {
        console.log(`Found deployment: ${deployment.id} (Status: ${deployment.status})`);

        if (deployment.status === "success") {
          // Identify the deployment URL.
          // Preview deployments often have a specific domain assigned.
          let url = "";
          if (deployment.domains && deployment.domains.length > 0) {
            // Filter out the one that is likely the preview URL if there are multiple
            url = `https://${deployment.domains[0]}`;
          }
          else {
            // Fallback to deployment ID based URL if no domain is returned yet
            url = `https://deno-deploy-preview-${deployment.id}.deno.dev`;
          }

          console.log(`Successfully identified deployment URL: ${url}`);

          // Warm-up period as requested to avoid timeouts in tests
          console.log("Waiting 15 seconds for deployment to warm up...");
          await new Promise(resolve => setTimeout(resolve, 15000));

          // Output the URL for GitHub Actions
          // We use a special format that can be captured by the workflow
          console.log(`DEPLOYMENT_URL_OUTPUT=${url}`);
          return;
        }
        else if (deployment.status === "failed") {
          console.error(`Deployment ${deployment.id} failed.`);
          process.exit(1);
        }
        else {
          console.log(`Deployment ${deployment.id} is still ${deployment.status}...`);
        }
      }
      else {
        console.log(`Attempt ${attempt}: Deployment for SHA ${GITHUB_SHA} not found yet...`);
      }
    }
    catch (error) {
      console.error(`Attempt ${attempt} encountered an error: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  console.error("Timed out waiting for Deno Deploy deployment.");
  process.exit(1);
}

main();
