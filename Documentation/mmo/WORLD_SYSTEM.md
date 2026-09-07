# WORLD_SYSTEM — Monde persistant

## Principe

La Province de Solmère (480×480 m) vit en continu, même sans joueur connecté.
Le serveur avance une horloge de jeu (`WorldState.timeOfDay`, 1 s réelle = 60 s en jeu,
1 jour = 24 min réelles) et simule PNJ, monstres, bâtiments et événements à 15 Hz.
**Rien ne se réinitialise après un redémarrage** : tout état est persisté en SQLite
(`WorldState`, `Npc`, `Building`, `DungeonState`, `WorldEvent`, `ProvinceState`).

## Géographie

| Zone | Position | Contenu |
|---|---|---|
| Village de Solmère | (0, 40) | 8 bâtiments, 13 PNJ, 6 points d'apparition sûrs |
| Forêt de Sylvarune | (-140, -110) | ~190 arbres, 4 points d'apparition de monstres, coffre caché |
| Pierrefont (ville miniature) | (150, 130) | Enceinte de 12 remparts + porte, comptoir, caserne, entrepôt |
| Ruines d'Ombrecime (donjon) | (185, -40) | Porte, couloir, 3 salles, mécanisme, coffre, mini-boss |

La hauteur du terrain est une **fonction partagée** `heightAt(x, z)`
(`src/lib/game/province/world-data.ts`) : identique côté serveur et client,
aucune désynchronisation possible du sol.

## Temps et routines

- Cycle jour/nuit de 24 min réelles, ciel et éclairage pilotés par l'heure serveur
  (quantifiés par paliers de 10 min en jeu pour la stabilité du rendu).
- Les PNJ appliquent leurs routines : travail 7h-19h, retour 19h-22h, sommeil 22h-7h,
  fuite devant les menaces, deuil familial 2 jours après un décès.
- Le monde continue de tourner sans joueur (validé par le test T11 : ticks qui
  progressent sans aucune connexion).

## Économie et prospérité

`WorldState.prosperity` (0-200) varie selon les conséquences durables :
- bâtiment économique détruit : -8 ; habitant tué pendant une invasion : -12 ;
- métier vacant (mort du forgeron) : -6 ;
- bâtiment reconstruit : +4 ; invasion repoussée : +6.

## Flux de données

1. Le serveur semé au premier démarrage (PNJ/bâtiments déterministes).
2. Boucle 15 Hz : horloge → PNJ → monstres → bâtiments → événements → Gen3ia.
3. Sauvegarde incrémentale toutes les 10 s + arrêt gracieux (SIGTERM/SIGINT).
4. Au redémarrage : rechargement intégral de l'état (test T10).

## Limitations

- Une seule province ; les autres régions du monde (données `WorldData/`, 256 régions
  générées) ne sont pas encore connectées à la simulation.
- Pas de simulation économique fine (prix, caravanes) — la prospérité est un indicateur.
- Météo définie (`WorldState.weather`) mais sans effets visuels pour l'instant.
