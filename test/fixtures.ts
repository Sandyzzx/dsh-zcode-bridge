import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function fixture(interaction = false) {
  const root = await mkdtemp(path.join(tmpdir(), "dsh-host-test-"));
  const home = path.join(root, "home");
  const settings = path.join(home, ".dsh", "zcode-bridge");
  const personal = path.join(home, ".zcode", "v2", "provider_config.json");
  const builtin = path.join(root, "builtin.json");
  const runtime = path.join(root, "runtime.cjs");
  const log = path.join(root, "requests.jsonl");
  await mkdir(settings, { recursive: true });
  await mkdir(path.dirname(personal), { recursive: true });
  await writeFile(builtin, JSON.stringify({ config: {} }));
  await writeFile(personal, JSON.stringify({ config: { providerConfigRules: { providerRules: [{ providerId: "fake" }] } } }));
  const report = { summary: "dsh fixture completed", files_changed: [], tests: [], issues: [], needs_master_decision: false };
  await writeFile(runtime, `const fs=require('node:fs'),rl=require('node:readline').createInterface({input:process.stdin});
const out=x=>process.stdout.write(JSON.stringify(x)+'\\n');
const event=(seq,type,payload)=>out({method:'session/event',params:{sessionId:'dsh-session',seq,type,payload}});
const snapshot=()=>({session:{sessionId:'dsh-session'},settings:{model:{current:{providerId:'fake',modelId:'fake'},available:[{ref:{providerId:'fake',modelId:'fake'},label:'Fake',contextWindow:1000}]}},runtime:{eventSeq:0}});
const finish=()=>event(3,'turn.completed',{turnId:'dsh-turn',response:JSON.stringify(${JSON.stringify(report)}),resultType:'success'});
rl.on('line',line=>{const m=JSON.parse(line);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(m)+'\\n');
if(m.method==='session/create'||m.method==='session/resume')out({id:m.id,result:snapshot()});
else if(m.method==='session/send'){out({id:m.id,result:{}});event(1,'turn.started',{turnId:'dsh-turn'});
${interaction ? `out({id:'permission',method:'interaction/requestPermission',params:{requestId:'repeated-request',sessionId:'dsh-session',toolName:'Bash',input:{command:'fake build'},options:[{kind:'allow_once'},{kind:'deny'}]}});` : "finish();"}}
else if(m.id==='permission')finish();else out({id:m.id,result:{}});});`);
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, USERPROFILE: home };
  for (const key of Object.keys(env)) if (key.startsWith("ZCODE_")) delete env[key];
  const config = { ZCODE_BRIDGE_NODE: process.execPath, ZCODE_BRIDGE_ZCODE_CJS: runtime, ZCODE_BUILTIN_PROVIDER_CONFIG_FILE: builtin, ZCODE_PERSONAL_PROVIDER_CONFIG_FILE: personal, ZCODE_HOME: path.join(home, ".zcode"), ZCODE_BRIDGE_DATA_DIR: path.join(root, "data"), ZCODE_BRIDGE_MODE: "build" };
  await writeFile(path.join(settings, "runtime-config.json"), JSON.stringify(config));
  return { root, home, settings, personal, builtin, runtime, log, env, config, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
