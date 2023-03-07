import { useRouter } from "next/router";

const repoUrl = "https://github.com/rangle/radius-tracker";

const targetBlankProps = {
    target: "_blank",
    rel: "noopener noreferrer",
};

export default {
    logo: <span>Radius Tracker</span>,
    project: {
        link: repoUrl,
    },

    docsRepositoryBase: repoUrl,
    feedback: {
        content: "Give feedback about this page →",
    },

    editLink: {
        text: "Edit on Github →",
        component: function EditLink({ className, filePath, children }) {
            // Pages aren't hosted at the top level, need to rewrite the path
            const editUrl = `${ repoUrl }/src/docs/${ filePath }`;
            return <a className={ className } href={ editUrl } { ...targetBlankProps }>{ children }</a>;
        },
    },

    toc: {
        extraContent: (() => {
            const prefill = Object.entries({
                how_we_can_help: "Other",
                tell_us_a_bit_more_about_your_inquiry: "I want help setting up Radius Tracker in my organization",
            }).reduce((params, [key, val]) => [...params, `${ key }=${ encodeURIComponent(val) }`], []).join("&");

            return <>
                <style>{`
                    .rangle-contact-us {
                        padding: 16px 0 48px 0;
                        color: #D44527;
                        transition: color 0.15s;
                    }
                    
                    .rangle-contact-us:hover {
                        color: #262626;
                    }
                    html[class~=dark] .rangle-contact-us:hover {
                        color: #F3F4F6;
                    }
                `}</style>
                <a
                    className="rangle-contact-us"
                    href={ `https://rangle.io/contact-us?utm_source=tracker&${ prefill }` }
                    { ...targetBlankProps }>
                    Get Rangle to help set up Tracker in your organization →
                </a>
            </>;
        })(),
    },

    footer: {
        text: <span>{ new Date().getFullYear() } <a
            href="https://rangle.io?utm_source=tracker" { ...targetBlankProps }>
                Rangle.io
        </a></span>,
    },

    // Overwrite default `head` to remove Nextra SEO metadata
    head: <>
        <meta name="msapplication-TileColor" content="#fff" />
        <meta httpEquiv="Content-Language" content="en" />
        <meta name="apple-mobile-web-app-title" content="Tracker docs" />
    </>,

    useNextSeoProps() {
        const { asPath } = useRouter();
        return {
            titleTemplate: asPath !== "/" ? "%s – Radius Tracker" : "%s",
        };
    },
};
