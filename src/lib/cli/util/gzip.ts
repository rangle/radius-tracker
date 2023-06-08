import { constants, createGzip } from "zlib";
import { Readable } from "stream";
import { createWriteStream } from "fs";

export const writeGzippedOutput = (data: Buffer, outfile: string) => {
    const deflate = createGzip({ level: constants.Z_BEST_COMPRESSION });
    const compressedWriteStream = Readable.from(data)
        .pipe(deflate)
        .pipe(createWriteStream(outfile, { encoding: "utf8" }));

    return new Promise((res, rej) => {
        compressedWriteStream.on("finish", res);
        compressedWriteStream.on("error", rej);
    });
};
