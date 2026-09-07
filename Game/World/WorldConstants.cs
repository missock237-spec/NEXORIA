// NEXORIA — WorldConstants.cs
// Constantes monde, MIRROIR exact de Gen3ia/core.py. Ne modifier QUE via le moteur.
namespace Nexoria.World
{
    public static class WorldConstants
    {
        public const int WorldSeed = 0x4E455852;      // "NEXR" — identique à Gen3ia
        public const int WorldSize = 65536;           // mètres (64 km)
        public const float SeaLevel = 0f;
        public const int RegionSize = 4096;
        public const int ChunkSize = 256;
        public const int RegionsPerAxis = WorldSize / RegionSize;   // 16
        public const int ChunksPerAxis = WorldSize / ChunkSize;     // 256
        public const int RegionMapRes = 256;                        // heightmap 256²
        public const float HeightMin = -4096f;
        public const float HeightMax = 6144f;

        /// <summary>Indices de grille région (0..15) depuis une position monde.</summary>
        public static void WorldToRegion(float x, float z, out int gx, out int gy)
        {
            gx = MathfClamp((int)((x + WorldSize / 2) / RegionSize), 0, RegionsPerAxis - 1);
            gy = MathfClamp((int)((z + WorldSize / 2) / RegionSize), 0, RegionsPerAxis - 1);
        }

        /// <summary>ID de région "REGION_XXX" (index 1-based, balayage sud→nord).</summary>
        public static string RegionId(int gx, int gy)
        {
            int index = gy * RegionsPerAxis + gx + 1;
            return "REGION_" + index.ToString("000");
        }

        /// <summary>ID de chunk global "CHUNK_cgx_cgy".</summary>
        public static string ChunkId(int cgx, int cgy) => $"CHUNK_{cgx:000}_{cgy:000}";

        /// <summary>Pixels carte (rangée 0 = nord) à la résolution donnée.</summary>
        public static void WorldToMap(float x, float z, int res, out float px, out float py)
        {
            px = (x + WorldSize / 2f) / WorldSize * res;
            py = (1f - (z + WorldSize / 2f) / WorldSize) * res;
        }

        /// <summary>Décode une valeur 16 bits (0..65535) en altitude mètres.</summary>
        public static float DecodeHeight(ushort v) => HeightMin + v / 65535f * (HeightMax - HeightMin);

        private static int MathfClamp(int v, int lo, int hi) => v < lo ? lo : (v > hi ? hi : v);
    }
}
