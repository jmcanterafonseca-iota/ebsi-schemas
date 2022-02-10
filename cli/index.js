import { Command } from "commander";
import dotenv from "dotenv";
import computeId from "./commands/compute-id.js";
import publish from "./commands/publish.js";

export default function run() {
  dotenv.config();

  const program = new Command();

  program
    .name("ejsc")
    .description("CLI providing utilies for working with JSON Schemas")
    .version("1.0.0");

  // Add "compute-id" command
  computeId(program);

  // Add "publish" command
  publish(program);

  program.parse();
}
