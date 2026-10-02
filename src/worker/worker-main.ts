import { runWorkerTask, validateHostProfile, type BridgeHostProfile } from "codex-zcode-bridge/core";
import { dshHostProfile, SERVER_NAME } from "../host/profile.js";

const [dataRoot, taskId, attemptText] = process.argv.slice(2);
if (!dataRoot || !taskId || !attemptText || !/^[1-9]\d*$/u.test(attemptText) || !Number.isSafeInteger(Number(attemptText))) {
  console.error("usage: node worker-main.js <dataRoot> <taskId> <attempt>");
  process.exit(2);
}

try {
  const profileText = process.env["ZCODE_BRIDGE_HOST_PROFILE"];
  const host = profileText ? validateHostProfile(JSON.parse(profileText) as BridgeHostProfile) : dshHostProfile();
  if (host.name !== SERVER_NAME) throw new Error("worker requires a dsh-zcode-bridge host profile");
  await runWorkerTask({ dataRoot, taskId, attempt: Number(attemptText), host });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
