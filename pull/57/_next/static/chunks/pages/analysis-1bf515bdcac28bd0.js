(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[261],{4595:function(e,t,r){(window.__NEXT_P=window.__NEXT_P||[]).push(["/analysis",function(){return r(4841)}])},8177:function(e,t,r){"use strict";var a=r(5893),n=r(1163);let o="https://github.com/rangle/radius-tracker",s={target:"_blank",rel:"noopener noreferrer"};t.Z={logo:(0,a.jsx)("span",{children:"Radius Tracker"}),project:{link:o},docsRepositoryBase:o,feedback:{content:"Give feedback about this page →"},editLink:{text:"Edit on Github →",component:function(e){let{className:t,filePath:r,children:n}=e,i="".concat(o,"/src/docs/").concat(r);return(0,a.jsx)("a",{className:t,href:i,...s,children:n})}},toc:{extraContent:(()=>{let e=Object.entries({how_we_can_help:"Other",tell_us_a_bit_more_about_your_inquiry:"I want help setting up Radius Tracker in my organization"}).reduce((e,t)=>{let[r,a]=t;return[...e,"".concat(r,"=").concat(encodeURIComponent(a))]},[]).join("&");return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)("style",{children:"\n                    .rangle-contact-us {\n                        padding: 16px 0 48px 0;\n                        color: #D44527;\n                        transition: color 0.15s;\n                    }\n                    \n                    .rangle-contact-us:hover {\n                        color: #262626;\n                    }\n                    html[class~=dark] .rangle-contact-us:hover {\n                        color: #F3F4F6;\n                    }\n                "}),(0,a.jsx)("a",{className:"rangle-contact-us",href:"https://rangle.io/contact-us?utm_source=tracker&".concat(e),...s,children:"Get Rangle to help set up Tracker in your organization →"})]})})()},footer:{text:(0,a.jsxs)("span",{children:[new Date().getFullYear()," ",(0,a.jsx)("a",{href:"https://rangle.io?utm_source=tracker",...s,children:"Rangle.io"})]})},head:(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)("meta",{name:"msapplication-TileColor",content:"#fff"}),(0,a.jsx)("meta",{httpEquiv:"Content-Language",content:"en"}),(0,a.jsx)("meta",{name:"apple-mobile-web-app-title",content:"Tracker docs"})]}),useNextSeoProps(){let{asPath:e}=(0,n.useRouter)();return{titleTemplate:"/"!==e?"%s – Radius Tracker":"%s"}}}},4841:function(e,t,r){"use strict";r.r(t),r.d(t,{default:function(){return l.Z}});var a=r(5893),n=r(8808),o=r(7928),s=r(8177);r(5513);var i=r(1151);r(5675);var l=r(2243);function c(e){let t=Object.assign({h1:"h1",p:"p",code:"code",h2:"h2",pre:"pre",span:"span",a:"a",ol:"ol",li:"li"},(0,i.ah)(),e.components);return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(t.h1,{children:"Analyzing the output"}),"\n",(0,a.jsxs)(t.p,{children:["Tracker generates an SQLite database with entries for each detected component usage and,\nby default, writes it to ",(0,a.jsx)(t.code,{children:"usages.sqlite"})," in the current directory. You have a few ways to visualize this data."]}),"\n",(0,a.jsx)(t.h2,{id:"local-report",children:"Local report"}),"\n",(0,a.jsx)(t.p,{children:"The easiest way to visualize the Tracker data is by generating a report using"}),"\n",(0,a.jsx)(t.pre,{"data-language":"sh","data-theme":"default",children:(0,a.jsx)(t.code,{"data-language":"sh","data-theme":"default",children:(0,a.jsxs)(t.span,{className:"line",children:[(0,a.jsx)(t.span,{style:{color:"var(--shiki-color-text)"},children:"npx "}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-token-string)"},children:"radius-tracker"}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-color-text)"},children:" "}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-token-string)"},children:"report"})]})})}),"\n",(0,a.jsxs)(t.p,{children:["To view, host the report files on an http server,\nfor example, using ",(0,a.jsx)(t.code,{children:"npx serve ./radius-tracker-report"})," on a local machine."]}),"\n",(0,a.jsxs)(t.p,{children:["This report is entirely self-contained without external references.\nSee the ",(0,a.jsx)(t.a,{href:"./ci_integration",children:"CI integration guide"})," for archiving."]}),"\n",(0,a.jsx)(t.h2,{id:"observablehq",children:"ObservableHQ"}),"\n",(0,a.jsxs)(t.p,{children:["We are using the ",(0,a.jsx)(t.a,{href:"https://observablehq.com/@smoogly/design-system-metrics",children:"sample ObservableHQ report"}),"\nas a template for the local reports. To make changes in that report:"]}),"\n",(0,a.jsxs)(t.ol,{children:["\n",(0,a.jsxs)(t.li,{children:["Fork the ",(0,a.jsx)(t.a,{href:"https://observablehq.com/@smoogly/design-system-metrics",children:"sample report"})]}),"\n",(0,a.jsx)(t.li,{children:"Replace the attached database with the Tracker database you generated"}),"\n"]}),"\n",(0,a.jsx)(t.h2,{id:"custom-templates-for-local-reports",children:"Custom templates for local reports"}),"\n",(0,a.jsxs)(t.p,{children:["You can use a fork of an ObservableHQ report as a template for a local report generator.\nSee above for forking the default report. Get an export link from ",(0,a.jsx)(t.code,{children:"Export → Download code"})," of a report you want to use.\nSee ",(0,a.jsx)(t.a,{href:"https://observablehq.com/@observablehq/advanced-embeds#cell-291",children:"ObservableHQ export documentation"})," for details."]}),"\n",(0,a.jsx)(t.p,{children:"Paste the link into the following command to generate a report template:"}),"\n",(0,a.jsx)(t.pre,{"data-language":"sh","data-theme":"default",children:(0,a.jsx)(t.code,{"data-language":"sh","data-theme":"default",children:(0,a.jsxs)(t.span,{className:"line",children:[(0,a.jsx)(t.span,{style:{color:"var(--shiki-color-text)"},children:"npx "}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-token-string)"},children:"radius-tracker"}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-color-text)"},children:" "}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-token-string)"},children:"report-generate-template"}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-color-text)"},children:" "}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-token-string)"},children:"https://your-export-url"})]})})}),"\n",(0,a.jsx)(t.p,{children:"You can then generate the report using your template:"}),"\n",(0,a.jsx)(t.pre,{"data-language":"sh","data-theme":"default",children:(0,a.jsx)(t.code,{"data-language":"sh","data-theme":"default",children:(0,a.jsxs)(t.span,{className:"line",children:[(0,a.jsx)(t.span,{style:{color:"var(--shiki-color-text)"},children:"npx "}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-token-string)"},children:"radius-tracker"}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-color-text)"},children:" "}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-token-string)"},children:"report"}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-color-text)"},children:" "}),(0,a.jsx)(t.span,{style:{color:"var(--shiki-token-string)"},children:"--template=./path/to/template"})]})})}),"\n",(0,a.jsx)(t.p,{children:"While this is the same mechanism we use to generate the bundled report template, this is an experimental feature.\nReport templates are supposed to be self-contained, and the generator is tightly coupled with the default report\nto support that. The API of the report generator is unstable, and there's no guarantee that it will work for you."}),"\n",(0,a.jsx)(t.h2,{id:"alternative-reporting-tools",children:"Alternative reporting tools"}),"\n",(0,a.jsx)(t.p,{children:"If you want to run an analysis not covered by the default Tracker report, you can connect the usages database\nto various data analysis tools."}),"\n",(0,a.jsxs)(t.p,{children:["Both Tableau and Power BI support SQLite as a data source using an ",(0,a.jsx)(t.a,{href:"http://www.ch-werner.de/sqliteodbc/",children:"SQLite ODBC Driver."}),"\nTake a look at the ",(0,a.jsx)(t.a,{href:"https://help.tableau.com/current/pro/desktop/en-us/odbc_customize.htm",children:"documentation for Tableau"}),"\nand for ",(0,a.jsx)(t.a,{href:"https://learn.microsoft.com/en-us/power-query/connect-using-generic-interfaces#data-sources-accessible-through-odbc",children:"Power BI."})]}),"\n",(0,a.jsxs)(t.p,{children:["Keep track of the ",(0,a.jsx)(t.a,{href:"https://github.com/rangle/radius-tracker/blob/17da736e27f325ec3fa7c920b85fd645a0a81a0a/src/lib/cli/processStats.ts#L25",children:(0,a.jsx)(t.code,{children:"schemaVersion"})}),"\nin the ",(0,a.jsx)(t.code,{children:"meta"})," table — your reports might need to be updated if the schema changes between Tracker version upgrades."]})]})}e=r.hmd(e),(0,n.j)({Content:function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},{wrapper:t}=Object.assign({},(0,i.ah)(),e.components);return t?(0,a.jsx)(t,{...e,children:(0,a.jsx)(c,{...e})}):c(e)},nextraLayout:o.ZP,hot:e.hot,pageOpts:{filePath:"pages/analysis.md",route:"/analysis",frontMatter:{title:"Analyzing the output",description:"Analyze the adoption of your design system with the built-in Radius Tracker report or external tools. Learn to generate a Tracker report from your data."},pageMap:[{kind:"Meta",data:{index:{title:"Radius Tracker",theme:{breadcrumb:!1}},quick_start:{title:"Quick start",theme:{breadcrumb:!1}},analysis:{title:"Analysing the output",theme:{breadcrumb:!1}},supported_technologies:{title:"Supported technologies",theme:{breadcrumb:!1}},configuration_file:{title:"Configuration file",theme:{breadcrumb:!1}},ci_integration:{title:"CI Integration",theme:{breadcrumb:!1}}}},{kind:"MdxPage",name:"analysis",route:"/analysis",frontMatter:{title:"Analyzing the output",description:"Analyze the adoption of your design system with the built-in Radius Tracker report or external tools. Learn to generate a Tracker report from your data."}},{kind:"MdxPage",name:"ci_integration",route:"/ci_integration",frontMatter:{title:"CI Integration",description:"Integrate Radius Tracker into your team workflows by running it on schedule in CI. Learn best practices around caching, storing artifacts, and securing the codebase during processing."}},{kind:"MdxPage",name:"configuration_file",route:"/configuration_file",frontMatter:{title:"Tracker configuration",description:"Configuration file for Radius Tracker describes where to find and how to analyze each project in your organization's ecosystem. Learn to improve tracking performance & remove junk from the output."}},{kind:"MdxPage",name:"index",route:"/",frontMatter:{title:"Radius Tracker",description:"Track every use of every component in every codebase in your company. Automatically generate design system adoption reports calculated bottom-up from individual component usage stats."}},{kind:"MdxPage",name:"quick_start",route:"/quick_start",frontMatter:{title:"Quick start",description:"Run Radius Tracker for the first time and see the first report."}},{kind:"MdxPage",name:"supported_technologies",route:"/supported_technologies",frontMatter:{title:"Supported technologies",description:"Radius Tracker supports React with a few limitations around CSS-in-JS styling."}}],headings:[{depth:1,value:"Analyzing the output",id:"analyzing-the-output"},{depth:2,value:"Local report",id:"local-report"},{depth:2,value:"ObservableHQ",id:"observablehq"},{depth:2,value:"Custom templates for local reports",id:"custom-templates-for-local-reports"},{depth:2,value:"Alternative reporting tools",id:"alternative-reporting-tools"}],flexsearch:{codeblocks:!0},title:"Analyzing the output"},themeConfig:s.Z,pageNextRoute:"/analysis",pageOptsChecksum:void 0,dynamicMetaModules:[]})}},function(e){e.O(0,[774,254,888,179],function(){return e(e.s=4595)}),_N_E=e.O()}]);