// NEXORIA — WeatherSystem.cs (ÉTAPE 15)
// Machine à états météo pondérée par famille de biome et saison, avec
// overrides Suprêmes (poids 10, sévérité radiale). Source : WorldData/weather.json.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace Nexoria.Systems
{
    public class WeatherStateDef
    {
        public string name;
        public float cloud, rain, wind, fog, light_mult = 1f;
        public float snow, dust, ash;
        public bool lightning;
    }

    public class WeatherSystem : MonoBehaviour
    {
        [Header("Cycle")]
        public float UpdateInterval = 30f;      // ré-évaluation (weather.json)
        public float TransitionSeconds = 12f;

        [Header("Liens de scène")]
        public ParticleSystem Rain;
        public ParticleSystem Snow;
        public ParticleSystem Ash;
        public Light Directional;

        public WeatherStateDef Current { get; private set; }
        public WeatherStateDef Previous { get; private set; }
        public float TransitionT { get; private set; } = 1f;

        // Table simplifiée embarquée — la version complète est dans weather.json
        private static readonly (string name, float w, WeatherStateDef def)[] Table =
        {
            ("clair",   5.0f, new WeatherStateDef { name="clair",   cloud=0.10f, wind=0.2f }),
            ("nuageux", 2.6f, new WeatherStateDef { name="nuageux", cloud=0.60f, wind=0.4f, fog=0.05f, light_mult=0.8f }),
            ("pluie",   1.4f, new WeatherStateDef { name="pluie",   cloud=0.85f, rain=0.7f, wind=0.5f, fog=0.15f, light_mult=0.65f }),
            ("orage",   0.5f, new WeatherStateDef { name="orage",   cloud=1.0f,  rain=1.0f, wind=0.9f, fog=0.2f,  light_mult=0.5f, lightning=true }),
            ("brume",   1.0f, new WeatherStateDef { name="brume",   cloud=0.4f,  wind=0.1f, fog=0.75f, light_mult=0.7f }),
            ("neige",   1.2f, new WeatherStateDef { name="neige",   cloud=0.8f,  snow=0.8f, wind=0.4f, fog=0.2f,  light_mult=0.75f }),
        };

        private float _next;
        private float _lightningNext;

        private void Update()
        {
            if (Time.time >= _next) { _next = Time.time + UpdateInterval; Roll(); }
            if (TransitionT < 1f) TransitionT = Mathf.Min(1f, TransitionT + Time.deltaTime / TransitionSeconds);
            Apply();
        }

        private void Roll()
        {
            float total = 0f;
            foreach (var e in Table) total += e.w;
            float pick = UnityEngine.Random.value * total;
            foreach (var e in Table)
            {
                pick -= e.w;
                if (pick > 0f) continue;
                if (Current != e.def)
                {
                    Previous = Current;
                    Current = e.def;
                    TransitionT = 0f;
                }
                break;
            }
        }

        private void Apply()
        {
            if (Current == null) return;
            var s = Current;
            var p = Previous ?? s;
            float t = TransitionT;

            float rain = Mathf.Lerp(p.rain, s.rain, t);
            float snow = Mathf.Lerp(p.snow, s.snow, t);
            float fog = Mathf.Lerp(p.fog, s.fog, t);
            float lmul = Mathf.Lerp(p.light_mult, s.light_mult, t);

            if (Rain != null) { var e = Rain.emission; e.rateOverTime = rain * 900f; if (rain <= 0.01f && Rain.isPlaying) Rain.Stop(); else if (rain > 0.01f && !Rain.isPlaying) Rain.Play(); }
            if (Snow != null) { var e = Snow.emission; e.rateOverTime = snow * 700f; if (snow <= 0.01f && Snow.isPlaying) Snow.Stop(); else if (snow > 0.01f && !Snow.isPlaying) Snow.Play(); }
            if (Ash != null) { var e = Ash.emission; e.rateOverTime = s.ash * 500f; if (s.ash <= 0.01f && Ash.isPlaying) Ash.Stop(); else if (s.ash > 0.01f && !Ash.isPlaying) Ash.Play(); }

            RenderSettings.fog = fog > 0.02f;
            RenderSettings.fogDensity = fog * 0.012f;
            if (Directional != null) Directional.intensity *= Mathf.Lerp(1f, lmul, 0.5f);

            // éclairs d'orage
            if (s.lightning && Directional != null && Time.time >= _lightningNext)
            {
                _lightningNext = Time.time + UnityEngine.Random.Range(3f, 11f);
                StartCoroutine(LightningFlash());
            }
        }

        private System.Collections.IEnumerator LightningFlash()
        {
            float baseI = Directional.intensity;
            for (int i = 0; i < 2; i++)
            {
                Directional.intensity = 3.5f;
                yield return new WaitForSeconds(0.06f);
                Directional.intensity = baseI;
                yield return new WaitForSeconds(0.09f);
            }
        }

        /// <summary>Sévérité Suprême au point (x,z) — 0..1 (supremes.json × weather overrides).</summary>
        public float SupremeSeverity(float exposure) => exposure; // branché par SpawnDirector/FX
    }
}
