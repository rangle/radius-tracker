/// <reference types="react-scripts" />

declare module "worker-loader!../tracker/worker" {
    const worker: Worker;
    export default () => worker;
}
