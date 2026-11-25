import { defineRailway, project, service } from "railway/iac";

export default defineRailway(() => {
  const web = service("handsome-upliftment", {
    build: "npm install",
    start: "node src/index.js",
    healthcheck: "/health",
    healthcheckTimeout: 30,
    // builder from CaC: "nixpacks"
  });

  return project("handsome-upliftment", {
    resources: [web],
  });
});
