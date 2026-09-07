// NEXORIA — SpawnDirector.cs (ÉTAPE 15 — apparition/disparition des monstres)
// Densités par biome + niveau recommandé + exposition Suprême (remplacement
// progressif des familles de monstres par la cour du Suprême local).
using System.Collections.Generic;
using UnityEngine;

namespace Nexoria.Monsters
{
    public class SpawnDirector : MonoBehaviour
    {
        [Header("Liens")]
        public World.WorldDatabase Db;

        [Header("Budgets")]
        public int MaxActiveMonsters = 40;          // profil LOW : 20
        public float DespawnRadius = 320f;
        public float RespawnSeconds = 90f;

        private readonly List<GameObject> _active = new();
        private float _nextTick;

        // Familles de monstres par biome (miroir de Gen3ia/regions.py, ordre = priorité de corruption)
        private static readonly Dictionary<string, string[]> BiomeMonsters = new()
        {
            ["temperate_forest"] = new[] { "Sanglier d'ombre", "Bandit", "Esprit sylvestre" },
            ["grassland"]        = new[] { "Gnou sauvage", "Pillard", "Chimère" },
            ["taiga"]            = new[] { "Loup", "Araignée géante" },
            ["desert"]           = new[] { "Scorpion géant", "Momie", "Ver des sables" },
            ["jungle"]           = new[] { "Serpent constrictor", "Essaim-insectes", "Naga" },
            ["alpine_rock"]      = new[] { "Harpyie", "Golem", "Griffon" },
            ["swamp"]            = new[] { "Crocodile géant", "Spectre des marais" },
            ["volcanic"]         = new[] { "Élémentaire de feu", "Magma-bête" },
            ["ice_sheet"]        = new[] { "Loup des glaces", "Élémentaire de givre" },
            ["coast"]            = new[] { "Crabe géant", "Sahuagin" },
        };

        private void Update()
        {
            if (Db == null || Time.time < _nextTick) return;
            _nextTick = Time.time + 2f;

            _active.RemoveAll(m => m == null || Vector3.Distance(m.transform.position, PlayerPos()) > DespawnRadius);

            if (_active.Count >= MaxActiveMonsters) return;

            var region = Db.RegionAt(PlayerPos().x, PlayerPos().z);
            if (region == null || region.land_fraction < 0.3f) return;

            float exposure = Db.SupremeExposureAt(PlayerPos().x, PlayerPos().z);
            string[] pool = BuildPool(region.dominant_biome, region.monsters, exposure);
            if (pool.Length == 0) return;

            Vector3 spawn = PickSpawnPoint();
            if (spawn == Vector3.zero) return;

            Debug.Log($"[Spawn] {pool[Random.Range(0, pool.Length)]} (niveau {region.recommended_level}" +
                      (exposure > 0.15f ? $", corruption {exposure:P0})" : ")"));
            // Production : Instantiate(prefab, spawn, Quaternion.identity) + pooling
        }

        private string[] BuildPool(string biome, string[] regionMonsters, float exposure)
        {
            var list = new List<string>(BiomeMonsters.TryGetValue(biome, out var baseM) ? baseM : regionMonsters ?? new string[0]);
            if (exposure > 0.3f)
            {
                // la cour du Suprême remplace progressivement la faune normale
                int replace = Mathf.CeilToInt(list.Count * exposure);
                for (int i = 0; i < list.Count && replace > 0; i++)
                    if (Random.value < exposure) { list[i] = "Cour du Suprême"; replace--; }
            }
            return list.ToArray();
        }

        private Vector3 PlayerPos() => Camera.main != null ? Camera.main.transform.position : Vector3.zero;

        private Vector3 PickSpawnPoint()
        {
            for (int i = 0; i < 12; i++)
            {
                Vector2 r = Random.insideUnitCircle * 160f;
                Vector3 p = PlayerPos() + new Vector3(r.x, 0f, r.y);
                if (Vector3.Distance(p, PlayerPos()) > 90f) return p;
            }
            return Vector3.zero;
        }
    }
}
