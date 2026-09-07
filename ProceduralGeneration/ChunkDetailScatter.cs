// NEXORIA — ChunkDetailScatter.cs (ProceduralGeneration/runtime)
// Instanciation déterministe de la végétation d'un chunk à partir de
// WorldData/vegetation/REGION_XXX.json (species_mix + density_map_32).
// La même seed chunk → la même forêt sur tous les clients (MMO-friendly).
using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

namespace Nexoria.ProceduralGeneration
{
    public class ChunkDetailScatter : MonoBehaviour
    {
        [Serializable] public class VegetationRegion
        {
            public string region;
            public string dominant_biome;
            public float density_multiplier;
            public int[][] density_map_32;      // 32×32
            public Dictionary<string, float> species_mix;
            public Specimen[] specimens;
        }
        [Serializable] public class Specimen
        {
            public float[] local_m;
            public string kind, species;
            public float height_m;
            public int seed;
        }

        [Header("Catalogue prefabs (clé = species du JSON)")]
        public List<PrefabPair> Prefabs = new();
        [Serializable] public class PrefabPair { public string Species; public GameObject Prefab; }

        [Header("Réglages")]
        public float DensityScale = 1f;         // × profil qualité (LOW 0.45)
        public int ChunkSize = 256;

        private readonly Dictionary<string, GameObject> _bySpecies = new();

        private void Awake()
        {
            foreach (var p in Prefabs) _bySpecies[p.Species] = p.Prefab;
        }

        /// <summary>Peuple un chunk (localCx, localCy 0..15) d'une région. Déterministe.</summary>
        public int ScatterChunk(string regionId, int localCx, int localCy, Transform parent)
        {
            string file = Path.Combine(Application.streamingAssetsPath, "WorldData/vegetation", regionId + ".json");
            if (!File.Exists(file)) return 0;
            var veg = JsonConvert.DeserializeObject<VegetationRegion>(File.ReadAllText(file));

            var rng = new System.Random(Hash(regionId) * 1000 + localCy * 16 + localCx);
            int placed = 0;
            // résolution de la carte de densité : 32 cellules sur 256 m → cellule 8 m
            float cell = ChunkSize / 32f;
            for (int sy = 0; sy < 32; sy++)
            for (int sx = 0; sx < 32; sx++)
            {
                // cellule appartient-elle à CE chunk ?
                float lx = sx * cell, lz = sy * cell;
                if ((int)(lx / ChunkSize) != localCx || (int)(lz / ChunkSize) != localCy) continue;

                float density = veg.density_map_32[sy][sx] / 255f * veg.density_multiplier * DensityScale;
                if (density <= 0.02f) continue;
                int attempts = (int)(density * 14);          // budget par cellule 8 m
                for (int a = 0; a < attempts; a++)
                {
                    string species = PickSpecies(veg.species_mix, rng);
                    if (!_bySpecies.TryGetValue(species, out var prefab)) continue;
                    float px = lx + (float)rng.NextDouble() * cell;
                    float pz = lz + (float)rng.NextDouble() * cell;
                    Vector3 pos = parent.position + new Vector3(px, 0f, pz);
                    // Y = terrain via World.WorldStreamer / TerrainChunkBuilder (branchement)
                    var go = Instantiate(prefab, pos, Quaternion.Euler(0f, (float)rng.NextDouble() * 360f, 0f), parent);
                    float s = 0.8f + (float)rng.NextDouble() * 0.5f;
                    go.transform.localScale = new Vector3(s, s * (0.9f + (float)rng.NextDouble() * 0.3f), s);
                    placed++;
                }
            }
            return placed;
        }

        private string PickSpecies(Dictionary<string, float> mix, System.Random rng)
        {
            float total = 0f;
            foreach (var kv in mix) total += kv.Value;
            double pick = rng.NextDouble() * total;
            foreach (var kv in mix)
            {
                pick -= kv.Value;
                if (pick <= 0) return kv.Key;
            }
            return "rock_small";
        }

        private static int Hash(string s)
        {
            unchecked
            {
                int h = 23;
                foreach (char c in s) h = h * 31 + c;
                return h;
            }
        }
    }
}
