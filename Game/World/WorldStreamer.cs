// NEXORIA — WorldStreamer.cs (ÉTAPE 16)
// Streaming par anneau : charge/décharge les chunks autour du joueur, file de
// priorité, worker asynchrone, pool de GameObjects. Compatible LOW→ULTRA.
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Nexoria.World
{
    public class WorldStreamer : MonoBehaviour
    {
        public static WorldStreamer Instance { get; private set; }

        [Header("Références")]
        public Transform Player;
        public Material TerrainMaterial;

        [Header("Paramètres (écrasés par QualityProfileManager)")]
        public int ActiveRadiusChunks = 4;      // 4 → 9×9 chunks (profil HIGH)
        public int UnloadRadiusChunks = 6;
        public float RefreshInterval = 0.25f;

        private class ChunkSlot
        {
            public int Cgx, Cgy;
            public GameObject Go;
            public MeshFilter Mf;
            public Mesh Mesh;
            public int Lod = -1;
            public string RegionId;
            public bool Loaded;
        }

        private readonly Dictionary<long, ChunkSlot> _slots = new();
        private readonly Queue<ChunkSlot> _pending = new();
        private Coroutine _loop;
        private float _lastRefresh;

        private void Awake()
        {
            Instance = this;
        }

        private void Start()
        {
            if (Player == null && Camera.main != null) Player = Camera.main.transform;
            _loop = StartCoroutine(StreamLoop());
        }

        private static long Key(int cgx, int cgy) => ((long)cgx << 32) ^ (uint)cgy;

        private IEnumerator StreamLoop()
        {
            while (true)
            {
                if (Player != null && Time.time - _lastRefresh > RefreshInterval && _pending.Count == 0)
                {
                    _lastRefresh = Time.time;
                    RefreshRing();
                }
                if (_pending.Count > 0)
                {
                    var slot = _pending.Dequeue();
                    yield return BuildSlot(slot);     // étalé sur plusieurs frames
                }
                else yield return null;
            }
        }

        private void RefreshRing()
        {
            WorldConstants.WorldToRegion(Player.position.x, Player.position.z, out int rgx, out int rgy);
            int ccx = rgx * 16 + Mathf.Clamp((int)(((Player.position.x + 32768) % 4096) / 256), 0, 15);
            int ccy = rgy * 16 + Mathf.Clamp((int)(((Player.position.z + 32768) % 4096) / 256), 0, 15);

            // 1) demander les chunks manquants / changement de LOD
            var wanted = new List<(int, int, int)>();   // (cgx, cgy, lod)
            for (int dy = -ActiveRadiusChunks; dy <= ActiveRadiusChunks; dy++)
            for (int dx = -ActiveRadiusChunks; dx <= ActiveRadiusChunks; dx++)
            {
                int cgx = ccx + dx, cgy = ccy + dy;
                if (cgx < 0 || cgy < 0 || cgx >= WorldConstants.ChunksPerAxis || cgy >= WorldConstants.ChunksPerAxis) continue;
                int dist = Mathf.Max(Mathf.Abs(dx), Mathf.Abs(dy));
                int lod = dist <= 2 ? 0 : (dist <= 4 ? 1 : 2);
                wanted.Add((cgx, cgy, lod));
            }

            foreach (var (cgx, cgy, lod) in wanted)
            {
                long k = Key(cgx, cgy);
                if (!_slots.TryGetValue(k, out var slot))
                {
                    slot = new ChunkSlot { Cgx = cgx, Cgy = cgy };
                    _slots[k] = slot;
                }
                bool needsBuild = !slot.Loaded || slot.Lod != lod;
                if (needsBuild && !_pending.Contains(slot)) _pending.Enqueue(slot);
            }

            // 2) décharger les chunks trop loin
            foreach (var kv in _slots)
            {
                var s = kv.Value;
                if (!s.Loaded) continue;
                int ddx = Mathf.Abs(s.Cgx - ccx), ddy = Mathf.Abs(s.Cgy - ccy);
                if (Mathf.Max(ddx, ddy) > UnloadRadiusChunks) Release(s);
            }
        }

        private IEnumerator BuildSlot(ChunkSlot slot)
        {
            int rgx = slot.Cgx / 16, rgy = slot.Cgy / 16;
            string regionId = WorldConstants.RegionId(rgx, rgy);
            int lod = 0;
            // LOD cible recalculé au moment de la construction
            if (Player != null)
            {
                int dist = Mathf.Max(Mathf.Abs(slot.Cgx - ChunkXOfPlayer()), Mathf.Abs(slot.Cgy - ChunkYOfPlayer()));
                lod = dist <= 2 ? 0 : (dist <= 4 ? 1 : 2);
            }

            ushort[] raw = null;
            yield return System.Threading.Tasks.Task.Run(() => raw = TerrainChunkBuilder.LoadRegionRaw(regionId));
            if (raw == null) yield break;

            int localCx = slot.Cgx % 16, localCy = slot.Cgy % 16;
            if (slot.Go == null)
            {
                slot.Go = new GameObject($"CHUNK_{slot.Cgx:000}_{slot.Cgy:000}");
                slot.Mf = slot.Go.AddComponent<MeshFilter>();
                slot.Go.AddComponent<MeshRenderer>().sharedMaterial = TerrainMaterial;
            }
            slot.Mesh = TerrainChunkBuilder.BuildChunkMesh(raw, rgx, rgy, localCx, localCy, lod, slot.Mesh);
            slot.Mf.sharedMesh = slot.Mesh;
            slot.Lod = lod;
            slot.RegionId = regionId;
            slot.Loaded = true;
            yield return null;
        }

        private int ChunkXOfPlayer() =>
            Mathf.Clamp((int)((Player.position.x + WorldConstants.WorldSize / 2f) / WorldConstants.ChunkSize), 0, 255);
        private int ChunkYOfPlayer() =>
            Mathf.Clamp((int)((Player.position.z + WorldConstants.WorldSize / 2f) / WorldConstants.ChunkSize), 0, 255);

        private void Release(ChunkSlot s)
        {
            if (s.Go != null) { s.Go.SetActive(false); Destroy(s.Go); }
            if (s.Mesh != null) Destroy(s.Mesh);
            s.Loaded = false;
            s.Lod = -1;
        }
    }
}
