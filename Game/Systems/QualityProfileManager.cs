using UnityEngine;

namespace Nexoria.Systems
{
/// <summary>Profils qualité alignés sur WorldData/assets.json → quality_profiles.</summary>
    public class QualityProfileManager : MonoBehaviour
    {
        public enum Profile { LOW, MEDIUM, HIGH, ULTRA }

        public struct Budget
        {
            public int ViewDistanceM, ActiveChunks;
            public float LodBias, VegetationDensity, Particles;
            public int MaxDrawCalls, TextureMemoryMb;
            public string Shadows;
        }

        public static readonly Dictionary<Profile, Budget> Budgets = new()
        {
            [Profile.LOW]    = new Budget { ViewDistanceM = 768,  ActiveChunks = 12, LodBias = 1.6f, MaxDrawCalls = 220,  TextureMemoryMb = 220,  Shadows = "off",   VegetationDensity = 0.45f, Particles = 0.4f },
            [Profile.MEDIUM] = new Budget { ViewDistanceM = 1536, ActiveChunks = 25, LodBias = 1.2f, MaxDrawCalls = 380,  TextureMemoryMb = 420,  Shadows = "40m",   VegetationDensity = 0.7f,  Particles = 0.7f },
            [Profile.HIGH]   = new Budget { ViewDistanceM = 3072, ActiveChunks = 49, LodBias = 1.0f, MaxDrawCalls = 700,  TextureMemoryMb = 900,  Shadows = "80m",   VegetationDensity = 0.9f,  Particles = 1f },
            [Profile.ULTRA]  = new Budget { ViewDistanceM = 6144, ActiveChunks = 81, LodBias = 0.8f, MaxDrawCalls = 1200, TextureMemoryMb = 1800, Shadows = "200m",  VegetationDensity = 1f,    Particles = 1f },
        };

        public Profile Current { get; private set; } = Profile.MEDIUM;

        [SerializeField] private World.WorldStreamer _streamer;

        public void Apply(Profile p)
        {
            Current = p;
            var b = Budgets[p];
            QualitySettings.masterTextureLimit = p == Profile.LOW ? 2 : (p == Profile.MEDIUM ? 1 : 0);
            switch (b.Shadows)
            {
                case "off":
                    QualitySettings.shadowDistance = 0f; break;
                case "40m": QualitySettings.shadowDistance = 40f; break;
                case "80m": QualitySettings.shadowDistance = 80f; break;
                default:    QualitySettings.shadowDistance = 200f; break;
            }
            if (_streamer != null)
            {
                _streamer.ActiveRadiusChunks = p switch
                {
                    Profile.LOW => 2, Profile.MEDIUM => 3, Profile.HIGH => 4, _ => 5
                };
                _streamer.UnloadRadiusChunks = _streamer.ActiveRadiusChunks + 2;
            }
            Debug.Log($"[Quality] Profil {p} appliqué (vue {b.ViewDistanceM} m, {b.ActiveChunks} chunks)");
        }

        private void Start() => Apply(Profile.MEDIUM);

        private void Update()
        {
            // Android : bascule automatique si le framerate s'effondre (sécurité)
            if (Application.isMobilePlatform && Current != Profile.LOW &&
                Time.smoothDeltaTime > 1f / 24f && Time.time > 10f)
                Apply(Profile.LOW);
        }
    }
}
}
