// NEXORIA — NpcDailyRoutine.cs (ÉTAPE 15 — monde vivant)
// Routines quotidiennes des PNJ : dormir, travailler, marcher, commercer.
// Ancrages : WorldData/settlements.json (layout.buildings = destinations).
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

namespace Nexoria.NPC
{
    public class NpcDailyRoutine : MonoBehaviour
    {
        public enum Activity { Dormir, Travailler, Marcher, Commercer, Discuter }

        [Header("Identité")]
        public string NpcName = "Villageois";
        public string HomeSettlementId = "SETT_003";

        [Header("Horaires (heures de jeu)")]
        public float WakeHour = 6.5f;
        public float WorkStartHour = 7.5f;
        public float LunchHour = 12.5f;
        public float WorkEndHour = 18f;
        public float SleepHour = 22f;

        [Header("Liens")]
        public DayNightClock Clock;          // wrapper autour de Systems.DayNightCycle
        public Transform HomeBed;
        public Transform Workplace;
        public Transform Market;

        public Activity Current { get; private set; } = Activity.Travailler;

        private NavMeshAgent _agent;
        private float _nextGossip;

        private void Awake() => _agent = GetComponent<NavMeshAgent>();

        private void Update()
        {
            float h = Clock != null ? Clock.Hour : 12f;
            var before = Current;
            if (h < WakeHour || h >= SleepHour) Current = Activity.Dormir;
            else if (h < WorkStartHour || (h >= LunchHour && h < LunchHour + 1f)) Current = Activity.Marcher;
            else if (h < WorkEndHour) Current = UnityEngine.Random.value < 0.15f ? Activity.Commercer : Activity.Travailler;
            else Current = Activity.Discuter;

            if (before != Current) OnActivityChanged(Current);
            if (Time.time >= _nextGossip) { _nextGossip = Time.time + UnityEngine.Random.Range(20f, 60f); RandomGossip(); }
        }

        private void OnActivityChanged(Activity a)
        {
            Vector3? target = a switch
            {
                Activity.Dormir => HomeBed != null ? HomeBed.position : null,
                Activity.Travailler => Workplace != null ? Workplace.position : null,
                Activity.Commercer => Market != null ? Market.position : null,
                _ => RandomNearby(),
            };
            if (target != null && _agent != null) _agent.SetDestination(target.Value);
        }

        private Vector3 RandomNearby()
        {
            Vector2 r = UnityEngine.Random.insideUnitCircle * 25f;
            return transform.position + new Vector3(r.x, 0f, r.y);
        }

        private void RandomGossip()
        {
            if (Current != Activity.Discuter) return;
            // Rumeurs pondérées par l'exposition Suprême de la région (branchement SpawnDirector)
            // Ex. : "Les oiseaux refusent de voler vers l'est, depuis que le ciel brûle la nuit."
        }
    }

    /// <summary>Référence au cycle jour/nuit sans dépendance circulaire de namespace.</summary>
    public class DayNightClock : MonoBehaviour
    {
        public Systems.DayNightCycle Cycle;
        public float Hour => Cycle != null ? Cycle.Hour : 12f;
        public int Day => Cycle != null ? Cycle.Day : 1;
    }
}
