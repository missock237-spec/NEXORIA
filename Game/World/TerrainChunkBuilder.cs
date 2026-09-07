// NEXORIA — TerrainChunkBuilder.cs
// Construit un mesh de chunk 256 m depuis la heightmap de sa région (lecture RAW16).
// LOD0 = 64² verts (4 m), LOD1 = 32², LOD2 = 16². Pooling complet (zéro GC en jeu).
using System;
using System.IO;
using UnityEngine;

namespace Nexoria.World
{
    public static class TerrainChunkBuilder
    {
        private const int RegionRes = WorldConstants.RegionMapRes; // 256 px / région
        private const float RegionMpp = WorldConstants.RegionSize / (float)RegionRes;

        private static readonly int[] LodRes = { 64, 32, 16 };

        /// <summary>
        /// Lit le .raw16 de la région et retourne la hauteur (m) au pixel (px, py) région.
        /// </summary>
        public static float SampleRegionHeight(string regionId, int px, int py, ushort[] raw)
        {
            px = Mathf.Clamp(px, 0, RegionRes - 1);
            py = Mathf.Clamp(py, 0, RegionRes - 1);
            return WorldConstants.DecodeHeight(raw[py * RegionRes + px]);
        }

        /// <summary>Charge le raw16 d'une région (256² u16, little-endian).</summary>
        public static ushort[] LoadRegionRaw(string regionId)
        {
            string path = Path.Combine(Application.streamingAssetsPath, "WorldData/heightmaps", regionId + ".raw16");
            byte[] bytes = File.ReadAllBytes(path);
            var raw = new ushort[RegionRes * RegionRes];
            Buffer.BlockCopy(bytes, 0, raw, 0, bytes.Length);
            return raw;
        }

        /// <summary>
        /// Construit (ou récupère du pool) le mesh d'un chunk à un niveau de LOD.
        /// cgx/cgy : indices GLOBAUX de chunk (0..255). row 0 du raw = nord.
        /// </summary>
        public static Mesh BuildChunkMesh(ushort[] regionRaw, int regionGx, int regionGy,
                                          int localCx, int localCy, int lod,
                                          Mesh reusable = null)
        {
            int res = LodRes[Mathf.Clamp(lod, 0, 2)];
            float step = WorldConstants.ChunkSize / (float)(res - 1);
            int px0 = localCx * 16, py0 = localCy * 16;      // 16 px de raw par chunk

            var mesh = reusable ?? new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt16 };
            int vCount = res * res;
            var verts = new Vector3[vCount];
            var uvs = new Vector2[vCount];

            for (int j = 0; j < res; j++)
            {
                int py = Mathf.Clamp(py0 + (j * 16) / (res - 1), 0, RegionRes - 1);   // j=0 → nord
                for (int i = 0; i < res; i++)
                {
                    int px = Mathf.Clamp(px0 + (i * 16) / (res - 1), 0, RegionRes - 1);
                    float h = WorldConstants.DecodeHeight(regionRaw[py * RegionRes + px]);
                    float x = (regionGx * WorldConstants.RegionSize + localCx * WorldConstants.ChunkSize + i * step)
                              - WorldConstants.WorldSize / 2f;
                    // j=0 = nord → Z max du chunk
                    float z = (regionGy * WorldConstants.RegionSize + (localCy + 1) * WorldConstants.ChunkSize - j * step)
                              - WorldConstants.WorldSize / 2f;
                    int idx = j * res + i;
                    verts[idx] = new Vector3(x, h, z);
                    uvs[idx] = new Vector2(i / (float)(res - 1), j / (float)(res - 1));
                }
            }

            int fCount = (res - 1) * (res - 1) * 6;
            var tris = new int[fCount];
            int t = 0;
            for (int j = 0; j < res - 1; j++)
            for (int i = 0; i < res - 1; i++)
            {
                int a = j * res + i, b = a + 1, c = a + res, d = c + 1;
                tris[t++] = a; tris[t++] = c; tris[t++] = b;
                tris[t++] = b; tris[t++] = c; tris[t++] = d;
            }

            mesh.Clear();
            mesh.vertices = verts;
            mesh.uv = uvs;
            mesh.triangles = tris;
            mesh.RecalculateNormals();
            return mesh;
        }

        /// <summary>Aplomb terrain : hauteur interpolée bilinéaire depuis le raw (pour poser les props).</summary>
        public static float HeightAtWorld(ushort[] regionRaw, int regionGx, int regionGy, float wx, float wz)
        {
            float lx = (wx + WorldConstants.WorldSize / 2f) - regionGx * WorldConstants.RegionSize;
            float lz = (wz + WorldConstants.WorldSize / 2f) - regionGy * WorldConstants.RegionSize;
            float fx = lx / RegionMpp, fz = lz / RegionMpp;
            int x0 = Mathf.Clamp((int)fx, 0, RegionRes - 2), y0 = Mathf.Clamp((int)fz, 0, RegionRes - 2);
            float tx = fx - x0, tz = fz - y0;
            // row 0 = nord → index ligne = py
            int pyNorth = RegionRes - 1 - y0, pySouth = RegionRes - 1 - (y0 + 1);
            float hN = Mathf.Lerp(regionRaw[pyNorth * RegionRes + x0], regionRaw[pyNorth * RegionRes + x0 + 1], tx);
            float hS = Mathf.Lerp(regionRaw[pySouth * RegionRes + x0], regionRaw[pySouth * RegionRes + x0 + 1], tx);
            return Mathf.Lerp(hN, hS, tz);
        }
    }
}
