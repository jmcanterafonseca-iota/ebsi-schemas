import { Argument } from "commander";
import { globbySync } from "globby";
import { dirname, resolve } from "node:path";
import { readFile } from "node:fs";
import { fileURLToPath } from "node:url";
import sign from "./sign.js";

async function filesAsJson(files) {
  return Promise.all(
    files.map(async (file) => {
      const fullPath = resolve(process.cwd(), file);
      return new Promise((res, rej) => {
        readFile(fullPath, (err, data) => {
          if (err) {
            return rej(err);
          }
          return res({
            name: fullPath,
            json: JSON.parse(data.toString()),
          });
        });
      });
    })
  );
}

async function getFilesContent(patterns) {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const rootDir = resolve(currentDir, "../../..");

  const schemas = globbySync(Array.isArray(patterns) ? patterns : [patterns], {
    cwd: rootDir,
  });

  if (!(schemas.length > 0)) {
    console.error("No JSON files found!");
    process.exit(1);
  }
  return filesAsJson(schemas);
}

export default (program) =>
  program
    .command("sign-jwt")
    .description("Sign JWT from a file")
    .addArgument(
      new Argument("<actor>", "signer").choices([
        "alice",
        "bob",
        "verifier",
        "issuer",
      ])
    )
    .argument(
      "<patterns...>",
      "Glob path(s) to JSON Schema(s), like schemas/**/2022-05/examples/**"
    )
    .action(async (actor, patterns) => {
      try {
        const filesContent = await getFilesContent(patterns);
        const signedContent = await Promise.all(
          filesContent.map(async ({ name, json }) => ({
            jwt: await sign(json, actor),
            name,
          }))
        );

        console.log(`Actor "${actor}" signatures`);
        console.log(signedContent);
      } catch (ex) {
        console.error(ex);
        process.exit(1);
      }
    });
