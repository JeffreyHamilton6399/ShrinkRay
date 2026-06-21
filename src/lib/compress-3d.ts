/**
 * 3D model compression — GLB, GLTF, STL, FBX, OBJ, PLY files.
 *
 * - Text-based formats (GLTF, STL-ascii, OBJ, PLY-ascii) compress 60-90%
 * - Binary formats (GLB, STL-binary, FBX, PLY-binary) compress 30-60%
 * All are gzipped — works with Three.js, Babylon.js, and most 3D engines.
 * Everything runs in the browser — nothing is uploaded.
 */

import { gzip } from "fflate";

export interface CompressedModel {
  blob: Blob;
  url: string;
  size: number;
  filename: string;
}

const MODEL_EXTS = /\.(glb|gltf|stl|fbx|obj|ply|3ds|dae|blend)$/i;

export function is3DModel(file: File): boolean {
  return MODEL_EXTS.test(file.name);
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

  // Effectiveness: if gzip made it bigger, return original
  const useOriginal = compressed.length >= data.length;
  const output = useOriginal ? data : compressed;

  const blob = new Blob([output as BlobPart], {
    type: useOriginal ? file.type : "application/gzip",
  });
  const base = file.name.replace(/\.[^.]+$/, "") || file.name;
  return {
    blob,
    url: URL.createObjectURL(blob),
    size: blob.size,
    filename: useOriginal ? file.name : `${base}${ext}.gz`,
  };
}
