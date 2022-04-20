import { work, cmd } from "tasklauncher";

const removeLambdaBuildDir = cmd("rm -rf ./src/lambda/build");

const lambdaGenerator = (lambdaName: string) => {
    const createLambdaBuildDir = cmd(`mkdir -p ./src/lambda/build/${ lambdaName }`);

    const buildLambda = cmd(`tsc -p ./src/lambda/${ lambdaName }/tsconfig.json`);

    const copyPackageJson = cmd(`cp ./src/lambda/${ lambdaName }/package.json ./src/lambda/build/${ lambdaName }/`);

    const installPackages = cmd(`yarn install --cwd ./src/lambda/${ lambdaName }`);
    const copyNodeModules = cmd(`cp -r ./src/lambda/${ lambdaName }/node_modules ./src/lambda/build/${ lambdaName }/node_modules`);

    const installModules = work(copyPackageJson, copyNodeModules).after(installPackages).after(createLambdaBuildDir);

    return work(buildLambda).after(installModules);
};

export const buildLambda = work(lambdaGenerator("listener"), lambdaGenerator("worker")).after(removeLambdaBuildDir);


