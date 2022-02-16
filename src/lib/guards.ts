/* eslint-disable @typescript-eslint/no-explicit-any */
import { inspect } from "util";
import { Function, Misc } from "ts-toolbelt";

export const identity = <T>(val: T) => val;
export const atLeastOne = <T>(val: ArrayLike<T>): [T, ...T[]] => {
    if (val.length < 1) { throw new Error("Expected at least one value"); }
    return val as any;
};

type StringKeys<T> = Extract<keyof T, string>;
export const objectKeys = <T>(val: T): StringKeys<T>[] => Object.keys(val) as any;
export const objectValues = <T>(val: T): (T[StringKeys<T>])[] => objectKeys(val).map(k => val[k]);

export type Guard<In, Out extends In> = (val: In) => val is Out;

type GuardInput<G extends Guard<any, unknown>> = G extends G ? Parameters<G>[0] : never;
type GuardArrInput<Guards extends Guard<any, unknown>[]> = GuardInput<Guards[number]>;

type GuardOutput<G extends Guard<any, unknown>> = G extends G ? (G extends Guard<infer _In, infer Out> ? Out : never) : never;
type GuardArrOutput<Guards extends Guard<any, unknown>[]> = GuardOutput<Guards[number]>;

export const isExactly = <Val extends Misc.Primitive>(expected: Function.Narrow<Val>) => (val: unknown): val is Val => val === expected;
export const isNot = <In, Out extends In>(guard: Guard<In, Out>) => <T extends In>(val: T | Out): val is T => !guard(val);

export const isNull = isExactly(null);
export const isNotNull = isNot(isNull);

export const isUndefined = isExactly(undefined);
export const isNotUndefined = isNot(isUndefined);

export const isEither = <Guards extends Guard<any, unknown>[]>(...guards: Guards) => (val: GuardArrInput<Guards>): val is GuardArrOutput<Guards> => guards.some(g => g(val));

export const unexpected = (val: never): never => { throw new Error(`Unexpected value: ${ inspect(val) }`); };
