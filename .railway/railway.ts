import { bucket, defineRailway, github, postgres, project, redis, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Redis = redis("Redis", { region: "us-west2" });
  Redis.deploy = { multiRegionConfig: { "us-west2": { numReplicas: 1 } }, startCommand: "/bin/sh -c \"rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH\"" };
  Redis.networking = { privateNetworkEndpoint: "redis" };
  const Postgres = postgres("Postgres", { region: "us-west2" });
  Postgres.deploy = { multiRegionConfig: { "us-west2": { numReplicas: 1 } } };
  Postgres.networking = { privateNetworkEndpoint: "postgres" };
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-west2", sizeMB: 50000 });
  const redisVolume = volume("redis-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-west2", sizeMB: 50000 });
  const houzeeyMedia = bucket("houzeey-media", { region: "sin" });
  const handsomeUpliftment = service("handsome-upliftment", {
    source: github("sargeantcompany-lgtm/houzeey", { branch: "master", checkSuites: false, rootDirectory: "/server" }),
    build: { builder: "RAILPACK" },
    replicas: { "us-west2": 1 },
  });
  const houzeey = service("houzeey", {
    source: github("sargeantcompany-lgtm/houzeey", { branch: "master", checkSuites: false }),
    build: { builder: "RAILPACK" },
    replicas: { "asia-southeast1-eqsg3a": 1 },
    domains: ["www.houzeey.com"],
  });
  const houzeeyWorker = service("houzeey-worker", {
    build: { buildEnvironment: "V3", builder: "RAILPACK" },
    replicas: { "us-west2": 1 },
  });

  return project("Houzeey", {
    variables: { managed: false },
    resources: [handsomeUpliftment, houzeey, Redis, houzeeyWorker, Postgres, postgresVolume, redisVolume, houzeeyMedia],
  });
});
