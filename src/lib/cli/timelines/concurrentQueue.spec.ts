import { concurrentQueue } from "./concurrentQueue";

describe("Concurrent Queue", () => {
    const deferred = (): { promise: Promise<void>, res: () => void } => {
        let res: null | (() => void) = null;
        const promise = new Promise<void>(r => { res = r; });

        if (!res) { throw new Error("Implementation error: could not grab resolve function"); }
        return { promise, res };
    };

    it("should return results in order of task definition, even if tasks complete out of sequence", async () => {
        const range = [...Array(10).keys()];
        const tasks = range.map(i => () => new Promise(r => setTimeout(
            () => r(i),
            Math.round(Math.random()) + 1, // Resolve in 1 or 2ms
        )));
        const res = await concurrentQueue(Infinity, tasks, x => x());
        expect(res).toEqual(range);
    });

    it("should limit the number of tasks running concurrently", async () => {
        const range = [...Array(5).keys()];
        const deferreds = range.map(deferred);
        const tasks = range.map(i => jest.fn().mockImplementation(() => {
            const d = deferreds[i];
            if (!d) { throw new Error("Ranges mismatch"); }
            return d.promise;
        }));

        const res = concurrentQueue(2, tasks, x => x());

        expect(tasks[0]).toHaveBeenCalled();
        expect(tasks[1]).toHaveBeenCalled();
        expect(tasks[2]).not.toHaveBeenCalled();
        expect(tasks[3]).not.toHaveBeenCalled();
        expect(tasks[4]).not.toHaveBeenCalled();

        deferreds[1]?.res(); // Resolve 2nd task
        await deferreds[1]?.promise;
        expect(tasks[0]).toHaveBeenCalled();
        expect(tasks[1]).toHaveBeenCalled();
        expect(tasks[2]).toHaveBeenCalled();
        expect(tasks[3]).not.toHaveBeenCalled();
        expect(tasks[4]).not.toHaveBeenCalled();

        deferreds[2]?.res(); // Resolve 3rd task
        await deferreds[2]?.promise;
        expect(tasks[0]).toHaveBeenCalled();
        expect(tasks[1]).toHaveBeenCalled();
        expect(tasks[2]).toHaveBeenCalled();
        expect(tasks[3]).toHaveBeenCalled();
        expect(tasks[4]).not.toHaveBeenCalled();

        deferreds[0]?.res(); // Resolve 1st task
        await deferreds[0]?.promise;
        expect(tasks[0]).toHaveBeenCalled();
        expect(tasks[1]).toHaveBeenCalled();
        expect(tasks[2]).toHaveBeenCalled();
        expect(tasks[3]).toHaveBeenCalled();
        expect(tasks[4]).toHaveBeenCalled();

        deferreds.slice(3).forEach(x => x.res()); // Resolve remaining deferreds
        await res; // Handle error if any
    });
});
