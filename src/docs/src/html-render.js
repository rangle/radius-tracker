import Markdoc from "@markdoc/markdoc";
export const htmlRender = (key, value) => {
    const ast = Markdoc.parse(value);
    const content = Markdoc.transform(ast);
    const html = Markdoc.renderers.html(content);
    // eslint-disable-next-line no-undef
    document.getElementById(key).innerHTML = html;
};
