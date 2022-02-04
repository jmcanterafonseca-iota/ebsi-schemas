import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020";
import Ajv2019 from "ajv/dist/2019";
import AjvDraft07 from "ajv";
import addFormats from "ajv-formats";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { globbySync } from "globby";

// Ignore list
const ignoreList = [
  "schemas/ebsi-muti-uni-pilot/education-verifiable-accreditation-records/2021-12/schema.json",
  "schemas/ebsi-muti-uni-pilot/verifiable-attestation-organisational-id/2021-12/schema.json",
  "schemas/ebsi-muti-uni-pilot/verifiable-diploma/2021-11/schema.json",
  "schemas/ebsi-vid/legal-entity/2021-12/schema.json",
  "schemas/ebsi-vid/natural-person/2021-12/schema.json",
  "schemas/ebsi-vid/verifiable-authorisation/2021-11/schema.json",
];

// Find all schemas
const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(currentDir, "..");
const schemas = globbySync(["schemas/**/schema.json"], {
  cwd: rootDir,
  ignore: ignoreList,
});

describe("Schemas validation", () => {
  test.each(schemas)(
    "AJV should compile %s without errors",
    async (schemaFile) => {
      // Bundle schema
      const bundledSchema = await $RefParser.bundle(
        resolve(rootDir, schemaFile)
      );

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
    }
  );
});
