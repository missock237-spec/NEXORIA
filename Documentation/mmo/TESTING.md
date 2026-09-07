# TESTING — Stratégie et résultats de tests

## Suite automatisée (serveur de simulation)

`bun scripts/test_world_sim.mjs` — intégration bout-en-bout : gère le cycle de vie
du serveur (démarrage, arrêt gracieux, redémarrage), crée comptes/personnages via
l'API réelle, se connecte en socket.io avec les cookies de session réels, et
enregistre tous les événements dès la connexion (aucune course critique).

### Résultat final : **51 réussis / 0 échoués**

| Bloc | Ce qui est prouvé |
|---|---|
| T1 Auth | Sans cookie → refusé ; personnage étranger → kick ; welcome complet (16 PNJ, ≥ 20 bâtiments, horloge) |
| T2 Mouvement | Déplacement légitime encadré (12 m en 2 s max) ; speed-hack dt=5 plafonné au débit réel ; anti-rejeu de séquences |
| T3 Multijoueur | 2 joueurs connectés, visibles l'un l'autre (intérêt 130 m) ; double session refusée |
| T4 Combat | Aggro monstre, dégâts serveur, kill + butin (or/bois/pierre/fer), dégâts subis |
| T5 Permadeath | npc_died diffusé, PNJ absent des vivants après reconnexion, famille en deuil |
| T6 Bâtiments | Destruction → annonce → dépôts matériaux → 99 % → coups de main → RESTORED |
| T7 Événement | Invasion forcée : 5 raiders, poursuite/extermination, RESOLVED + prospérité +6 |
| T8 Donjon | Porte détruite, mécanisme activé, coffre unique, second refus, Colosse vaincu |
| T9 Chat | Diffusion croisée entre joueurs |
| T10 Redémarrage | PNJ mort toujours mort ; porte/mécanisme/coffre/boss/forge/inventaire/or persistés |
| T11 Monde vivant | Ticks qui progressent sans aucun joueur connecté |

Exécution : `pkill -f "bun index.ts" ; bun scripts/test_world_sim.mjs` (le script
gère lui-même le serveur).

### Bugs réels trouvés et corrigés par les tests

1. `DAY_LENGTH_S` faux (jour = 24 s réelles au lieu de 24 min) — horloge corrigée.
2. `flushDirty` baissait `dirty` même si l'écriture SQLite échouait (perte d'état)
   → écritures séquentielles sûres avec 3 tentatives.
3. WORLD_AGENT déclenchait une invasion dès le boot (bloquait `force_invasion`)
   → délai initial + clôture des invasions persistantes orphelines.
4. Pas de sauvegarde gracieuse à l'arrêt → perte des dernières écritures
   → SIGTERM/SIGINT → `flushAll()`.
5. Projets de reconstruction : `create` au lieu d'`upsert` (échec si la ligne
   existait) → upsert partout.
6. `await` dans une fonction non-async (crash de compilation détecté au démarrage).

## Vérification navigateur (E2E manuel outillé)

- Parcours complet : accueil → connexion → sélection → village → **Province**.
- Monde 3D rendu (terrain, bâtiments, ruines persistantes visibles, PNJ, avatar).
- HUD complet (PV/MP/XP/or/ressources, horloge, prospérité, minimap animée).
- Chat diffusé et affiché ; horloge serveur qui avance (13h → 15h).
- Déplacement + caméra 3e personne validés ; disposition paysage mobile vérifiée.
- Lint ESLint : **0 erreur, 0 avertissement**.

## Ce qui reste à tester (honnête)

- Multijoueur à N > 2 joueurs simultanés réels (charge).
- Appareils Android physiques (performances, multitouch).
- Déconnexions réseau brutales (coupe WiFi) — la grâce de 45 s est implémentée et
  testée au niveau protocole, pas en conditions réseau dégradées réelles.
- Tests unitaires puristes (le choix actuel : intégration bout-en-bout, plus
  fidèle à la règle « ne pas simuler »).
