# MULTIPLAYER — Multijoueur temps réel

## Architecture

- **Transport** : socket.io 4.8 (WebSocket, repli polling), mini-service `world-sim`
  sur le port 3003 derrière la passerelle (`io('/?XTransformPort=3003')` en
  préproduction ; connexion directe `:3003` en dev local).
- **Authentification** : le handshake lit le cookie httpOnly `nexoria_session`
  (même session que le site), le revalide en base (token + expiration) et attache le
  compte à la socket. `hello {characterId}` vérifie que le personnage appartient au
  compte. Double session du même personnage : refusée.
- **Autorité** : tout est calculé serveur (voir ARCHITECTURE.md).

## Boucles et fréquences

| Flux | Fréquence |
|---|---|
| Simulation serveur (tick) | 15 Hz |
| Intentions de mouvement client | ~10 Hz |
| Snapshots (par joueur, rayon 130 m) | 5 Hz |
| Sauvegarde incrémentale | 10 s (+ arrêt gracieux) |

## Synchronisation

- **Joueur local** : prédiction côté client (mêmes règles de vitesse), réconciliation
  douce (au-delà de 2,5 m de divergence → correction ferme).
- **Entités distantes** : interpolation positionnelle vers les cibles serveur.
- **Intéressement** : chaque snapshot ne contient que les entités à ≤ 130 m.
- **Événements diffusés** : `combat`, `chat`, `toast`, `event_start/end`,
  `npc_died`, `monster_died`, `project_update`, `loot`, `levelup`, `death`,
  `respawn`, `dialogue`.

## Reconnexion

Déconnexion → l'entité joueur reste en mémoire 45 s (grace period) : un simple
`hello` de reprise réattache la session sans perte (position, inventaire, état). Au-delà, l'état est
sauvegardé et l'entité purgée. Le chat et les événements continuent pendant l'absence —
le monde n'attend personne (validé en test).

## Chat

Canal provincial global, limité à 1 message/1,5 s, 140 caractères, nettoyage des
caractères de contrôle. Les agents Gen3ia et le Héraut y publient aussi.

## Anti-triche

- Mouvement : budget temporel serveur (0,3 s max d'avance), dt plafonné à 0,15 s par
  intention, anti-rejeu par numéro de séquence, bornes de province.
- Combat : portées + cooldowns serveur, dégâts calculés serveur, butin serveur.
- Interactions : distances validées serveur.
- Inventaire/or/XP : propriété serveur exclusive (jamais envoyés par le client).

## Tests de référence

T3 (deux joueurs se voient), T9 (chat croisé), reconnexion T5, redémarrage T10 —
tous verts dans `scripts/test_world_sim.mjs`.

## Limitations honnêtes

- Un seul process de simulation (scale vertical) ; le sharding par province est
  l'extension naturelle.
- Pas de prédiction serveur des autres joueurs (interpolation pure — suffisant au
  tick 15 Hz pour ce rythme de jeu).
