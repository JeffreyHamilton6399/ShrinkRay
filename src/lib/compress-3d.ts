/**
 * 3D model compression — GLB and GLTF files.
 *
 * GLTF (.gltf) is JSON text → gzip works extremely well (60-80% reduction).
 * GLB (.glb) is binary → gzip still gives 30-50% reduction on most models.
 * Both are served as .glb.gz / .gltf.gz — browsers and 3D engines decompress
 * on the fly. Everything runs in the browser — nothing is uploaded.
 */

import { gzip } from "fflate";

export interface CompressedModel {
  blob: Blob;
  url: string;
  size: number;
  filename: string;
}

export function is3DModel(file: File): boolean {
  return /\.(glb|gltf)$/i.test(file.name);
}

export async function compress3DModel(file: File): Promise<CompressedModel> {
  const data = new Uint8Array(await file.arrayBuffer());
  const ext = file.name.match(/\.[^.]+$/)?.[0].toLowerCase() || ".glb";

  const compressed = await new Promise<Uint8Array>((resolve, reject) => {
    gzip(
      data,
      { level: 9 },
      (err, out) => (err ? reject(err) : resolve(out))
    );
  });

  const blob = new Blob([compressed as BlobPart], {
    type: "application/gzip",
  });
  const base = file.name.replace(/\.[^.]+$/, "") || file.name;
  return {
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    filename: `${base}${ext}.gz`,
  };
}
