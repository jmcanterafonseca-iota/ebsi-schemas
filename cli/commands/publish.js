/* eslint-disable no-param-reassign */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import inquirer from "inquirer";
import Ajv2020 from "ajv/dist/2020.js";
import Ajv2019 from "ajv/dist/2019.js";
import AjvDraft07 from "ajv";
import addFormats from "ajv-formats";
import { Listr } from "listr2";
import { requestSiopJwt } from "../utils/requestSiopJwt.js";
import { publishSchema } from "../utils/ledger.js";
import { getSchemaIds, replaceRefs } from "../utils/jsonSchema.js";
import CONFIG from "../config.js";

export default (program) =>
  program
    .command("publish")
    .description("Publish the JSON Schema to the Trusted Schemas Registry")
    .argument("[paths...]", "Path(s) to JSON Schema(s)")
    .option("--all", "Publish all JSON Schemas")
    .option("-e, --env <env>", "EBSI Environment (test, pilot)")
    .action(async (paths, options) => {
      const currentDir = dirname(fileURLToPath(import.meta.url));
      const rootDir = resolve(currentDir, "../..");

      // Get IDs of the JSON Schemas the user wants to publish
      const schemaIds = await getSchemaIds(paths, options);

      let { env } = options;
      if (!env) {
        if (process.env.EBSI_ENV) {
          env = process.env.EBSI_ENV;
        } else {
          const answers = await inquirer.prompt([
            {
              type: "list",
              message: "EBSI environment?",
              name: "env",
              choices: [{ value: "test" }, { value: "pilot" }],
            },
          ]);
          env = answers.env;
        }
      }

      const allSchemaIds = await getSchemaIds([], { all: true });

      let did;
      let privateKey;

      if (process.env.DID && process.env.PRIVATE_KEY) {
        did = process.env.DID;
        privateKey = process.env.PRIVATE_KEY;
      } else {
        // Request user DID and private key
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "did",
            message: "What's your DID?",
          },
          {
            type: "password",
            name: "privateKey",
            message: "Enter your hex private key (prefixed with 0x)",
          },
        ]);
        did = answers.did;
        privateKey = answers.privateKey;
      }

      const tasks = new Listr(
        [
          {
            title: "Requesting SIOP JWT...",
            task: async (ctx, task) => {
              // Get SIOP JWT
              const accessToken = await requestSiopJwt({
                authorisationApiUrl: CONFIG[env].AUTH,
                didRegistry: `${CONFIG[env].DIDR}/identifiers`,
                did,
                privateKey,
              });

              ctx.accessToken = accessToken;
              task.title = "SIOP JWT successfully requested";
            },
          },
          {
            title: `Validating schema${schemaIds.length > 1 ? "s" : ""}`,
            task: async (ctx, task) => {
              const schemasToPublish = [];

              await Promise.all(
                schemaIds.map(async ({ schema, id }) => {
                  //  Validate JSON schema before publishing
                  const bundledSchema = await $RefParser.bundle(
                    resolve(rootDir, schema)
                  );
                  try {
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
                        throw new Error(
                          `Unknown version "${bundledSchema.$schema}"`
                        );
                      }
                    }
                    addFormats(ajv);

                    ajv.compile(bundledSchema);

                    // If the schema is valid, replace $refs and push to schemasToPublish
                    const originalSchemaContent = JSON.parse(
                      readFileSync(resolve(rootDir, schema))
                    );

                    const { updatedSchema, dependencies } = replaceRefs(
                      originalSchemaContent,
                      CONFIG[env].TSR,
                      schema,
                      allSchemaIds
                    );

                    schemasToPublish.push({
                      id,
                      schema,
                      updatedSchema,
                      dependencies,
                    });
                  } catch (e) {
                    throw new Error(`Invalid schema ${schema}.`);
                  }
                })
              );

              if (schemasToPublish.length === 0) {
                throw new Error("No schema to publish.");
              }

              // TODO (in the future)
              // Order schemas, based on `schemasToPublish[x].dependencies`

              ctx.schemasToPublish = schemasToPublish;
              task.title = "Validation complete";
            },
          },
          {
            title: `Publishing schemas to ${env} environment...`,
            options: { collapse: false },
            task: async (ctx, task) =>
              task.newListr(
                [
                  ...ctx.schemasToPublish.map(
                    ({ id, schema, updatedSchema }) => ({
                      title: `Schema ${schema}`,
                      task: async (subctx, subtask) =>
                        task.newListr(() => [
                          {
                            title: "Preparing...",
                            task: async (_, subsubtask) => {
                              const res = await publishSchema({
                                schemaId: id,
                                payload: updatedSchema,
                                tsr: CONFIG[env].TSR,
                                ledger: CONFIG[env].LEDGER,
                                privateKey,
                                accessToken: ctx.accessToken,
                                task: subsubtask,
                              });

                              const url = `${CONFIG[env].TSR}/schemas/${id}`;
                              if (res === "published") {
                                subtask.title = `Schema ${schema} published successfully: ${url}`;
                              } else if (res === "exists_already") {
                                subtask.title = `Schema ${schema} already exists: ${url}`;
                              } else if (res === "updated") {
                                subtask.title = `Schema ${schema} updated successfully: ${url}`;
                              }
                            },
                          },
                        ]),
                    })
                  ),
                  {
                    task: () => {
                      task.title = "Finished!";
                    },
                  },
                ],
                { exitOnError: false }
              ),
          },
        ],
        {
          concurrent: false,
          rendererOptions: {
            formatOutput: "wrap",
          },
        }
      );

      try {
        await tasks.run();
      } catch (e) {
        process.exit(1);
      }
    });
