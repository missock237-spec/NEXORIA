# OPTIMIZATION — Optimisation PC & Android

## Profils qualité (existants, étendus)

`src/lib/game/config.ts` :

| Profil | DPR | Ombres | Carte d'ombre | Densité d'arbres | Antialias |
|---|---|---|---|---|---|
| LOW | 0,75 | non | 512 | 50 % | non |
| MEDIUM | 1,0 | oui | 1024 | 75 % | oui |
| HIGH | 1,5 | oui | 2048 | 100 % | oui |
| ULTRA | 2,0 | oui | 4096 | 100 % | oui |

Défaut selon plateforme (MEDIUM Android / HIGH PC), sélectionnable dans l'UI
(mémorisé en localStorage).

## Optimisations livrées dans la province

1. **InstancedMesh** : arbres (2 draw calls pour ~190 arbres), rochers (1).
2. **Intéressement serveur** : seules les entités à ≤ 130 m sont envoyées →
   le client n'instancie jamais plus que nécessaire.
3. **Re-renders React throttlés** :
   - ciel/lumière : paliers de 10 min en jeu (≈ 10 s réelles) au lieu de chaque frame ;
   - entités : 3 Hz (positions lissées à 60 fps via `useFrame` sans render) ;
   - bâtiments/donjon : 1 Hz ;
   - HUD : 2,5 Hz + événements.
4. **Fog + bornes de caméra** : le lointain est masqué (frustum court, far 300).
5. **Géométries primitives partagées** (boîtes/capsules) : mémoire GPU minimale.
6. **Snapshots compacts** (champs courts, pas de données redondantes).

## Objectif : stabilité avant esthétique

Le système de qualité dynamique automatique (FPS-based scaler) de la charte est
préparé par l'architecture (profils + sélecteur) ; l'auto-scaling runtime est le
prochain incrément — non livré dans le Vertical Slice (documenté honnêtement).

## Hygiène de performance appliquée

- Aucune allocation par frame dans les boucles chaudes (hors Vector3 caméra).
- Écouteurs `useEffect` nettoyés ; timers uniques par couche.
- Sauvegardes serveur séquentielles (pas de tempête de requêtes SQLite).

## Mesures

- Serveur : `simTicks` persisté (diagnostic de charge — ~900 ticks/min attendus).
- Profilage Android réel : **dépendance extérieure** (pas d'appareil dans cet
  environnement) — la charte demande des tests sur appareils bas de gamme : à
  exécuter en production avec un Pixel/Android Go.

## Limitations

- Pas d'occlusion culling ni de GPU instancing au-delà de la végétation.
- Pas de compression de texture (aucune texture : matériaux couleur).
- Le monde est statique côté streaming (une seule zone — le streaming par chunks
  s'activera avec l'extension au monde généré, données prêtes dans `WorldData/`).
