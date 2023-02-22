export const concurrentQueue = <T, R>(limit: number, items: ReadonlyArray<T>, process: (val: T) => Promise<R>): Promise<R[]> => {
    function* init() {
        for (const item of items) {
            yield process(item);
        }
    }

    const iterator = init();

    let inflight = 0;
    let processed = 0;
    const results: R[] = [];
    const resume = async (): Promise<void> => {
        const batch = [];
        while (inflight < limit) {
            const itemIdx = processed;
            processed += 1;
            inflight += 1;

            const step = iterator.next();
            if (step.done) { break; }

            batch.push(step.value.then(x => {
                results[itemIdx] = x; // Save preserving order
                inflight -= 1;
                return resume();
            }));
        }

        await Promise.all(batch);
    };

    return resume().then(() => results);
};
