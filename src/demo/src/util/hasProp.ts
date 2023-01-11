// TODO: duplicate of `hasProp` in lib/guards — remove duplicate
export const hasProp = <P extends string>(prop: P) => <T>(val: T): val is T & { [p in P]: unknown } => {
    if (!val) { return false; }
    return Boolean(val) && typeof val === "object" && prop in val;
};
