const core = require("@actions/core");
const github = require("@actions/github");
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

try {
  const subPath = core.getInput("sub-path");
  const componentYamlPath = path.join(subPath, ".choreo/component.yaml");

  // Exit if .choreo/component.yaml is not found
  if (!fs.existsSync(componentYamlPath)) {
    core.setFailed(`Component YAML file not found at ${componentYamlPath}`);
    process.exit(1);
  }

  // Read component.yaml
  const componentYaml = yaml.load(
    fs.readFileSync(`${subPath}/.choreo/component.yaml`, "utf-8")
  );

  // Use postman collection path defined in component.yaml.
  // If empty use default value passed.
  const postmanCollectionPath =
    componentYaml.contractTests.postman ||
    core.getInput("default-postman-path");

  // Name of the temporary image name used for test image.
  // IMPORTANT: choreo-templates/choreo-image-push@v1.0.4 use the same name
  // to refer the image built in this step.
  const testTempImageName = core.getInput("test-image-temp-name");

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
      core.setOutput("dockerImage", testTempImageName);
    } else {
      core.setFailed(`Docker build process exited with code ${code}`);
    }
  });
} catch (error) {
  core.setFailed(error.message);
}
