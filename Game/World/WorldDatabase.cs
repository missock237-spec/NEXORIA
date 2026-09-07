// NEXORIA — WorldDatabase.cs
// Chargement et requêtes des bases de données JSON du monde (WorldData/).
// Dépendance : com.unity.nuget.newtonsoft-json (Package Manager).
using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

namespace Nexoria.World
{
    // ---------- Modèles (sous-ensembles utiles au runtime) ----------
    [Serializable] public class RegionDef
    {
        public string id;
        public int index;
        public string name;
        public string kind;
        public int[] grid;
        public float[] bounds_world;
        public float[] center_world;
        public string continent;
        public string dominant_biome;
        public float land_fraction;
        public float[] altitude_min_max_mean; // rempli via altitude
        public Altitude altitude;
        public Climate climate;
        public int recommended_level;
        public string[] resources;
        public string[] monsters;
        public string[] dangers;
        public Connection[] connections;
        public float supreme_exposure;
        [Serializable] public class Altitude { public float min_m, max_m, mean_m; }
        [Serializable] public class Climate { public float temp, moist; }
        [Serializable] public class Connection { public string id, name, type; }
    }

    [Serializable] public class PoiDef
    {
        public string id, type, name;
        public float[] world;
        public string region, biome;
        public bool hidden_secret;
        public float supreme_exposure;
    }

    [Serializable] public class SettlementDef
    {
        public string id, name, size_class;
        public float[] world;
        public string region, continent, culture;
        public bool coastal, port;
        public int population;
    }

    [Serializable] public class SupremeDef
    {
        public string id, key, name, element;
        public int difficulty;
        public float[] lair_world;
        public string lair_region, lair_dungeon;
        public float territory_radius_m;
        public string biome_override, corruption_color, lore;
        public Corruption corruption;
        [Serializable] public class Corruption
        {
            public string[] weather, monsters, signs;
            public string light, music, npc_behaviour;
        }
    }

    // ---------- Base ----------
    [DefaultExecutionOrder(-1000)]
    public class WorldDatabase : MonoBehaviour
    {
        public static WorldDatabase Instance { get; private set; }

        [Tooltip("Dossier WorldData copié dans StreamingAssets")]
        public string dataFolder = "WorldData";

        public Dictionary<string, RegionDef> Regions = new();
        public List<PoiDef> Poi = new();
        public List<SettlementDef> Settlements = new();
        public List<SupremeDef> Supremes = new();
        public string StarterSettlement;

        public Texture2D[] RegionHeightmaps;   // indexé par regionIndex-1 (256)

        private void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            LoadAll();
        }

        public string Path(string file) =>
            PathCombine(Application.streamingAssetsPath, dataFolder, file);

        private static string PathCombine(params string[] parts)
        {
            string p = parts[0];
            for (int i = 1; i < parts.Length; i++) p = Path.Combine(p, parts[i]);
            return p;
        }

        public void LoadAll()
        {
            Regions = LoadDict<RegionDef>("regions.json", r => r.id);
            Poi = LoadList<PoiDef>("poi.json", "poi");
            Settlements = LoadList<SettlementDef>("settlements.json", "settlements");
            Supremes = LoadList<SupremeDef>("supremes.json", "supremes");
            StarterSettlement = JsonConvert.DeserializeObject<Dictionary<string, string>>(
                File.ReadAllText(Path("settlements.json")))["starter_settlement"];
            LoadHeightmaps();
            Debug.Log($"[WorldDatabase] {Regions.Count} régions, {Poi.Count} POI, " +
                      $"{Settlements.Count} établissements, {Supremes.Count} Suprêmes. Départ : {StarterSettlement}");
        }

        private Dictionary<string, T> LoadDict<T>(string file, Func<T, string> key)
        {
            var root = JsonConvert.DeserializeObject<Dictionary<string, List<T>>>(File.ReadAllText(Path(file)));
            var dict = new Dictionary<string, T>();
            foreach (var item in root["regions"]) dict[key(item)] = item;
            return dict;
        }

        private List<T> LoadList<T>(string file, string field)
        {
            var root = JsonConvert.DeserializeObject<Dictionary<string, List<T>>>(File.ReadAllText(Path(file)));
            return root[field];
        }

        /// <summary>Charge les 256 PNG16 en mémo (ajuster : charger à la demande en production).</summary>
        private void LoadHeightmaps()
        {
            RegionHeightmaps = new Texture2D[WorldConstants.RegionsPerAxis * WorldConstants.RegionsPerAxis];
            for (int gy = 0; gy < WorldConstants.RegionsPerAxis; gy++)
            for (int gx = 0; gx < WorldConstants.RegionsPerAxis; gx++)
            {
                string id = WorldConstants.RegionId(gx, gy);
                string file = PathCombine(Path("heightmaps"), id + ".png");
                if (!File.Exists(file)) continue;
                byte[] bytes = File.ReadAllBytes(file);
                var tex = new Texture2D(WorldConstants.RegionMapRes, WorldConstants.RegionMapRes,
                                        TextureFormat.RGBA64, false, true) // conteneur ; on relit les octets bruts
                { wrapMode = TextureWrapMode.Clamp };
                // Lecture 16 bits réelle : PNG → décodage via ImageConversion puis copie R16
                tex.LoadImage(bytes);           // décode le PNG (8 bits par canal)
                RegionHeightmaps[gy * 16 + gx] = tex;
                // NOTE PRODUCTION : préférer Texture2D(R16) + copie brute du .raw16 :
                // var raw = File.ReadAllBytes(id + ".raw16"); tex.SetPixelData(raw, 0);
            }
        }

        // ---------- Requêtes ----------
        public RegionDef RegionAt(float x, float z)
        {
            WorldConstants.WorldToRegion(x, z, out int gx, out int gy);
            return Regions.TryGetValue(WorldConstants.RegionId(gx, gy), out var r) ? r : null;
        }

        public float SupremeExposureAt(float x, float z)
        {
            float exposure = 0f;
            foreach (var s in Supremes)
            {
                float dx = x - s.lair_world[0], dz = z - s.lair_world[1];
                float d = Mathf.Sqrt(dx * dx + dz * dz);
                exposure = Mathf.Max(exposure, Mathf.Clamp01(1f - d / (s.territory_radius_m * 2.2f)));
            }
            return exposure;
        }
    }
}
