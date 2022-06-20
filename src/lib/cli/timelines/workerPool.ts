import { cpus, totalmem } from "os";
import { StaticPool } from "node-worker-threads-pool";
import { join } from "path";
import { statSync } from "fs";

export const setupWorkerPool = () => {
    const twoGigInBytes = 2 * 1024 * 1024 * 1024;

    const allocatableMemory = totalmem() * 0.9; // Leave 10% memory for OS tasks.
    const desiredMemory = Math.min(allocatableMemory, twoGigInBytes);
    const numWorkers = Math.max(
        Math.min(
            cpus().length - 1, // All CPUs but one
            Math.floor(allocatableMemory / desiredMemory), // However many workers fit in memory with desired allocation
        ),
        1,
    );
    console.log(`Creating a worker pool with ${ numWorkers } workers`);

    // Select worker based on availability of .ts source
    // In dev select the .ts, otherwise we're in build so use .js
    const workerFileBase = join(__dirname, "statsWorker");
    const workerFile = workerFileBase + (statSync(workerFileBase + ".ts", { throwIfNoEntry: false })?.isFile() ? ".ts" : ".js");

    return new StaticPool({
        size: numWorkers,
        task: workerFile,
        resourceLimits: { maxOldGenerationSizeMb: desiredMemory / 1024 },
    });
};

