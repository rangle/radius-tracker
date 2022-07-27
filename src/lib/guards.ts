/* eslint-disable @typescript-eslint/no-explicit-any */
import { inspect } from "util";
import { Any, Function, Misc } from "ts-toolbelt";

export const atLeastOne = <T>(val: ArrayLike<T>): [T, ...T[]] => {
    if (val.length < 1) { throw new Error("Expected at least one value"); }
    return val as any;
};

export type StringKeys<T> = T extends T ? Extract<keyof T, string> : never;
export const objectKeys = <T>(val: T): StringKeys<T>[] => Object.keys(val) as any;
export const objectValues = <T>(val: T): (T[StringKeys<T>])[] => Object.values(val);
export const objectEntries = <T>(val: T): [StringKeys<T>, T[StringKeys<T>]][] => Object.entries(val) as any;

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

const typeOf = (val: unknown) => typeof val;
type TypeofResults = ReturnType<typeof typeOf>;
type TypeofMapping = { // Must be in sync with `TypeofResults`
    string: string,
    number: number,
    bigint: BigInt,
    boolean: boolean,
    symbol: symbol,
    undefined: undefined,
    object: {},
    function: (...args: any[]) => unknown,
};

export const isTypeof = <T extends TypeofResults>(expectedType: T) => (val: unknown): val is TypeofMapping[T] => typeOf(val) === expectedType;
export const isString = isTypeof("string");
export const isNumber = isTypeof("number");
export const isFunction = isTypeof("function");
export const isObject = isTypeof("object");

export const isObjectOf = <K extends Any.Key, V>(isKey: Guard<unknown, K>, isValue: Guard<unknown, V>) =>
    (val: unknown): val is { [P in K]: V } => isObject(val) && objectKeys(val).every(isKey) && objectValues(val).every(isValue);

type Ctor<T> = (...args: any[]) => T;
export const isInstanceof = <T>(expected: Ctor<T>) => (val: unknown): val is T => val instanceof expected;
export const isRegexp = isInstanceof(RegExp);

export const isEither = <Guards extends Guard<any, unknown>[]>(...guards: Guards) => (val: GuardArrInput<Guards>): val is GuardArrOutput<Guards> => guards.some(g => g(val));

export const hasProp = <P extends string>(prop: P) => <T>(val: T): val is T & { [p in P]: unknown } => Boolean(val) && typeof val === "object" && prop in val;

const hasThen = hasProp("then");
export const isPromiseLike = (val: unknown): val is PromiseLike<unknown> => hasThen(val) && typeof val.then === "function";

export const unexpected = (val: never): never => { throw new Error(`Unexpected value: ${ inspect(val) }`); };
