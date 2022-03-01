const spelling = (count: number, text: { one: string, many: string }) => {
    if (count === 0) { return text.many; }
    if (count === 1) { return text.one; }
    return text.many;
};
export const spell = (text: { one: string, many: string }) => (count: number) => `${ count } ${ spelling(count, text) }`;
