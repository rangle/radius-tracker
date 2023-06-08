import { WorkerConfig } from "../timelines/workerTypes";

// The config in this file describes grafana ecosystem, found to the best of my ability.
// It is used to test the Tracker end-to-end, and generate the sample report.

const targets = {
    grafana: /^@grafana\/ui(?!.*\.s?css$)/,
    ant: /^(antd|@ant-design)/,
    mui: /^(@mui|@material-ui)/,
    chakra: /^chakra-ui/,
    headlessui: /^@headlessui/,
    bootstrap: /^react-bootstrap/,
    visx: /^@visx/,
    spectrum: /^@adobe\/react-spectrum/,
    "iot-app-kit": /^@iot-app-kit/,
    nivo: /^@nivo/,
    primereact: /^primereact/,
    rc: /^rc-/, // https://react-component.github.io/
    reactstrap: /^reactstrap/,
    mantine: /^@mantine/,
};

const since = new Date("2018-04-01");
const maxDate = (a: Date, b: Date) => a > b ? a : b;
const samples: WorkerConfig[] = [ // TODO: specify ts/js configs explicitly where necessary
    {
        repoUrl: "https://github.com/grafana/grafana.git",
        subprojectPath: "/",
        isTargetModuleOrPath: {
            ...targets,
            grafana: /((^@grafana\/ui)|(\/packages\/grafana-ui))(?!.*\.scss$)/, // @grafana/ui or /packages/grafana-ui
        },
        since,
    },
    {
        repoUrl: "ssh://git@github.com/percona/grafana-dashboards.git", // Example of an SSH url
        subprojectPath: "/pmm-app",
        isTargetModuleOrPath: targets,
        since: maxDate(
            new Date("2017-11-19"), // There's no `pmm-app` folder before then
            since,
        ),
    },

    // Github code search for `in:file+path:/+filename:package.json+grafana+ui+NOT+datasource`
    // Having `@grafana/ui` in package.json
    ...[
        "2664551618/iac-mixgraph-panel",
        // "ACE-IoT-Solutions/ace-svg-react", Duplicate
        "Aris-1712/grafan-plugin",
        "Armalon/GiphySearcherPanelPlugin",
        "AutohomeCorp/autohome-compareQueries-datasource",
        "Betula-L/grafana-starter-panel",
        "Bujupah/grafana-smart-map",
        "CarlosGallardo97/grafana-echarts-clock-panel",
        "Chipazawra/v-8-1-c-cluster-live-telemetry-plugin",
        "CopperHill-Consulting/grafana-chartjs-panel",
        "CopperHill-Consulting/grafana-customTables-panel",
        "CorpGlory/grafana-panel-react-ts-webpack-template",
        "Dalvany/dalvany-image-app",
        // "Dalvany/dalvany-image-panel", Duplicate
        "DarminZ/grafana-panel-pulgin",
        "DavidMarom/grafana-plugin",
        "Enapter/telemetry-grafana-datasource-plugin",
        "Exsensio-Ltd/OEEGrafanaVisualizer",
        "Fondus/Grafana-JsonPretty-Panel",
        "G-Core/cdn-stats-datasource-plugin",
        "GMaykode/zfana",
        "Genius-pig/iotdb",
        "GlobalNOC/globalnoc-worldview-panel",
        // "Gowee/traceroute-map-panel", Duplicate
        // "IntegrationMatters/integrationmatters-comparison-panel", Duplicate
        "IntegrationMatters/integrationmatters-history-panel",
        "IntegrationMatters/integrationmatters-spot-panel",
        "IsmaelMasharo/sankey-panel",
        "JacquesUys-Hartree/grafana-panel",
        "JacquesUys-Hartree/grafana-ui-ts",
        // "JeanBaptisteWATENBERG/grafana-percent-plus", Duplicate
        "KWMSys/GrafanaPlaceholder",
        "KWMSys/GrafanaSensorDataSource",
        "KnightMode/spikeGrafanaPlugin",
        // "LucasArona/larona-epict-panel", Duplicate
        "LukasPatzke/grafana-direction-panel",
        "MAFRUHA-LEAVIN/Grafana-React",
        "MKortmann/Grafana-Plugins",
        "MackoLysy/Grafana-Bazel",
        // "MacroPower/macropower-analytics-panel", Duplicate
        "MaheshKhanal/netsage-react-bumpchart",
        // "Maisy/grafana-plugin-test", Removed or private repo
        "Maniarr/grafana-warp10-backend",
        // "NatelEnergy/grafana-discrete-panel", Duplicate
        // "OpenNMS/opennms-helm", Duplicate
        "RAM92/grafana-mui-5-panel-issue",
        // "RedisGrafana/grafana-redis-app", Duplicate
        // "RedisGrafana/grafana-redis-explorer", Duplicate
        // "SSKGo/perfcurve-panel", Duplicate
        "Satishpal93/new_design",
        "Server-Eye/grafana-plugin",
        "ShamefulOdin31/dummy-plugin",
        "ShayMoshe/grafana-mapbox-panel-plugin",
        "SilkeDH/es-plotly-histogram",
        // "TobiasI2001/TrafficLightsRevival", Removed or private repo
        "VolkovLabs/volkovlabs-abc-app",
        "VolkovLabs/volkovlabs-abc-panel",
        // "VolkovLabs/volkovlabs-image-panel", Duplicate
        "Vunet-Systems/Insight-Card-Panel",
        "Vunet-Systems/Matrix-Visualization",
        "Vunet-Systems/color-table",
        "WebDevelopUa/grafana-panel-plugin",
        "Webbeh/edelblack-mqtt-panel",
        "Yash2017/final",
        "ae3e/ae3e-html-panel",
        // "ae3e/ae3e-plotly-panel", Duplicate
        "akenza-io/gf-grafana-connector",
        "akenza-io/grafana-connector",
        "akenza-io/grafana-connector-v3",
        "alefranklin/grafana-plugin-test",
        // "alexandrainst/alexandra-trackmap-panel", Duplicate
        // "algenty/grafana-flowcharting", Duplicate
        "ampx/grafana-json-button",
        "apnaremi/grafanatest",
        // "arkazantsev8/grafana-react-echarts-panel", Removed or private repo
        // "arkazantsev8/grafana-react-table", Removed or private repo
        "arrisde/map-select-panel",
        "asukaji/my-grafana-plugin",
        "atosorigin/grafana-weathermap-panel",
        // "auxmoney/grafana-waterfall-panel", Duplicate
        "baltop/grafana-starter",
        "basraven/kafka-d3",
        "benmizrahi/super-bigquery-plugin",
        "bkurtz/grafana-map-panel",
        // "boazreicher/mosaic-plot", Duplicate
        // "boazreicher/sierra-plot", Duplicate
        "bureau14/qdb-grafana-plugin",
        "cagrafana/ca-grafana-hierarchy",
        "chartwerk/grafana-chartwerk-app",
        // "cloudspout/cloudspout-button-panel", Duplicate
        "connectall/connectall-grafana-hierarchy",
        "coolxv/live-streams-panel",
        "cozzyd/interposcatter",
        "crystaldust/github-profile-plugin",
        "danesherbs/carbon-footprint-plugin",
        "davidraker/VUISetPointPanel",
        "dbouchierarcad/simple-react-panel",
        "dev2019zheng/my-grafana-plugin",
        "diebietse/grafana-mqtt",
        "dirk-ecker/grafana-timestamp-image-panel",
        "drbcomua/grafana-map-test",
        "dwaynebradley/color-skycons-panel",
        "e-dard/influxdb-iox-grafana",
        "eaTong/eatong-grafana-biz",
        "eabaci/panel-template-plugin",
        "easy-global-market/grafana-ngsild-plugin",
        "edgedb/edgedb-grafana-frontend",
        "elabpro/dataops-grafana-qr",
        "enricotuzzafincons/UseCaseTable",
        "ertis-research/digital-twins-plugin-for-Grafana",
        "ertis-research/unity-plugin-for-Grafana",
        "eswestra/HeatSeries",
        // "eyousefifar/grafana-datasource-plugin-tutorial", Removed or private repo
        // "factrylabs/untimely-grafana-panel", Duplicate
        "fcortes/grafana-photo-grid",
        "fernandoelger/alert-list",
        "fiammettacannavo/ModuloInterno",
        // "flant/grafana-statusmap", Duplicate
        "fmarslan/solr-plugin-grafana",
        "fongfai/grafana-ui-graph",
        "freecoop/grafana-echarts-panel",
        "fusioncharts/grafana-fusionexport",
        "fw-dev/piechart-panel",
        "fylip97/Thesis",
        "ganadara135/liregression",
        "ganadara135/panalPluginLR",
        "geeks-r-us/mqtt-panel",
        "geogo-in/Barchart-grafana-panel-plugin",
        "geogo-in/Custom-barchart-plugin",
        "golioth/grafana-websocket-plugin",
        "gordonturner/gordonturner-external-ip-panel",
        // "grafana/clock-panel", Duplicate
        // "grafana/grafana-polystat-panel", Duplicate
        // "grafana/grafana-sensu-app", // TODO: problem resolving external libs committed to source code
        // "grafana/grafana-starter-panel", Duplicate
        "grafana/kentik-app",
        // "grafana/perspective-panel", Duplicate
        // "grafana/piechart-panel", Duplicate
        // "grafana/simple-angular-panel", Not React
        "hadrianl/highcharts-plugin",
        // "hai2007/grafana-panel-radar", Removed or private repo
        "hatlabs/grafana-polar-timeseries",
        "hslayers/grafana-plugin",
        "huaweicloud/cloudeye-grafana",
        "hugoattal/grafana-mongodb-plugin",
        "icn-team/grafana-topology-plugin",
        "ifrost/o11ywood",
        // "innius/grafana-video-panel", Duplicate
        "io-systems/gersscipal-suivi-now-panel",
        "io-systems/gersscipal-suivi-opened-time-panel",
        // "isaozler/grafana-shift-selector", Duplicate
        // "isaozler/pareto-chart", Duplicate
        "iuricmp/grafana-iot-map-panel",
        "jackw/grafana-plugin-federated",
        "jackw/grafana-test-plugin",
        "jahzeelamador/Parallel-Aqi",
        "jayhuynh/bar-chart",
        "jbguerraz/druid-grafana",
        // "jdbranham/grafana-diagram", Duplicate
        "jessin08/advanced-grafana-descrete-panel",
        "jkmnt/grafana_funcomp",
        "jkmnt/grafana_vtable",
        "jkschneider/grafana-trace-exemplars",
        "justinStoner/grafana-candlestick-chart",
        "jwood-krg/opennms-helm-backend",
        "kalidasya/grafana-bundle-plugin-example",
        // "kaydelaney/grafana-vite", Looks like a clone of grafana with a different build tool
        "kgonidis/groupedbarchart",
        "kgonidis/timelessgraph",
        "kiotlog/kiotlog-beicavie-panel",
        "knightss27/grafana-network-weathermap",
        "konradsitarz/grafana-plotly-react-panel",
        // "korenh/GrafanaBoundingBoxPlugin", Removed or private repo
        "kpfaulkner/discord-plugin",
        "kpfaulkner/sendgrid-plugin",
        "kumaravel29/grafana-sankey-panel",
        "kundankarna1994/grafana",
        "lalaux-design/alertmanager-ds",
        "lapnap/grafana-live-app",
        "leonardopivetta/Grafana-telemetry-analysis-panel",
        "manux81/manux81-googlemap-panel",
        "marcpar/grafana_couchdb",
        // "marcusolsson/grafana-calendar-panel", Duplicate
        // "marcusolsson/grafana-hexmap-panel", Duplicate
        "marcusolsson/grafana-plugin-support",
        // "marcusolsson/grafana-treemap-panel", Duplicate
        "mariocapitbrok/gpanel",
        "mariocapitbrok/grafana-starter-panel",
        "mav10/grafana-queryimage-panel",
        // "michaeldmoore/michaeldmoore-scatter-panel", Duplicate
        // "minhyeong-jang/os-grafana-react", // TODO: problem resolving external libs committed to source code
        "mure/grafana-options-bug",
        "narang99/grafana-plugin-tutorial",
        "nehal119/arcgis-grafana-plugin",
        "netsage-project/Netsage-Navigation",
        "netsage-project/netsage-bumpchart-panel",
        // "netsage-project/netsage-sankey-panel", Duplicate
        "netsage-project/react-slope-graph",
        "nicfv/Psychart",
        "nick-enoent/dsosds",
        "niechao136/panel",
        "ooasis/annotation-backend-plugin",
        "ooasis/gitlab-data-source-plugin",
        "ooasis/rally-data-source-plugin",
        "ooasis/release-view-panel-plugin",
        "opsramp/opsramp-metrics-datasource",
        "optimizca/servicenow-grafana",
        // "orchestracities/iconstat-panel", Duplicate
        // "orchestracities/map-panel", Duplicate
        "owbeg/grafana-imageit-panel",
        "ozonru/data-grid-grafana-plugin",
        "ozonru/flamegraph-grafana-plugin",
        "ozonru/graph-grafana-plugin",
        "ozonru/template-value-grafana-plugin",
        // "percona-platform/saas-ui", // Removed or private repo
        "peterholmberg/fan-panel",
        "pfgithub/pfgithub-multistat-panel",
        "pgillich/grafana-tree-panel",
        "philips-labs/grafana-bpm-plugin",
        "pontus-vision/pontus-grafana-react-panel",
        "pportelaf/grafana-sensors-floor-plan-panel",
        "prateekdev92/grafana-status-dot-panel",
        "predictiveworks/grafana-works",
        "qianlifeng/taosdata-grafana-plugin",
        "questdb/grafana-datasource",
        "quincarter/react-grafana-plugin",
        "qxang/grafan-plugin",
        "raguct25/grafana-plugin-react",
        "rajsameer/alert-manager-table",
        // "raulsperoni/magnesium-wordcloud-panel", Duplicate
        "rkorshakevich/zoomable-sunburst",
        "rnersesian/examplePanel",
        "rnersesian/test-plugin",
        "ryantxu/image-viewer-panel",
        "ryantxu/preso-app",
        "saterunholy/plugintest",
        "saterunholy/testrepository",
        "sbueringer/grafana-consul-datasource",
        "scc-digitalhub/grafana-dremio-datasource-plugin",
        "schoentoon/rsge-grafana",
        "sd2k/grafana-sample-backend-plugin-rust",
        "seawavezhangdining/xdevt-html-panel",
        "sergioceron/grafana-map",
        "shannonlal/shannonlal-grafana-shannonlal-sample-json",
        // "shintarof/grafana-simple-panelplugin", Removed or private repo
        "shuangquanhuang/grafana-plugin-template",
        // "snuids/grafana-radar-panel", Duplicate
        // "snuids/grafana-svg-panel", Duplicate
        // "speakyourcode/grafana-button-panel", Duplicate
        "srclosson/div-panel",
        "srclosson/geotrack-panel",
        "srclosson/grafana-tsbackend",
        "srclosson/validation-panel",
        "steebnh/westc",
        "surzycki/grafana-react",
        "taianesb1994/barchartReactChartjs2",
        "taianesb1994/grafana-echarts-barcharts",
        "taianesb1994/piechart2Types-recharts",
        "tbo47/openglobus_grafana",
        "tdtan/granfana",
        "techierishi/graplugin",
        // "telekom/sebastiangunreben-cdf-plugin", Duplicate
        "thegreymatter/grafana-agg-table",
        "thuanguyen1602/grafana-backend-plugin",
        "thuanguyen1602/grafana-frontend-plugin",
        "tinybat02/ES-3dscatter",
        "tinybat02/ES-Bus-Pure",
        "tinybat02/ES-apex-generic",
        "tinybat02/ES-bar",
        "tinybat02/ES-download-csv",
        "tinybat02/ES-draw-count",
        "tinybat02/ES-duration-stat",
        "tinybat02/ES-funnel",
        "tinybat02/ES-grid-heat",
        "tinybat02/ES-grid-heat-by-id",
        "tinybat02/ES-heat-flow",
        "tinybat02/ES-maptk",
        "tinybat02/ES-point-latest",
        "tinybat02/ES-scatter-plot",
        "tinybat02/ES-tabheat-conf",
        "tinybat02/Latest_point_line",
        "tinybat02/Linechart_XY",
        "tinybat02/Map-polygon",
        "tinybat02/Scatter-office",
        "tinybat02/Traj-step-play",
        "tinybat02/tmp_zip_catch",
        "tom2kota/grafana-panel-react-ts-webpack-template",
        "tom2kota/grafana-plugin-fetch-unit-tests",
        "tom2kota/grafana-starter-panel",
        "tomastauer/newrelic-grafana-insights",
        "tomcheney/grafana-vertical-plot",
        "twei55/grafana-scatterplot",
        "ui3o/grafana-quick-log-panel",
        "venkataramu/demo-grafana-plugin",
        "vertica/vertica-grafana-datasource",
        "vijayleom/ca-grafana-hierarchy",
        "vmware-labs/panel-plug-ins-for-grafana",
        "vsergeyev/aws-kinesis",
        "vsergeyev/loudml-grafana-app",
        "vsergeyev/tensorflow-grafana-app",
        "wildmountainfarms/solarthing-grafana",
        "world-direct/extrusion-panel-plugin",
        "world-direct/forecast-input-panel-plugin",
        "wouterdt/grafana-react-testpanel",
        "woutervh-/grafana-mapbox",
        "xformation/xformation-assetmanager-ui-plugin",
        "xformation/xformation-compliancemanager-ui-plugin",
        "xformation/xformation-logmanager-ui-plugin",
        "yesoreyeram/grafana-infinity-panel",
        "yesoreyeram/grafana-nocode-editor",
        "yesoreyeram/grafana-slideshow-panel",
        "yesoreyeram/grafana-utilities",
        // "yesoreyeram/yesoreyeram-boomtheme-panel", Duplicate
        "yt-developers/whyit-grafana-gf_plugin.ds.elasticsearch-v7",
        "zen0fpy/grafana_plugins_demo",
        "zezking/grafana-panel-plugin-tutorial",
        "zhangucan/simple-data-filter",
    ].map(repoRef => ({
        repoUrl: "https://github.com/" + repoRef,
        subprojectPath: "/",
        isTargetModuleOrPath: targets,
        since,
    })),

    // Non-deprecated panels & apps from grafana website,
    // that have available github, aren't already included with grafana,
    // not archived or deprecated
    // and mentioning `@grafana/ui` in package.json
    ...[
        "https://github.com/anodot/grafana-panel.git",
        "https://github.com/VolkovLabs/volkovlabs-image-panel.git",
        "https://github.com/TencentCloud/tencentcloud-monitor-grafana-app.git",
        "https://github.com/grafana/synthetic-monitoring-app.git",
        "https://github.com/RedisGrafana/grafana-redis-explorer.git",
        "https://github.com/RedisGrafana/grafana-redis-app.git",
        "https://github.com/OpenNMS/opennms-helm.git",
        "https://github.com/grafana/grafana-iot-twinmaker-app.git",
        "https://github.com/alexanderzobnin/grafana-zabbix.git",
        "https://github.com/grafana/clock-panel.git",
        "https://github.com/raulsperoni/magnesium-wordcloud-panel.git",
        "https://github.com/lework/grafana-lenav-panel.git",
        "https://github.com/auxmoney/grafana-waterfall-panel.git",
        "https://github.com/innius/grafana-video-panel.git",
        "https://github.com/factrylabs/untimely-grafana-panel.git",
        "https://github.com/marcusolsson/grafana-treemap-panel.git",
        "https://github.com/alexandrainst/alexandra-trackmap-panel.git",
        "https://github.com/Gowee/traceroute-map-panel.git",
        "https://github.com/WilliamVenner/grafana-timepicker-buttons.git",
        "https://github.com/flant/grafana-statusmap.git",
        "https://github.com/boazreicher/sierra-plot.git",
        "https://github.com/isaozler/grafana-shift-selector.git",
        "https://github.com/NovatecConsulting/novatec-service-dependency-graph-panel.git",
        "https://github.com/michaeldmoore/michaeldmoore-scatter-panel.git",
        "https://github.com/netsage-project/netsage-sankey-panel.git",
        "https://github.com/snuids/grafana-radar-panel.git",
        "https://github.com/grafana/grafana-starter-panel.git",
        // "https://github.com/grafana/grafana-polystat-panel.git", // TODO: problem resolving external libs committed to source code
        "https://github.com/ae3e/ae3e-plotly-panel.git",
        "https://github.com/SSKGo/perfcurve-panel.git",
        "https://github.com/JeanBaptisteWATENBERG/grafana-percent-plus.git",
        "https://github.com/isaozler/pareto-chart.git",
        "https://github.com/orchestracities/map-panel.git",
        "https://github.com/orchestracities/iconstat-panel.git",
        "https://github.com/boazreicher/mosaic-plot.git",
        "https://github.com/thiagoarrais/grafana-matomo-tracking-panel.git",
        "https://github.com/flaminggoat/map-track-3-d.git",
        "https://github.com/pierosavi/pierosavi-imageit-panel.git",
        "https://github.com/gapitio/gapit-htmlgraphics-panel.git",
        "https://github.com/marcusolsson/grafana-hourly-heatmap-panel.git",
        "https://github.com/marcusolsson/grafana-hexmap-panel.git",
        "https://github.com/grafana/grafana-guidedtour-panel.git",
        "https://github.com/marcusolsson/grafana-gantt-panel.git",
        "https://github.com/algenty/grafana-flowcharting.git",
        "https://github.com/LucasArona/larona-epict-panel.git",
        "https://github.com/Billiballa/bilibala-echarts-panel.git",
        "https://github.com/marcusolsson/grafana-dynamictext-panel.git",
        "https://github.com/Dalvany/dalvany-image-panel.git",
        "https://github.com/NatelEnergy/grafana-discrete-panel.git",
        "https://github.com/jdbranham/grafana-diagram.git",
        "https://github.com/IntegrationMatters/integrationmatters-comparison-panel.git",
        "https://github.com/snuids/grafana-svg-panel.git",
        "https://github.com/telekom/sebastiangunreben-cdf-plugin.git",
        "https://github.com/marcusolsson/grafana-calendar-panel.git",
        "https://github.com/cloudspout/cloudspout-button-panel.git",
        "https://github.com/speakyourcode/grafana-button-panel.git",
        "https://github.com/yesoreyeram/yesoreyeram-boomtheme-panel.git",
        "https://github.com/MacroPower/macropower-analytics-panel.git",
        "https://github.com/ACE-IoT-Solutions/ace-svg-react.git",
        "https://github.com/briangann/grafana-datatable-panel.git",
    ].map(repoUrl => ({
        repoUrl,
        subprojectPath: "/",
        isTargetModuleOrPath: targets,
        since,
    })),

    // "panel" projects in the "grafana" github org
    // https://github.com/orgs/grafana/repositories?q=panel&type=all&language=&sort=
    ...[
        "https://github.com/grafana/piechart-panel",
        "https://github.com/grafana/perspective-panel",
        // "https://github.com/grafana/grafana-guidedtour-panel", Already referenced by grafana plugin list
        // "https://github.com/grafana/grafana-polystat-panel", Already referenced by grafana plugin list
        // "https://github.com/grafana/clock-panel", Already referenced by grafana plugin list
        "https://github.com/grafana/singlestat-panel",
        // "https://github.com/grafana/grafana-starter-panel", Already referenced by grafana plugin list
    ].map(repoUrl => ({
        repoUrl: repoUrl + ".git",
        subprojectPath: "/",
        isTargetModuleOrPath: targets,
        since,
    })),
];

export default samples;
