const core = require("@actions/core");
const github = require("@actions/github");
const yaml = require("js-yaml");
const fs = require("fs");
const { spawn } = require("child_process");

try {
  // const orgId = core.getInput("org-id");
  // const projectId = core.getInput("project-id");
  // const appId = core.getInput("app-id");
  // const envId = core.getInput("env-id");
  // const gitHash = core.getInput("git-hash");
  // const gitOpsHash = core.getInput("gitops-hash");
  // const componentType = core.getInput("componentType");
  //const choreoApp = process.env.CHOREO_GITOPS_REPO;

  const subPath = core.getInput("subPath");
  const componentYamlPath = path.join(subPath, "/.choreo/component.yaml");

  if (!fs.existsSync(componentYamlPath)) {
    core.setFailed(`Component YAML file not found at ${componentYamlPath}`);
    process.exit(1);
  }
  const componentYaml = yaml.load(
    fs.readFileSync(`${subPath}/.choreo/component.yaml`, "utf-8")
  );
  const postmanCollectionPath =
    componentYaml.contractTests.postman ||
    core.getInput("defaultPostmanCollectionPath");
  // const choreoApp = process.env.CHOREO_GITOPS_REPO;
  // const commitSHA = process.env.NEW_SHA;
  //const choreoApp = "contract-test";
  const testTempImageName = core.getInput("testTempImageName");
  // const commitSHA = "eb44a52d5c444a12d866aab3b22dad203747aa3d";
  // const registryUrl = "nomadxd";
  // const newImageTag = `${registryUrl}/${choreoApp}:${process.env.COMMIT_HASH}`;
  // var child = spawn(
  //   `docker build -t ${newImageTag} --build-arg POSTMAN_COLLECTION=collection.json .`,
  //   {
  //     shell: true,
  //   }
  // );
  const dockerfileContent = `
    # Use the official Newman base image
    FROM postman/newman:alpine
    
    # Set a working directory in the container
    WORKDIR /app
    
    # Build argument to pass the Postman collection path
    ARG POSTMAN_COLLECTION
    
    # Copy the Postman collection to the container
    COPY $POSTMAN_COLLECTION /app/collection.json
    
    # Define the command to run the collection using Newman
    CMD ["run", "collection.json"]
  `;

  // Create a temporary Dockerfile
  fs.writeFileSync("Dockerfile.inline", dockerfileContent);

  const dockerBuildProcess = spawn("docker", [
    "build",
    "-t",
    testTempImageName,
    "-f",
    "Dockerfile.inline",
    "--build-arg",
    `POSTMAN_COLLECTION=${postmanCollectionPath}`,
    ".",
  ]);

  dockerBuildProcess.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  dockerBuildProcess.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  dockerBuildProcess.on("close", (code) => {
    if (code === 0) {
      // Output the tagged Docker image name
      core.setOutput("dockerImage", newImageTag);
    } else {
      core.setFailed(`Docker build process exited with code ${code}`);
    }
  });
} catch (error) {
  core.setFailed(error.message);
}
