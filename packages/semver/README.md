# semver

CLI for managing semantic versioning in git repos.

## Installation

**Local :**
For [node](https://nodejs.org/en/about/) projects we recommend installing @inova/semver locally and running the semver command with npx: `npm install --save-dev @inova/semver`

Then in the CI environment: `npx semver bump`

**Global :**
For other project types you can install @inova/semver globally:  `npm install -g @inova/semver`

## Configuration

You can create a `.semver.json` file in the root dir of your workspace, if you like to override the default configuration.

The config options:

**_betaBranchName_**

Name of the branch that produces the beta builds.

Default is set to `main`

**_releaseBranchName_**

Name of the branch that produces the rc and stable builds.
It can be defined as a glob in which case the definition will be expanded to one per matching branch existing in the repository.

Default is set to `releases/*`.

**_commitMessageFormat_**

By default semver uses Angular Commit Message Conventions.
The commit message format can be changed with this `commitMessageFormat` property.

Check [conventional-changelog-preset-loader](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-preset-loader) for further information.

**_releaseCandidate_**

Indicates whether the current branch produces rc builds.
This is only relevant for release branches. Set this to `false` for producing stable builds from your release branch

Default is set to `true`.

**_commitTypesToIgnore_**

Commit types to ignore.

Default: `ci`, `repo`, `docs`, `test`, `chore`, `refactor`.

## Commands

To show the commands list you can run  `npx semver --help` or just `semver --help` if you installed @inova/semver globally.

To see what options the command support run `semver [command] -h` eg. `semver bump -h`.
