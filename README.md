# ElevenLabs Monorepo for NPM Package

This repository contains multiple package published on npm under `@elevenlabs` scope.
Separate packages can be found in the `packages` folder.

![LOGO](https://github.com/elevenlabs/elevenlabs-python/assets/12028621/21267d89-5e82-4e7e-9c81-caf30b237683)
[![Discord](https://badgen.net/badge/black/ElevenLabs/icon?icon=discord&label)](https://discord.gg/elevenlabs)
[![Twitter](https://badgen.net/badge/black/elevenlabsio/icon?icon=twitter&label)](https://twitter.com/elevenlabsio)


## Installation

Install `pnpm` globally.

```shell
npm i pnpm -g
```

Setup the monorepo and install dependencies in the root of the repository.
This will also install dependencies for all the packages in the packages folder, and symlink local packages where appropriate.

```shell
pnpm i
```

## Development

To develop a package, run dev script in the root of a package.
This will start a watch mode for the package.

```shell
pnpm run dev
```

To use the package inside within another project, use `pnpm link`.

```shell
# inside of the package root
pnpm link --global

# inside of your project
pnpm link --global <pkg>
```

You can run `pnpm run dev` to automatically apply changes to your project.
Note that many projects don't watch for changes inside of `node_modules` folder to rebuild.
You might have to restart the application, or modify you setup to watch for node_modules (possible development performance implications).

Also note that the above won't work with turbopack projects. Instead use webpack to develop locally.

Don't forget to run the `unlink` equivalent once you're done, to prevent confusion in the future.

## Creating New Package

You can always just add a new folder with package.json inside of `packages` folder.
Alternatively run `pnpm run create --name=[package-name]` in the root of this repository to create a new package from template.

## Publishing

To publish a package from the packages folder, create new GitHub release.
Since there are multiple packages contained in this folder, the release name/tag should follow format `<package>@version`.
The release will trigger GitHub action publishing the package, and the tag will be used to publish specific package.

The GitHub action will only run the publish command. Make sure you've update the version number manually in `package.json`.

