export const stringifyError = (err: unknown) => err instanceof Error
    ? `${ err.message }:\n${ err.stack }`
    : Object.prototype.toString.call(err);
