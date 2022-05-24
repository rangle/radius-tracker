import { work, cmd } from "tasklauncher";
import { buildTasks } from "./lib";

const removeDocsBuildDir = cmd("rm -rf ./src/docs/build");

const buildLib = buildTasks({ test: false });

const installModules = work(cmd("yarn install --cwd ./src/docs")).after(buildLib);

const buildStaticDocs = cmd("yarn --cwd ./src/docs docs-build");

const moveDocsFilesToDemo = cmd("cp -R ./src/docs/build/ ./src/demo/build/docs");

export const buildDocs =  work(moveDocsFilesToDemo).after(buildStaticDocs).after(installModules).after(removeDocsBuildDir);




