import { work, cmd } from "tasklauncher";
import { buildTasks } from "./lib";

const removeLambdaBuildDir = cmd("rm -rf ./src/lambda/build");

const buildLib = buildTasks({ test: false });

const lambdaGenerator = (lambdaName: string) => {
    const createLambdaBuildDir = cmd(`mkdir -p ./src/lambda/build/${ lambdaName }`);

    const buildLambda = cmd(`tsc -p ./src/lambda/${ lambdaName }/tsconfig.json`);

    const copyPackageJson = cmd(`cp ./src/lambda/${ lambdaName }/package.json ./src/lambda/build/${ lambdaName }/`);

    const installPackages = work(cmd(`yarn install --cwd ./src/lambda/${ lambdaName } --mutex network`)).after(buildLib);
    const copyNodeModules = cmd(`cp -r ./src/lambda/${ lambdaName }/node_modules ./src/lambda/build/${ lambdaName }/node_modules`);

    const installModules = work(copyPackageJson, copyNodeModules).after(installPackages).after(createLambdaBuildDir);

    return work(buildLambda).after(installModules);
};

export const buildLambda = work(lambdaGenerator("listener"), lambdaGenerator("worker")).after(removeLambdaBuildDir);

export const createAPI = cmd("echo \"API_URL=$(terraform output -json listener_outputs | jq '.api_invoke_url')\" > ../.env");
