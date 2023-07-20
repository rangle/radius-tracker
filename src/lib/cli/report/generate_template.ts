import { defineYargsModule } from "../util/defineYargsModule";
import { asyncExec } from "./async_exec";
import { join } from "path";
import { platform } from "os";

// This default determines which report is added to the package at build time.
// After updating the url, run `yarn cli report-generate-template` and make sure to check that
// a) the report itself is working correctly,
// b) there are no errors in the browser console, and no dom nodes marked with `observablehq-error` class
// c) no network requests go outside of localhost.
const defaultReportUrl = "https://api.observablehq.com/@smoogly/design-system-metrics@452.tgz?v=3";

export default defineYargsModule(
    "report-generate-template [url]",
    "Prepare a template for static reports from an ObservableHQ page",
    args => args
        .positional("url", {
            type: "string",
            default: defaultReportUrl,
            describe: "URL of the report to use for the template",
            demandOption: false,
        }),
    async args => {
        const supportedPlatforms = ["linux", "darwin"];
        if (!supportedPlatforms.includes(platform())) {
            throw new Error(`Current implementation of the report template generator only supports ${ supportedPlatforms.join(", ") }, instead got ${ platform() }`);
        }

        if (!isUrl(args.url)) {
            throw new Error(`Expected a valid URL, instead got: ${ args.url }`);
        }

        const customTemplateMessage = `
            Custom report templates API is unstable.
            Use at your own risk and please report issues.
        `.replace(/\n(?!\n)\s+/g, "\n");

        try {
            await asyncExec(`${ join(__dirname, "generate_report_template.sh") } ${ args.url }`);
            console.log("\n\nReport template written to build/report_template\n");
            if (args.url !== defaultReportUrl) {
                console.log(customTemplateMessage);
            }
            console.log("\n");
        } catch (e) {
            if (args.url !== defaultReportUrl) {
                // Print the custom template warning
                process.on("exit", () => console.log(customTemplateMessage));
            }

            throw e;
        }
    },
);

const isUrl = (url: string) => {
    try {
        return Boolean(new URL(url));
    } catch (e) {
        return false;
    }
};
