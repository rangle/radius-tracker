import Markdoc from "@markdoc/markdoc";

const source = " # What is Markdoc? ";

const ast = Markdoc.parse(source);
const content = Markdoc.transform(ast);

const html = Markdoc.renderers.html(content);

// eslint-disable-next-line no-undef
document.getElementById("markdoc").innerHTML = html;
