![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

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

Create a new branch from the `Main` branch, commit your changes, and open a pull request on [Bitbucket](https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/json-schema/browse).

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
- 1 subfolder per version. These folders are named `2021-11`, `2022-02`, etc. It basically follows the naming logic of the JSON Schema specs. We name the subfolder after the date of the merge to the `Main` branch. For example, if we merge a pull request in March 2022, we name the folder `2022-03`.

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

We use [Prettier](https://prettier.io/) (an opinionated code formatter) to format the JS and JSON files.

You can run the following command to check if your files comply with Prettier:

```sh
npm run lint
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
DID=did:ebsi:z...
PRIVATE_KEY=0x...
```

## License

Copyright (c) 2019 European Commission
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
