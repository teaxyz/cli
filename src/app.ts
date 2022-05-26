import useVirtualEnv from "hooks/useVirtualEnv.ts"
import useFlags, { useArgs } from "hooks/useFlags.ts"
import { print, undent, run, flatMap } from "utils"
import hydrate from "./prefab/hydrate.ts"
import resolve from "./prefab/resolve.ts"
import install from "./prefab/install.ts"
import { lvl1 as link } from "./prefab/link.ts"
import useShellEnv from "hooks/useShellEnv.ts"
import useCellar from "hooks/useCellar.ts"
import useScript from "hooks/useScript.ts"
import usePantry from "hooks/usePantry.ts"

const args = useArgs(Deno.args)
const { silent, verbose } = useFlags()

try {
  if (verbose) {
    console.log("tea 0.1.0")
  }

  if (args.cd) {
    console.verbose({chdir: args.cd})
    Deno.chdir(args.cd.string)
  }

  switch (args.mode) {
    case "dump": {
      if (args.script) throw new Error("unimpl")

      const blueprint = await flatMap(args.env, useVirtualEnv)
        ?.swallow(/^not-found:/) // no blueprint is not an error for this scenario

      console.verbose({ blueprint })

      if (blueprint?.srcroot) {
        await print(`export SRCROOT=${blueprint.srcroot}`)
      } else if (Deno.env.get("SRCROOT")) {
        await print("unset SRCROOT")
      }

      const { combinedStrings: vars, pending } = await useShellEnv(blueprint?.requirements ?? [])

      //TODO if PATH is the same as the current PATH maybe don't do it
      // though that makes the behavior of --env --dump very specific

      for (const [key, value] of Object.entries(vars)) {
        await print(value
          ? `export ${key}=${value}`
          : `unset ${key}`)
      }
      if (blueprint?.version) {
        await print(`export VERSION=${blueprint.version}`)
      }

      if (pending.length) {
        const pantry = usePantry()
        let rv = undent`
          command_not_found_handler() {
            case $0 in

          `
        for (const pkg of pending) {
          const cmds = (await pantry.getProvides(pkg)).join("|")
          rv += `  ${cmds}) tea --exec ${pkg.project}@'${pkg.constraint}' -- "$@";;\n`
        }
        rv += "  esac\n}"

        await print(rv)
      }

    } break

    case "run": {
      const cellar = useCellar()
      const blueprint = await flatMap(args.env, useVirtualEnv)
      const script = await useScript(args.script, blueprint?.srcroot)
      const explicitDeps = [...blueprint?.requirements ?? [], ...script.deps] //TODO need to resolve intersections
      const dry = explicitDeps.filter(x => !cellar.isInstalled(x))
      const wet = await hydrate(dry)
      const gas = await resolve(wet)
      for (const pkg of gas) {
        console.info({ installing: pkg })
        const installation = await install(pkg)
        await link(installation)
      }

      const env = (await useShellEnv(explicitDeps)).combinedStrings
      if (blueprint) env["SRCROOT"] = blueprint.srcroot.string

      const cmd = [...script.args, ...args.scriptArgs]
      await run({ cmd, env }) //TODO deno needs an `execvp`
    } break

    case "exec": {
      const cellar = useCellar()
      let installation = await cellar.isInstalled(args.pkg)
      if (!installation) {
        const wet = await hydrate([args.pkg])
        const gas = await resolve(wet)
        for (const pkg of gas) {
          if (await cellar.isInstalled(pkg)) continue
          console.info({ installing: pkg })
          installation = await install(pkg)
          await link(installation)
        }
      }

      //TODO needs env since it won't be set
      const cmd = [
        installation!.path.join("bin", args.cmd),
        ...args.args
      ]

      await run({cmd})

    } break

    case "help":
      print(undent`
        usage:
          tea [-Ed] [options] [file|URL]

        modes:                                        magic?
    05    --dump,-d      don’t execute, dump script
          --help,-h      don’t execute, show help

        flags:
          --env,-E       inject virtual environment     ✨
    10    --json         output json (where possible)
          --muggle,-m    disable magic
          --verbose,-v   eg. tea -vv
          --silent,-s    no chat, no errors
          --cd,-C        change directory first
    15
        environment variables:
          VERBOSE        {-1: silent, 0: default, 1: verbose, 2: debug}

        manual:
    20    https://tea.xyz/README/
        `)
        //HEYU! did you exceed 22 lines? Don’t! That’s the limit!
  }
} catch (err) {
  if (silent) {
    Deno.exit(1)
  } else {
    throw err
  }
}
