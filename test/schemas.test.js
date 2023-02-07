import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs";
import Ajv2020 from "ajv/dist/2020.js";
import Ajv2019 from "ajv/dist/2019.js";
import AjvDraft07 from "ajv";
import addFormats from "ajv-formats";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { globbySync } from "globby";
// eslint-disable-next-line import/extensions
import { base58btc } from "multiformats/bases/base58";
import { computeId } from "../cli/utils/jsonSchema.js";

// Ignore list: these schemas are not valid ("strict": true, https://ajv.js.org/options.html#strict)
const ignoreList = [
  "schemas/ebsi-muti-uni-pilot/education-verifiable-accreditation-records/2021-12/schema.json",
  "schemas/ebsi-muti-uni-pilot/verifiable-attestation-organisational-id/2021-12/schema.json",
  "schemas/ebsi-muti-uni-pilot/verifiable-diploma/2021-11/schema.json",
  "schemas/ebsi-vid/legal-entity/2021-12/schema.json",
  "schemas/ebsi-vid/natural-person/2021-12/schema.json",
  "schemas/ebsi-vid/verifiable-authorisation/2021-11/schema.json",
];

// Find all schemas (except the broken ones)
const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(currentDir, "..");
const schemas = globbySync(["schemas/**/schema.json"], {
  cwd: rootDir,
  ignore: ignoreList,
});

describe.each(schemas)("Schema %s", (schemaFile) => {
  test("should compile without errors (using Ajv)", async () => {
    // Bundle schema
    const bundledSchema = await $RefParser.bundle(resolve(rootDir, schemaFile));

    // Configure Ajv
    let ajv;
    switch (bundledSchema.$schema) {
      // https://github.com/json-schema-org/json-schema-spec/blob/2020-12/schema.json
      case "https://json-schema.org/draft/2020-12/schema": {
        ajv = new Ajv2020({ allErrors: true, strict: true });
        break;
      }
      // https://github.com/json-schema-org/json-schema-spec/blob/2019-09/schema.json
      case "https://json-schema.org/draft/2019-09/schema": {
        ajv = new Ajv2019({ allErrors: true, strict: true });
        break;
      }
      // https://github.com/json-schema-org/json-schema-spec/blob/draft-07/schema.json
      case "http://json-schema.org/draft-07/schema#": {
        ajv = new AjvDraft07({ allErrors: true, strict: true });
        break;
      }
      default: {
        throw new Error(`Unknown version "${bundledSchema.$schema}"`);
      }
    }
    addFormats(ajv);

    // Should compile without errors
    expect(ajv.compile(bundledSchema)).not.toThrow();
  });
});

test("should match the snapshot", async () => {
  const summary = await Promise.all(
    schemas.map(async (schemaFile) => {
      const idBase16 = await computeId(schemaFile);
      const idBase58 = base58btc.encode(
        Buffer.from(idBase16.replace("0x", ""), "hex")
      );
      const dataString = fs.readFileSync(schemaFile, "utf8");
      const data = JSON.parse(dataString);

      return {
        title: data.title,
        description: data.description,
        idBase16,
        idBase58,
        file: schemaFile,
      };
    })
  );
  expect(summary).toMatchSnapshot();
});
