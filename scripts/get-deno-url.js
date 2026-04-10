
async function getDenoUrl() {
  const projectId = process.env.DENO_PROJECT_ID;
  const apiToken = process.env.DENO_DEPLOY_TOKEN;
  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
  const sha = process.env.GITHUB_SHA;

  if (!projectId || !apiToken) {
    console.error("DENO_PROJECT_ID and DENO_DEPLOY_TOKEN must be set");
    process.exit(1);
  }

  const url = `https://api.deno.com/projects/${projectId}/deployments`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch deployments: ${response.statusText}`);
    }

    const deployments = await response.json();

    // Filter by branch and SHA if possible, or just the latest for the branch
    // Deno Deploy API response usually has 'git' or 'deployment' details
    // We want the most recent successful deployment for this branch.

    const deployment = deployments.find(d =>
      d.status === "success" &&
      (d.git?.branch === branch || d.branch === branch)
    );

    if (!deployment) {
      // Fallback to latest success if branch match fails
      const latestSuccess = deployments.find(d => d.status === "success");
      if (latestSuccess) {
        console.log(`https://${latestSuccess.id}.deno.dev`);
        return;
      }
      throw new Error("No successful deployment found");
    }

    // Usually deployment URL is https://{deployment_id}.deno.dev or it has a 'domainMappings'
    console.log(`https://${deployment.id}.deno.dev`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

getDenoUrl();
