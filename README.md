![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# JSON Schemas

> EBSI's JSON Schemas for VC and VP.

## Table of Contents

- [Contributing](#Contributing)
  - [Requirements](#Requirements)
  - [Folder structure](#Folder-structure)
  - [Formatting](#Formatting)
  - [Testing](#Testing)
- [CLI](#CLI)
- [License](#License)

## Contributing

When you create a new JSON Schema, make sure to follow the folder structure described below. Moreover, the JSON Schema must pass the [automated tests](#Testing), and comply with our [formatting conventions](#Formatting).

Create a new branch from the `main` branch, commit your changes, and open a pull request on [Bitbucket](https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/json-schema/browse).

### Requirements

In order to properly contribute to the project, you should have a functional development environment including Node.js (^12.20.0, ^14.13.1 or >=16.0.0).

Install the dependencies:

```sh
npm i
```

### Folder structure

In the root directory, we have 2 main folders (`schemas/` and `test/`) and configuration files.

This folder structure makes it easy to automate the tests. It also clearly shows all the existing versions of the schemas, without having to navigate between git branches.

#### `schemas/`

The `schemas/` folder is where we store all the [JSON Schemas](https://json-schema.org/).

Each JSON Schema lives in its own folder. For example, the EBSI Verifiable Attestation JSON schema can be found under `/schemas/ebsi-attestation`.

In each schema folder, we can find:

- a `README.md` file, which briefly describes the JSON Schema, and links to relevant documentation pages. More importantly, this README also shows the changes between the different versions of the schema.
- 1 subfolder per version. These folders are named `YYYY-MM(_VV)`. Examples: `2021-11`, `2022-02`, `2022-02_01`, etc. Year (YYYY) and month (MM) of publication are mandatory, while a version number (VV) can be added if multiple versions of the schema are published during a specific month. The date of "publication" corresponds to the date of the merge to the `main` branch. For example, if we merge a pull request in March 2022, we name the folder `2022-03`. If we need to publish a new version of the schema during the same month, we add version number (`_01`, `_02`, etc.).

In a schema version subfolder (e.g. `2021-11`), we store:

- `schema.json`: the actual JSON Schema.
- `examples/` folder (optional): a directory containing JSON examples, which are automatically tested against the JSON Schema defined in `schema.json`
- `test/` folder (optional): a directory containing specific test files. For example, we could test the retro-compatibility of a new schema version.

#### `test/`

In the `test/` folder, we have automated test scripts that validate the JSON schemas and examples.

There are 2 automated tests:

- The first automated test scans the repository for `schema.json` files. It tries to compile the schemas with [Ajv](https://ajv.js.org/) (in strict mode), and throws errors when the tested schema is invalid.
- The second automated test scans the repository for `examples/*.json` files. It tries to validate the examples against the related `schema.json` file that can be found next to the `examples/` folder.

### Formatting

We use [Prettier](https://prettier.io/) (an opinionated code formatter) to format the JS and JSON files, and [ESLint](https://eslint.org/) to analyze the JS files.

You can run the following command to check if your files comply with Prettier and ESLint:

```sh
npm run lint
```

To format all the files with Prettier, run:

```sh
npm run format
```

### Testing

Run the tests:

```sh
npm test
```

If you just want to test the examples or the schemas, you can run one of the following commands:

```sh
# Validate the examples only
npm run test test/examples.test.js

# Validate the schemas only
npm run test test/schemas.test.js
```

## CLI

The repository comes with a CLI.

First, install the dependencies and link the CLI to make it callable:

```sh
npm i
npm link
```

You can now call `ejsc` (EBSI JSON Schema CLI).

### `compute-id` command

```sh
# Compute the ID of a specific schema
# Example: ejsc compute-id schemas/ebsi-attestation/2021-11/schema.json
ejsc compute-id [path]

# Compute all IDs
ejsc compute-id --all

# Compute IDs of chosen files (a prompt will appear)
ejsc compute-id
```

### `publish` command

```sh
# Publish a specific schema
# Example: ejsc publish schemas/ebsi-attestation/2021-11/schema.json
ejsc publish [path]

# Publish all schemas
ejsc publish --all

# Publish the chosen schemas (a prompt will appear)
ejsc publish
```

Tip: you can create a `.env` file to store your credentials, so you don't have to enter them every time you run the `publish` command.

Example:

```
EBSI_ENV=pilot
KID="did:ebsi:z...#..."
PRIVATE_KEY=0x...
```

### `sign` command

This command helps signing arbitrary json objects. Keys (public and private) can be found from [actors.js](cli/commands/sign/actors.js) for each valid actor. The signer depends on the use case and is selectable by the caller. Use `--type jwt` for JSON Web Token (JWT) and `--type jws` for General JSON Web Signature (JWS) Serialisation.

```sh
# Sign all files found with the glob in JWT as Alice. Will target all 2022-05 examples
ejsc sign --actors alice --type jwt schemas/**/2022-05/examples/**

# Sign all files found with the glob in JWT as issuer. Will target all 2022-05 examples
ejsc sign --actors issuer --type jwt schemas/**/2022-05/examples/**

# Sign all files found with the glob in JWS as both issuer and issuer2. Will target all 2022-05 examples
ejsc sign --actors issuer issuer2 --type jws schemas/**/2022-05/examples/**
```

## License

Copyright (c) 2019 European Commission
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
