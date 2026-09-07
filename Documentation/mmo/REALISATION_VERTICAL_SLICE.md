# RAPPORT DE RÉALISATION — VERTICAL SLICE « Province de Solmère »

Date : 2026-09-08 · Cycle : PREMIÈRE MISSION (charte MMO, sections 1-30)

## Ce qui est RÉELLEMENT implémenté, compilé et testé

### Serveur de simulation autoritaire (`mini-services/world-sim`, bun + socket.io :3003)
- Boucle de simulation 15 Hz ; le monde vit en continu, **même sans joueur** (test T11).
- Authentification par cookie de session httpOnly revalidé en base à chaque handshake ;
  personnage lié au compte ; double session refusée.
- Mouvement serveur-autoritaire avec **anti-triche** : budget temporel, dt plafonné,
  anti-rejeu par séquence, bornes de province (test T2 : speed-hack dt=5 ramené de
  288 m à ~5 m réels).
- **16 PNJ** avec identité complète (famille, personnalité, profession, domicile,
  mémoire), routines quotidiennes selon l'horloge du monde, fuite, deuil, gardes
  combattants.
- **Mort définitive** : validation serveur, journal `NpcDeath` irréversible, famille
  endeuillée, métier vacant, prospérité impactée, **aucun respawn** — persiste après
  redémarrage (tests T5/T10).
- **Bâtiments destructibles** (7 états) : dégâts par raiders, ruines cendreuses,
  coût économique durable ; **reconstruction** : matériaux déposés par les joueurs,
  coups de main, bâtisseurs PNJ, progression visible 3D en 4 paliers → RESTORED
  (tests T6/T10).
- **Événement mondial INVASION** : vague de 5 raiders qui marchent sur le village et
  assiègent bâtiments/PNJ ; repoussée → prospérité +6 ; échec → destructions et morts
  durables (test T7).
- **Donjon persistant** : porte destructible pour toujours, mécanisme permanent,
  coffre unique, mini-boss Colosse de Pierre (respawn contrôlé 8 min, killCount
  conservé) (tests T8/T10).
- **Gen3ia** : NPC_AGENT (observe → propose → validation serveur → exécution →
  mémoire), QUEST_AGENT (quêtes de chasse dynamiques), WORLD_AGENT (invasions
  périodiques + mémoire du monde).
- Multijoueur : snapshots 5 Hz par rayon d'intérêt 130 m, chat global, reconnexion
  avec grâce de 45 s, sauvegarde gracieuse SIGTERM/SIGINT.

### Client jouable (Next.js 16 + Three.js/R3F)
- Écran `Province` accessible depuis le village (bouton « ⚔ Province de Solmère »).
- Monde 3D complet : terrain à hauteurs partagées serveur/client, forêt instanciée,
  village, ville enceinte de Pierrefont, donjon, **7 états de bâtiments réellement
  visibles** (+ 4 paliers de chantier), PNJ par profession, monstres/raiders,
  mini-boss, corps des PNJ morts au sol.
- **Prédiction** du mouvement + réconciliation, **interpolation** des entités
  distantes, caméra 3e personne à glissement, cycle jour/nuit piloté par l'horloge
  serveur.
- HUD complet : PV/MP/XP, or + ressources, horloge + prospérité, minimap animée
  (PNJ/monstres/joueurs/soi), chat, quêtes, toasts, butin, dialogue Gen3ia, écran de
  mort/respawn, sélecteur de qualité LOW→ULTRA.
- Android : joystick + boutons (réutilisation des contrôles partagés), écran de
  rotation en portrait, HUD compact vérifié en 740×360.

### Intégration
- `prisma/schema.prisma` : 8 nouveaux modèles du monde persistant (push appliqués).
- Le jeu existant (création de personnage, village, arènes, Codex, Suprêmes) reste
  **intact** — aucune régression (lint 0 erreur, parcours retesté).

## Résultats de tests

- **Automatisé : 51 réussis / 0 échoués** (`scripts/test_world_sim.mjs`) — détail
  dans `Documentation/mmo/TESTING.md`.
- **Navigateur (E2E outillé)** : connexion → monde → HUD → chat → déplacement →
  horloge serveur → paysage mobile — validés par captures.
- **Lint : 0 erreur.** Serveur de simulation : démarrage propre, health-check OK.

## Bugs réels découverts puis corrigés pendant le cycle

1. `DAY_LENGTH_S` erroné (jour de 24 s au lieu de 24 min) — corrigé + monde réinitialisé.
2. Perte d'écritures SQLite (flag `dirty` baissé avant confirmation) — écritures
   séquentielles sûres + 3 tentatives.
3. Invasion auto dès le boot (WORLD_AGENT) — délai initial + clôture des orphelines.
4. Absence de sauvegarde gracieuse — SIGTERM/SIGINT → `flushAll()`.
5. `create`/`upsert` des projets de reconstruction — upsert.
6. `await` hors fonction async — correction de compilation.
7. Course critique client (état dupliqué réseau/React) — état lu à la source unique.
8. Tempête de re-renders (ciel par frame) — quantification + memo + throttling.

## Ce qui N'EST PAS fait (honnêteté absolue)

- **Unity** : aucun script Unity n'est compilé/testé ici (moteur absent de
  l'environnement). Les scripts C# existants (`Game/`, `ProceduralGeneration/`)
  restent des références pour une migration Unity, documentée mais non réalisée.
- **Échelle** : 1 province de 480 m (les 10 continents, le streaming de chunks et les
  centaines de joueurs simultanés restent à construire — les données de monde généré
  existent dans `WorldData/`).
- **Succession des PNJ** : le métier devient vacant mais aucun apprenti ne reprend
  automatiquement (module à venir).
- **Gen3ia LLM** : agents à base de règles déterministes ; l'adaptateur LLM est
  documenté mais non branché.
- **Qualité dynamique auto** (FPS scaler) : profils manuels livrés, autoscaling non.
- **Profilage sur Android physique** : impossible ici (aucun appareil).
- Réseau dégradé réel (coupe WiFi), hundreds-of-players : non mesurés.
- Quêtes liées aux PNJ (au-delà des chasses), commerce joueur, guildes, bâtiments
  constructibles libres : à venir.

## Prochaines étapes recommandées (ordre)

1. Succession des PNJ (apprenti → maître, NPC agricole → commerce).
2. Sièges de raids contre les remparts de Pierrefont + guilde défenseur.
3. Auto-scaling qualité (FPS → profil) + PWA Android installable.
4. Brancher l'adaptateur LLM Gen3ia sur les dialogues (contexte mémoire).
5. Connecter `WorldData/` (monde généré 64 km, 256 régions) au streaming de la
   simulation (chunks autoritaires).

## Comment lancer

```bash
# 1. Le site (terminal 1 — déjà géré par l'environnement) : bun run dev
# 2. Le serveur de simulation du monde (terminal 2) :
cd mini-services/world-sim && bun run dev        # (bun --hot index.ts) port 3003
# 3. Tests complets du monde :
bun scripts/test_world_sim.mjs
```
Dans l'aperçu web : connexion → personnage → village → bouton « ⚔ Province de
Solmère ».
