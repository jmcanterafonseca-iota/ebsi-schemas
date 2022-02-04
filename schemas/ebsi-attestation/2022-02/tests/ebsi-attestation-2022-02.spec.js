import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import example202111 from "../../2021-11/examples/basic.json";

// Configure Ajv
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

describe("EBSI Attestation 2022-02 schema", () => {
  beforeAll(async () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const ebsiAttestationDraft02 = await $RefParser.bundle(
      resolve(currentDir, "../schema.json")
    );

    ajv.addSchema(ebsiAttestationDraft02, "schema");
  });

  // This test shows that the new schema is not backward-compatible
  it("should not validate an EBSI Attestation 2021-11 JSON document", () => {
    const validate = ajv.getSchema("schema");
    const valid = validate(example202111);

    // Check results
    expect(validate.errors).toStrictEqual([
      {
        instancePath: "",
        keyword: "required",
        message: "must have required property 'issued'",
        params: { missingProperty: "issued" },
        schemaPath: "#/required",
      },
    ]);
    expect(valid).toBe(false);
  });
});
