import { useEffect, useState } from "react";
import { SAMPLE_FILES } from "../lib/config";
import { sha256Hex } from "../lib/hash";

let cached: Promise<string | null> | null = null;

/** SHA-256 of the bundled original sample file, computed locally via Web Crypto. */
export function useSampleHash(): string | null {
  const [hash, setHash] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    cached ??= fetch(SAMPLE_FILES[0].path)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("sample missing"))))
      .then((buf) => sha256Hex(buf))
      .catch(() => null);
    void cached.then((h) => alive && setHash(h));
    return () => {
      alive = false;
    };
  }, []);
  return hash;
}
