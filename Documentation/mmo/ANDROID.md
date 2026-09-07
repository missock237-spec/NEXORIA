# ANDROID — Priorité mobile (mode paysage)

## Orientation

Le gameplay est conçu en **LANDSCAPE**. En portrait, sur appareil tactile, un écran
demande de tourner l'appareil (garde `window.innerHeight > innerWidth` +
détection tactile). Les menus restent utilisables dans les deux orientations.

## Contrôles tactiles

| Zone | Fonction |
|---|---|
| Pouce gauche | Joystick virtuel (`VirtualJoystick`, réutilisé du village) — déplacement, poussée à fond = sprint |
| Pouce droit | Boutons **Attaque** (gros), **Sort** (compétence, coût MP), **Action** (contextuel : parler/activer/travailler) |
| Glissement à l'écran | Rotation de caméra (delta X → lacet) |
| Chat | Repliable (icône 💬) pour libérer l'écran |

Le clavier ZQSD/WASD/flèches + Espace/E reste actif (compatibilité manette via
mappage navigateur, et PC).

## Adaptation de l'interface

- HUD compact : barres PV/MP et ressources en haut à gauche, horloge/événement en
  haut au centre, minimap 110 px (148 px ≥ sm) en haut à droite.
- Cibles tactiles ≥ 44 px (règle d'accessibilité respectée).
- Détection plateforme existante (`detectPlatform`) : qualité par défaut MEDIUM sur
  Android, HIGH sur PC, modifiable dans l'écran.

## Performance mobile

- Profils LOW/MEDIUM/HIGH/ULTRA (résolution dpr 0,75→2, ombres, densité d'arbres,
  particules) — voir OPTIMIZATION.md.
- Re-renders React throttlés (ciel quantifié, entités 3 Hz, monde 1 Hz) pour
  préserver la batterie et éviter les chutes d'images.
- Géométries procédurales légères (boîtes/cylindres), aucun asset lourd à charger.

## Tests

- Vérifié en navigateur : rendu paysage 740×360 correct (HUD complet, minimap,
  chat), portrait géré par l'écran de rotation sur appareils tactiles.
- Profilage sur appareil Android réel : **à faire** (dépendance extérieure —
  l'environnement de développement ne dispose pas d'appareil physique ; la charte
  demande un profilage régulier sur matériel réel, c'est une tâche de production).

## Limitations honnêtes

- Pas de vibration/haptique.
- Le multitouch avancé (deux gestes simultanés joystick + caméra) fonctionne via
  pointer events mais n'a pas été testé sur matériel multi-touch réel ici.
- Pas encore de PWA/installable (à venir).
