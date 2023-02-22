import { objectKeys } from "../../guards";
import { UsageStat } from "../sharedTypes";

export function usageDistributionAcrossFileTree(usages: UsageStat[]): string {
    const inc = (agg: { [f: string]: number }, chunk: string) => agg[chunk] = (agg[chunk] ?? 0) + 1;

    const usageCounts = usages
        .map(usage => usage.usage_file)
        .reduce((_agg, f) => {
            const [firstChunk, ...chunks] = f.split("/");

            if (firstChunk === undefined) {
                inc(_agg, "/");
                return _agg;
            }

            if (firstChunk) {
                inc(_agg, firstChunk);
            }

            chunks.reduce((acc, c) => {
                const current = `${ acc }/${ c }`;
                inc(_agg, current);
                return current;
            }, firstChunk);

            return _agg;
        }, {} as { [f: string]: number });

    return showTopEntries(usageCounts);
}

export function componentUsageDistribution(usages: UsageStat[]) {
    const usageCounts = usages.reduce((agg, u) => {
        const usage = agg[u.component_name] ?? 0;
        agg[u.component_name] = usage + 1;
        return agg;
    }, {} as { [name: string]: number });

    return showTopEntries(usageCounts);
}

export function showTopEntries(keyedCounts: { [key: string]: number }): string {
    const allKeys = objectKeys(keyedCounts);
    const sortedKeys = allKeys
        .filter(k => (keyedCounts[k] ?? 0) > (allKeys.length > 10 ? 1 : 0))
        .sort((a, b) => (keyedCounts[b] ?? 0) - (keyedCounts[a] ?? 0));

    const relevantKeys = sortedKeys.length > 10 ? sortedKeys.slice(0, Math.floor(sortedKeys.length / 5)) : sortedKeys;

    const maxNumSize = relevantKeys.reduce((max, k) => {
        const num = keyedCounts[k] ?? 0;
        return max > num ? max : num;
    }, 0).toString().length;
    const pad = (n: number) => {
        const str = n.toString();
        const paddingSize = maxNumSize - str.length;
        return paddingSize === 0 ? str : `${ " ".repeat(paddingSize) }${ str }`;
    };
    return relevantKeys.map(k => `${ pad(keyedCounts[k] ?? 0) } ${ k }`).join("\n");
}
