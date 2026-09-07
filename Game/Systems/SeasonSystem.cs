// NEXORIA — SeasonSystem.cs + QualityProfileManager.cs (ÉTAPES 15-16)
// Saisons (4 × 24-26 jours) et profils qualité LOW/MEDIUM/HIGH/ULTRA.
using UnityEngine;

namespace Nexoria.Systems
{
    public class SeasonSystem : MonoBehaviour
    {
        public enum Season { Printemps, Été, Automne, Hiver }

        public static readonly float[] SeasonLengthDays = { 24f, 26f, 24f, 26f };
        public static readonly float[] TempDelta = { 0.05f, 0.14f, 0.02f, -0.20f };
        public static readonly float[] MoistDelta = { 0.08f, -0.04f, 0.05f, 0.02f };
        public static readonly float WinterSnowlineDrop = 900f;

        public Season Current { get; private set; } = Season.Printemps;
        public int DayOfYear { get; private set; } = 1;

        [SerializeField] private DayNightCycle _clock;

        private void Update()
        {
            if (_clock == null) return;
            DayOfYear = Mathf.Max(1, _clock.Day);
            float total = 0f, acc = 0f;
            foreach (var len in SeasonLengthDays) total += len;
            float d = (DayOfYear - 1) % total;
            for (int i = 0; i < SeasonLengthDays.Length; i++)
            {
                acc += SeasonLengthDays[i];
                if (d < acc) { Current = (Season)i; break; }
            }
        }

        public float SnowlineDropM => Current == Season.Hiver ? WinterSnowlineDrop : 0f;
    }
