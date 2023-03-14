import { exec } from "child_process";

export const asyncExec = (cmd: string) => new Promise<void>((res, rej) => {
    try {
        exec(cmd, (err, _, stderr) => {
            if (err) {
                console.log(stderr);
                rej(err);
            } else {
                res();
            }
        });
    } catch (e) {
        rej(e);
    }
});
