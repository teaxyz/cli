import { readerFromStreamReader, copy, readAll } from "deno/streams/conversion.ts"
import { useFlags, usePrefix} from "hooks"
import { flatmap } from "utils"
import { Sha256 } from "deno/hash/sha256.ts"
import { encode } from "deno/encoding/hex.ts"
import { crypto } from "deno/crypto/mod.ts"


import Path from "path"

interface DownloadOptions {
  src: URL
  dst?: Path  /// default is our own unique cache path
  headers?: Record<string, string>
  ephemeral?: boolean  /// always download, do not rely on cache
}

async function download({ src, dst, headers, ephemeral }: DownloadOptions): Promise<[Path, {sha: string}]> {
  console.verbose({src: src, dst})

  const hash = (() => {
    let memo: Path
    return () => memo ?? (memo = hash_key(src))
  })()
  const mtime_entry = () => hash().join("mtime")

  const { numpty } = useFlags()
  dst ??= hash().join(src.path().basename())
  if (src.protocol === "file:") throw new Error()

  if (!ephemeral && mtime_entry().isFile() && dst.isReadableFile()) {
    headers ??= {}
    headers["If-Modified-Since"] = await mtime_entry().read()
    console.info({querying: src.toString()})
  } else {
    console.info({downloading: src.toString()})
  }

  // so the user can add private repos if they need to etc.
  if (/(^|\.)github.com$/.test(src.host)) {
    const token = Deno.env.get("GITHUB_TOKEN")
    if (token) {
      headers ??= {}
      headers["Authorization"] = `bearer ${token}`
    }
  }

  const rsp = await fetch(src, {headers})

  switch (rsp.status) {
  case 200: {
    if ("If-Modified-Since" in (headers ?? {})) {
      console.info({downloading: src})
    }

    const tee = rsp.body?.tee()!
    
    const rdr = tee[0].getReader()
    const rdrC = tee[1].getReader()

    if (!rdr) throw new Error()
    if (!rdrC) throw new Error()

    const r = readerFromStreamReader(rdr)
    const rC = readerFromStreamReader(rdrC)

    const local_SHA = await getlocalSHA(rC)
    console.log({local_SHA})
    
    dst.parent().mkpath()
    const f = await Deno.open(dst.string, {create: true, write: true, truncate: true})
    try {
      await copy(r, f)
    } finally {
      f.close()
    }

    //TODO etags too
    flatmap(rsp.headers.get("Last-Modified"), text =>
      mtime_entry().write({ text, force: true }))

    return [dst, {sha: local_SHA}]
  }
  case 304:
    console.verbose("304: not modified")
    return [dst, {sha: "No SHA for 304"}]
  default:
    if (numpty && dst.isFile()) {
      return [dst, {sha: "No SHA for"}]
    } else {
      throw new Error(`${rsp.status}: ${src}`)
    }
  }
}

async function getlocalSHA(r: Deno.Reader) {

  const buff = await readAll(r)
  const crypDigest= await crypto.subtle.digest("SHA-256", buff)
  const local = new TextDecoder().decode(encode(new Uint8Array(crypDigest)))
  return local
}

function hash_key(url: URL): Path {
  function hash(url: URL) {
    const formatted = `${url.pathname}${url.search ? "?" + url.search : ""}`
    return new Sha256().update(formatted).toString()
  }

  const prefix = usePrefix().www

  return prefix
    .join(url.protocol.slice(0, -1))
    .join(url.hostname)
    .join(hash(url))
    .mkpath()
}

export default function useDownload() {
  return { download, hash_key }
}
