// Copyright 2021 Deno Land Inc. All rights reserved. MIT license.

import { error } from "../error.ts";
import { semverGreaterThanOrEquals, semverValid } from "../../deps.ts";
import { VERSION } from "../version.ts";

const help = `deployctl upgrade
Upgrade deployctl to the given version (defaults to latest).

The version is downloaded from https://deno.land/x/deploy/deployctl.ts

USAGE:
    deployctl upgrade [OPTIONS] [<version>]

OPTIONS:
    -h, --help                Prints help information

ARGS:
    <version>
             The version to upgrade to
`;

export interface Args {
  help: boolean;
  version: string;
}

// deno-lint-ignore no-explicit-any
export default async function (rawArgs: Record<string, any>): Promise<void> {
  const version = rawArgs.V ?? rawArgs.version;
  const args: Args = {
    help: !!rawArgs.help,
    version: typeof version === "boolean" ? "" : String(version),
  };
  if (args.help) {
    console.log(help);
    Deno.exit();
  }
  if (rawArgs._.length > 1) {
    console.error(help);
    error("Too many positional arguments given.");
  }
  if (args.version && !semverValid(args.version)) {
    error(`The provided version is invalid.`);
  }

  const { latest, versions } = await getVersions().catch((err: TypeError) => {
    error(err.message);
  });
  if (args.version && !versions.includes(args.version)) {
    error("The provided version is not found.");
  }

  if (!args.version && semverGreaterThanOrEquals(VERSION, latest)) {
    console.log("You're using the latest version.");
    Deno.exit();
  } else {
    const process = Deno.run({
      cmd: [
        Deno.execPath(),
        "install",
        "--allow-read",
        "--allow-write",
        "--allow-env",
        "--allow-net",
        "--allow-run",
        "--no-check",
        "-f",
        `https://deno.land/x/deploy@${
          args.version ? args.version : latest
        }/deployctl.ts`,
      ],
    });
    await process.status();
  }
}

export async function getVersions(): Promise<
  { latest: string; versions: string[] }
> {
  const response = await fetch(
    "https://cdn.deno.land/deploy/meta/versions.json",
  );
  if (!response.ok) {
    throw new Error(
      "couldn't fetch the latest version - try again after sometime",
    );
  }

  return await response.json();
}
