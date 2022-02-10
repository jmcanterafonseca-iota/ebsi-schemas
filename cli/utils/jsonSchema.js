import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import canonicalize from "canonicalize";
import { globbySync } from "globby";
import inquirer from "inquirer";
// eslint-disable-next-line import/extensions
import { base16 } from "multiformats/bases/base16";

export function removeAnnotations(obj) {
  /**
   * Lists of annotations keywords:
   * - https://json-schema.org/draft/2020-12/json-schema-validation.html#rfc.section.9
   * - https://json-schema.org/draft/2019-09/json-schema-validation.html#rfc.section.9
   * - https://json-schema.org/draft-07/json-schema-validation.html#rfc.section.10
   */
  const keysToRemove = [
    "title",
    "description",
    "default",
    "deprecated",
    "readOnly",
    "writeOnly",
    "examples",
  ];

  return JSON.parse(
    JSON.stringify(obj, (key, val) =>
      keysToRemove.includes(key) ? undefined : val
    )
  );
}

export function replaceRefs(obj, tsr, schemaPath, schemaIds) {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const rootDir = resolve(currentDir, "../..");

  const dependencies = [];
  const updatedSchema = JSON.parse(
    JSON.stringify(obj, (key, val) => {
      if (key !== "$ref" || typeof val !== "string" || !val.startsWith("../")) {
        return val;
      }

      // Relative path (from schemaPath to absolute path)
      const referencedPath = resolve(schemaPath, "..", val);
      const match = schemaIds.find(({ schema }) => {
        if (resolve(rootDir, schema) === referencedPath) {
          // Add to dependencies array
          if (!dependencies.includes(schema)) {
            dependencies.push(schema);
          }

          return true;
        }
        return false;
      });

      if (!match || !match.id) {
        throw new Error(`Unable to find ${referencedPath}`);
      }

      return `${tsr}/schemas/${match.id}`;
    })
  );

  return {
    updatedSchema,
    dependencies,
  };
}

export async function computeId(schemaPath) {
  const fullPath = resolve(process.cwd(), schemaPath);

  // 1. Bundle schema
  const bundledSchema = await $RefParser.bundle(fullPath);

  // 2. Remove annotations
  const sanitizedDocument = removeAnnotations(bundledSchema);

  // 3. Canonicalise
  const canonicalizedDocument = canonicalize(sanitizedDocument);

  // 4. Compute sha256 of the stringified JSON document
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalizedDocument), "utf-8")
    .digest();

  // 5. Return multibase base58 (BTC) encoded hash
  // return base58btc.encode(hash);

  // Temporary: until we update TSR API
  return `0x${base16.baseEncode(hash)}`;
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(currentDir, "../..");

export async function getSchemaIds(paths, options) {
  const SCHEMAS_PATTERNS = ["schemas/**/schema.json"];

  let schemas = [];
  if (Array.isArray(paths) && paths.length > 0) {
    schemas = globbySync(paths, { cwd: rootDir });
  } else if (options.all) {
    // Find all schemas
    schemas = globbySync(SCHEMAS_PATTERNS, { cwd: rootDir });
  } else {
    const allSchemas = globbySync(SCHEMAS_PATTERNS, {
      cwd: rootDir,
    });
    const answers = await inquirer.prompt([
      {
        type: "checkbox",
        message: "Which JSON Schema(s) do you want to compute?",
        name: "schemas",
        choices: allSchemas.map((schema) => ({
          name: schema,
        })),
        pageSize: 12,
        validate(answer) {
          if (answer.length < 1) {
            return "You must choose at least one JSON schema.";
          }

          return true;
        },
      },
    ]);
    schemas = answers.schemas;
  }

  if (!(schemas.length > 0)) {
    console.error("No JSON Schema found!");
    process.exit(1);
  }

  return Promise.all(
    schemas.map(async (schema) => {
      const id = await computeId(schema);
      return { id, schema };
    })
  );
}
