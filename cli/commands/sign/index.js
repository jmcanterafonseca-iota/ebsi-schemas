import { globbySync } from "globby";
import { dirname, resolve } from "node:path";
import { readFile } from "node:fs";
import { fileURLToPath } from "node:url";
import { Option } from "commander";
import signJwt from "./sign-jwt.js";
import signJws from "./sign-jws.js";

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

  if (schemas.length <= 0) {
    console.error("No JSON files found!");
    process.exit(1);
  }
  return filesAsJson(schemas);
}

export default (program) =>
  program
    .command("sign")
    .description("Sign from a file")
    .argument(
      "<patterns...>",
      "Glob path(s) to JSON Schema(s), like schemas/**/2022-05/examples/**"
    )
    .addOption(
      new Option(
        "--type <type>",
        "Signature type (JWT, General JWS Serialisation)"
      ).choices(["jwt", "jws"])
    )
    .addOption(
      new Option(
        "--actors <actors...>",
        'Actor or list of actors separated by whitespace, like "alice" or "issuer issuer2"'
      ).choices(["alice", "bob", "issuer", "issuer2", "verifier"])
    )
    .action(async (patterns, options) => {
      try {
        const filesContent = await getFilesContent(patterns);
        const { type, actors } = options;

        if (type === "jwt" && actors.length > 1) {
          throw new Error(`Only one actor can sign with type "${type}"`);
        }

        const signedContent = await Promise.all(
          filesContent.map(async ({ name, json }) => {
            if (type === "jwt") {
              return {
                jwt: await signJwt(json, actors[0]),
                name,
              };
            }
            // jws
            return {
              jws: await signJws(json, actors),
              name,
            };
          })
        );

        console.log(`Actor(s) "${actors.join(" ")}" signatures`);
        console.log(JSON.stringify(signedContent, null, 2));
      } catch (ex) {
        console.error(ex);
        process.exit(1);
      }
    });
