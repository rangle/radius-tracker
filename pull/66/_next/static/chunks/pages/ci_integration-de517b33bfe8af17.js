(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[209],{8561:function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/ci_integration",function(){return n(2703)}])},8177:function(e,t,n){"use strict";var r=n(5893),i=n(1163);let a="https://github.com/rangle/radius-tracker",o={target:"_blank",rel:"noopener noreferrer"};t.Z={logo:(0,r.jsx)("span",{children:"Radius Tracker"}),project:{link:a},docsRepositoryBase:a,feedback:{content:"Give feedback about this page →"},editLink:{text:"Edit on Github →",component:function(e){let{className:t,filePath:n,children:i}=e,s="".concat(a,"/src/docs/").concat(n);return(0,r.jsx)("a",{className:t,href:s,...o,children:i})}},toc:{extraContent:(()=>{let e=Object.entries({how_we_can_help:"Other",tell_us_a_bit_more_about_your_inquiry:"I want help setting up Radius Tracker in my organization"}).reduce((e,t)=>{let[n,r]=t;return[...e,"".concat(n,"=").concat(encodeURIComponent(r))]},[]).join("&");return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("style",{children:"\n                    .rangle-contact-us {\n                        padding: 16px 0 48px 0;\n                        color: #D44527;\n                        transition: color 0.15s;\n                    }\n                    \n                    .rangle-contact-us:hover {\n                        color: #262626;\n                    }\n                    html[class~=dark] .rangle-contact-us:hover {\n                        color: #F3F4F6;\n                    }\n                "}),(0,r.jsx)("a",{className:"rangle-contact-us",href:"https://rangle.io/contact-us?utm_source=tracker&".concat(e),...o,children:"Get Rangle to help set up Tracker in your organization →"})]})})()},footer:{text:(0,r.jsxs)("span",{children:[new Date().getFullYear()," ",(0,r.jsx)("a",{href:"https://rangle.io?utm_source=tracker",...o,children:"Rangle.io"})]})},head:(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("meta",{name:"msapplication-TileColor",content:"#fff"}),(0,r.jsx)("meta",{httpEquiv:"Content-Language",content:"en"}),(0,r.jsx)("meta",{name:"apple-mobile-web-app-title",content:"Tracker docs"})]}),useNextSeoProps(){let{asPath:e}=(0,i.useRouter)();return{titleTemplate:"/"!==e?"%s – Radius Tracker":"%s"}}}},2703:function(e,t,n){"use strict";n.r(t),n.d(t,{default:function(){return c.Z}});var r=n(5893),i=n(8808),a=n(7928),o=n(8177);n(5513);var s=n(1151);n(5675);var c=n(2243);function l(e){let t=Object.assign({h1:"h1",p:"p",a:"a",h2:"h2",code:"code",pre:"pre",span:"span"},(0,s.ah)(),e.components);return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.h1,{children:"CI Integration"}),"\n",(0,r.jsxs)(t.p,{children:["We designed Tracker to run on schedule in CI so that the team can routinely review the design system adoption progress.\nFor example, in Github Actions you can use ",(0,r.jsx)(t.a,{href:"https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule",children:"the schedule trigger."})]}),"\n",(0,r.jsxs)(t.p,{children:["Tracker takes a snapshot of the latest state of the codebase and weekly snapshots of each project's history.\nWeekly snapshots are aligned with the latest commit as of ",(0,r.jsx)(t.a,{href:"https://github.com/rangle/radius-tracker/blob/17da736e27f325ec3fa7c920b85fd645a0a81a0a/src/lib/cli/timelines/getTimelineForOneRepo.ts#L75",children:"midnight on Saturday every week."})]}),"\n",(0,r.jsx)(t.p,{children:"We recommend scheduling Tracker to run a day or two before the rituals where the team reviews the progress."}),"\n",(0,r.jsx)(t.h2,{id:"artifacts",children:"Artifacts"}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.a,{href:"./analysis",children:"Tracker outputs"})," are self-contained and can be archived.\nWe suggest generating and storing a report for reference using ",(0,r.jsx)(t.a,{href:"https://github.com/actions/upload-artifact",children:"Upload Artifact"}),"\nGithub Action or a similar step in your CI."]}),"\n",(0,r.jsx)(t.h2,{id:"cache",children:"Cache"}),"\n",(0,r.jsx)(t.p,{children:"Running static code analysis of an entire organizational ecosystem history takes considerable time."}),"\n",(0,r.jsxs)(t.p,{children:["Tracker writes intermediary results per project per commit into a specified ",(0,r.jsx)(t.code,{children:"--cacheDir"}),".\nBy default, the cache is written to ",(0,r.jsx)(t.code,{children:"radius-tracker-cache/cache"})]}),"\n",(0,r.jsx)(t.p,{children:"Saving and restoring the cache between tracker runs will save significant CPU time\nby avoiding the re-processing of historical commits."}),"\n",(0,r.jsxs)(t.p,{children:["Cache content is versioned with a constant from ",(0,r.jsx)(t.a,{href:"https://github.com/rangle/radius-tracker/blob/c7651f30864b50584587ebd1c75907e11d413a2a/src/lib/cli/util/cacheVersion.ts",children:(0,r.jsx)(t.code,{children:"src/lib/cli/util/cacheVersion.ts"})}),"\n— you can use a hash of that file as the cache key. For example,\nin Github Actions you can use ",(0,r.jsx)(t.code,{children:"hashFiles('**/cacheVersion.ts')"})]}),"\n",(0,r.jsx)(t.h2,{id:"resource-consumption",children:"Resource consumption"}),"\n",(0,r.jsx)(t.p,{children:"Static code analysis is resource-heavy. Tracker can take hours to run, especially without cache,\nwhen processing a project for the first time. Please provide sufficient CPU and Memory,\nand ensure that your CI runner doesn't kill the Tracker task too early."}),"\n",(0,r.jsx)(t.p,{children:"CPU time is a primary limiting factor for Tracker. It runs multiple child processes,\neach analyzing a single commit, to better utilize available CPUs."}),"\n",(0,r.jsx)(t.p,{children:"Tracker allocates a minimum of 2GB of Memory per child process, so the number of child processes might be limited\non machines with low total memory."}),"\n",(0,r.jsx)(t.p,{children:"On top of potentially significant amounts of cache, Tracker fetches all the projects specified in the config file\nand creates a copy per thread. Make sure there is enough disk space for Tracker to run."}),"\n",(0,r.jsx)(t.h2,{id:"restricting-network-access",children:"Restricting network access"}),"\n",(0,r.jsx)(t.p,{children:"Tracker requires no network access to run beyond fetching the git repos.\nConsider fetching the project repos to the local filesystem and clamping down the firewall\nbefore running or even installing Tracker to eliminate the potential for leaking the analyzed codebase."}),"\n",(0,r.jsx)(t.p,{children:"Alternatively, you can limit network access to only allow outgoing connections to the git hosting."}),"\n",(0,r.jsx)(t.h2,{id:"automated-project-discovery",children:"Automated project discovery"}),"\n",(0,r.jsx)(t.p,{children:"Depending on the git hosting platform, you might be able to automatically discover\nnew UI projects in the organization ecosystem."}),"\n",(0,r.jsxs)(t.p,{children:["For example, you can use ",(0,r.jsx)(t.a,{href:"https://docs.github.com/en/rest/search?apiVersion=2022-11-28#search-code",children:"Github Search API"}),"\nto search for ",(0,r.jsx)(t.code,{children:"package.json"})," files containing a reference to your design system or frontend frameworks:"]}),"\n",(0,r.jsx)(t.pre,{"data-language":"text","data-theme":"default",children:(0,r.jsx)(t.code,{"data-language":"text","data-theme":"default",children:(0,r.jsx)(t.span,{className:"line",children:(0,r.jsx)(t.span,{style:{color:"var(--shiki-color-text)"},children:"org:<your_organization>+in:file+filename:package.json+language:json+<your_design_system_package>"})})})}),"\n",(0,r.jsxs)(t.p,{children:["You can then programmatically generate ",(0,r.jsx)(t.a,{href:"./configuration_file",children:"the config file"})," using the list of discovered projects."]})]})}e=n.hmd(e),(0,i.j)({Content:function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},{wrapper:t}=Object.assign({},(0,s.ah)(),e.components);return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(l,{...e})}):l(e)},nextraLayout:a.ZP,hot:e.hot,pageOpts:{filePath:"pages/ci_integration.md",route:"/ci_integration",frontMatter:{title:"CI Integration",description:"Integrate Radius Tracker into your team workflows by running it on schedule in CI. Learn best practices around caching, storing artifacts, and securing the codebase during processing."},pageMap:[{kind:"Meta",data:{index:{title:"Radius Tracker",theme:{breadcrumb:!1}},quick_start:{title:"Quick start",theme:{breadcrumb:!1}},analysis:{title:"Analysing the output",theme:{breadcrumb:!1}},supported_technologies:{title:"Supported technologies",theme:{breadcrumb:!1}},configuration_file:{title:"Configuration file",theme:{breadcrumb:!1}},ci_integration:{title:"CI Integration",theme:{breadcrumb:!1}}}},{kind:"MdxPage",name:"analysis",route:"/analysis",frontMatter:{title:"Analyzing the output",description:"Analyze the adoption of your design system with the built-in Radius Tracker report or external tools. Learn to generate a Tracker report from your data."}},{kind:"MdxPage",name:"ci_integration",route:"/ci_integration",frontMatter:{title:"CI Integration",description:"Integrate Radius Tracker into your team workflows by running it on schedule in CI. Learn best practices around caching, storing artifacts, and securing the codebase during processing."}},{kind:"MdxPage",name:"configuration_file",route:"/configuration_file",frontMatter:{title:"Tracker configuration",description:"Configuration file for Radius Tracker describes where to find and how to analyze each project in your organization's ecosystem. Learn to improve tracking performance & remove junk from the output."}},{kind:"MdxPage",name:"index",route:"/",frontMatter:{title:"Radius Tracker",description:"Track every use of every component in every codebase in your company. Automatically generate design system adoption reports calculated bottom-up from individual component usage stats."}},{kind:"MdxPage",name:"quick_start",route:"/quick_start",frontMatter:{title:"Quick start",description:"Run Radius Tracker for the first time and see the first report."}},{kind:"MdxPage",name:"supported_technologies",route:"/supported_technologies",frontMatter:{title:"Supported technologies",description:"Radius Tracker supports React with a few limitations around CSS-in-JS styling."}}],headings:[{depth:1,value:"CI Integration",id:"ci-integration"},{depth:2,value:"Artifacts",id:"artifacts"},{depth:2,value:"Cache",id:"cache"},{depth:2,value:"Resource consumption",id:"resource-consumption"},{depth:2,value:"Restricting network access",id:"restricting-network-access"},{depth:2,value:"Automated project discovery",id:"automated-project-discovery"}],flexsearch:{codeblocks:!0},title:"CI Integration"},themeConfig:o.Z,pageNextRoute:"/ci_integration",pageOptsChecksum:void 0,dynamicMetaModules:[]})}},function(e){e.O(0,[774,254,888,179],function(){return e(e.s=8561)}),_N_E=e.O()}]);