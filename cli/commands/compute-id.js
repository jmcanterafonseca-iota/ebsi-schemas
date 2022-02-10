import { getSchemaIds } from "../utils/jsonSchema.js";

export default (program) =>
  program
    .command("compute-id")
    .description("Compute the EBSI TSR ID of a JSON Schema")
    .argument("[paths...]", "Path(s) to JSON Schema(s)")
    .option("--all", "Compute all JSON Schemas")
    .action(async (paths, options) => {
      (await getSchemaIds(paths, options)).forEach(({ id, schema }) => {
        console.log(`✨ Schema ID: ${id}\tFile: ${schema}`);
      });
    });
