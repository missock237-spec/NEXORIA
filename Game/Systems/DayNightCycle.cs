// NEXORIA — DayNightCycle.cs (ÉTAPE 15)
// Cycle jour/nuit : 24 h de jeu = 36 min réelles (WorldData/weather.json → day_night).
using UnityEngine;

namespace Nexoria.Systems
{
    public class DayNightCycle : MonoBehaviour
    {
        [Header("Réglages (valeurs par défaut = weather.json)")]
        public float DayCycleMinutes = 36f;
        public float SunriseHour = 6.2f;
        public float SunsetHour = 19.4f;
        public Color DawnDuskColor = new(1f, 0.55f, 0.3f);
        public float MoonIntensity = 0.18f;
        public Color NightAmbient = new(0.10f, 0.12f, 0.22f);

        [Header("Liens de scène")]
        public Light Sun;
        public Light Moon;

        /// <summary>Heure de jeu [0..24).</summary>
        public float Hour { get; private set; } = 8f;
        public int Day { get; private set; } = 1;
        public bool IsNight => Hour < SunriseHour || Hour > SunsetHour;

        private void Update()
        {
            Hour += 24f * (Time.deltaTime / (DayCycleMinutes * 60f));
            if (Hour >= 24f) { Hour -= 24f; Day++; }
            UpdateSun();
        }

        private void UpdateSun()
        {
            if (Sun == null) return;
            float t;
            Color tint = Color.white;
            if (Hour < SunriseHour || Hour > SunsetHour)      // nuit
            {
                t = -20f;                                     // soleil sous l'horizon
                RenderSettings.ambientLight = NightAmbient;
                if (Moon != null) Moon.intensity = MoonIntensity;
            }
            else
            {
                // progression 0..1 entre lever et coucher
                t = Mathf.InverseLerp(SunriseHour, SunsetHour, Hour);
                float angle = Mathf.Lerp(0f, 180f, t);
                Sun.transform.rotation = Quaternion.Euler(angle - 90f, 170f, 0f);
                // aube/crépuscule = teinte chaude près des bornes
                float edge = Mathf.Clamp01(Mathf.Min(t, 1f - t) * 8f);
                tint = Color.Lerp(DawnDuskColor, Color.white, edge);
                Sun.color = tint;
                Sun.intensity = Mathf.Lerp(0.25f, 1.15f, edge);
                RenderSettings.ambientLight = Color.Lerp(NightAmbient * 2f, new Color(0.5f, 0.55f, 0.62f), edge);
                if (Moon != null) Moon.intensity = 0f;
            }
        }
    }
}
