import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import Ajv2019 from "ajv/dist/2019.js";
import AjvDraft07 from "ajv";
import addFormats from "ajv-formats";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { globbySync } from "globby";

// Ignore list
const ignoreList = [
  "schemas/ebsi-muti-uni-pilot/education-verifiable-accreditation-records/2021-12/**/*",
  "schemas/ebsi-muti-uni-pilot/verifiable-attestation-organisational-id/2021-12/**/*",
  "schemas/ebsi-muti-uni-pilot/verifiable-diploma/2021-11/**/*",
];

// Find all examples
const examples = [];
const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(currentDir, "..");
const matches = globbySync(["schemas/**/examples/*.json"], {
  cwd: rootDir,
  ignore: ignoreList,
});
matches.forEach((exampleFile) => {
  examples.push({
    exampleFile,
    schemaFile: resolve(dirname(exampleFile), "../schema.json"),
  });
});

describe("Examples validation", () => {
  test.each(examples)(
    "$exampleFile should be valid",
    async ({ exampleFile, schemaFile }) => {
      // Bundle schema
      const bundledSchema = await $RefParser.bundle(schemaFile);

      // Configure Ajv
      let ajv;
      switch (bundledSchema.$schema) {
        case "https://json-schema.org/draft/2020-12/schema": {
          ajv = new Ajv2020({ allErrors: true });
          break;
        }
        case "http://json-schema.org/draft/2019-09/schema": {
          ajv = new Ajv2019({ allErrors: true });
          break;
        }
        case "http://json-schema.org/draft-07/schema#": {
          ajv = new AjvDraft07({ allErrors: true });
          break;
        }
        default: {
          throw new Error(`Unknown version "${bundledSchema.$schema}"`);
        }
      }
      addFormats(ajv);

      // Validate example
      const validate = ajv.compile(bundledSchema);
      const exampleData = JSON.parse(
        readFileSync(resolve(rootDir, exampleFile))
      );
      const valid = validate(exampleData);

      // Check results
      expect(validate.errors).toBeNull();
      expect(valid).toBe(true);
    }
  );
});
