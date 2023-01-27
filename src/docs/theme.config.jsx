const repoUrl = "https://github.com/rangle/radius-tracker";

export default {
    logo: <span>Radius Tracker</span>,
    project: {
        link: repoUrl,
    },

    docsRepositoryBase: repoUrl,

    editLink: {
        component: function EditLink({ className, filePath, children }) {
            // Pages aren't hosted at the top level, need to rewrite the path
            const editUrl = `${ repoUrl }/src/docs/${ filePath }`;
            return <a className={className} href={editUrl}>{children}</a>;
        },
    },

    toc: {
        extraContent: null,
    },
};
