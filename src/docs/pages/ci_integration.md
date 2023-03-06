# CI Integration

We designed Tracker to run on schedule in CI so that the team can routinely review the design system adoption progress.
For example, in Github Actions you can use [the schedule trigger.](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule) 

Tracker takes a snapshot of the latest state of the codebase and weekly snapshots of each project's history.
Weekly snapshots are aligned with the latest commit as of [midnight on Saturday every week.](https://github.com/rangle/radius-tracker/blob/17da736e27f325ec3fa7c920b85fd645a0a81a0a/src/lib/cli/timelines/getTimelineForOneRepo.ts#L75)

We recommend scheduling Tracker to run a day or two before the rituals where the team reviews the progress.


## Artifacts

[Tracker outputs](./analysis) are self-contained and can be archived.
We suggest storing these artifacts for reference using [Upload Artifact](https://github.com/actions/upload-artifact)
Github Action or a similar step in your CI.


## Cache

Running static code analysis of an entire organizational ecosystem history takes considerable time.

Tracker writes intermediary results per project per commit into a specified `--cacheDir`.
By default, the cache is written to `radius-tracker-cache/cache`

Saving and restoring the cache between tracker runs will save significant CPU time
by avoiding the re-processing of historical commits.

Cache content is versioned with a constant from [`src/lib/cli/util/cacheVersion.ts`](https://github.com/rangle/radius-tracker/blob/c7651f30864b50584587ebd1c75907e11d413a2a/src/lib/cli/util/cacheVersion.ts)
— you can use a hash of that file as the cache key. For example,
in Github Actions you can use `hashFiles('**/cacheVersion.ts')`


## Resource consumption

Static code analysis is resource-heavy. Tracker can take hours to run, especially without cache,
when processing a project for the first time. Please provide sufficient CPU and Memory,
and ensure that your CI runner doesn't kill the Tracker task too early.

CPU time is a primary limiting factor for Tracker. It runs multiple child processes,
each analyzing a single commit, to better utilize available CPUs.

Tracker allocates a minimum of 2GB of Memory per child process, so the number of child processes might be limited
on machines with low total memory.

On top of potentially significant amounts of cache, Tracker fetches all the projects specified in the config file
and creates a copy per thread. Make sure there is enough disk space for Tracker to run.


## Restricting network access

Tracker requires no network access to run beyond fetching the git repos.
Consider fetching the project repos to the local filesystem and clamping down the firewall
before running or even installing Tracker to eliminate the potential for leaking the analyzed codebase.

Alternatively, you can limit network access to only allow outgoing connections to the git hosting.


## Automated project discovery

Depending on the git hosting platform, you might be able to automatically discover
new UI projects in the organization ecosystem.

For example, you can use [Github Search API](https://docs.github.com/en/rest/search?apiVersion=2022-11-28#search-code)
to search for `package.json` files containing a reference to your design system or frontend frameworks:
```
org:<your_organization>+in:file+filename:package.json+language:json+<your_design_system_package>
```

You can then programmatically generate [the config file](./configuration_file) using the list of discovered projects.
