# GEN3IA_INTEGRATION — Couche d'agents IA

## Principe fondamental

Gen3ia **ne remplace pas le Game Server**. Chaque agent possède contexte, mémoire,
objectifs, connaissances, outils et **permissions**. Un agent **proposed**, le
GameServer **dispose** (`validateProposal`). Aucun agent n'écrit jamais directement
en base ni ne téléporte quoi que ce soit (garde-fou `validatePosition`).

## Agents livrés (`mini-services/world-sim/services/Gen3ia.ts`)

### NPC_AGENT (par PNJ vivant, cycle 4 s)
```
observe (menaces < 14 m, souvenir de deuil, joueur bavard à < 8 m)
   → propose (call_for_help | share_news | mourn | none)
   → GameServer.validateProposal (vivant ? permission de parole seulement)
   → exécute (message de chat, mémoire mise à jour)
```
- Jamais d'action physique : un agent ne peut ni tuer, ni déplacer, ni récompenser.

### QUEST_AGENT
- Le maire Osric propose dynamiquement des quêtes de chasse (3 Rôdeurs → 30 or +
  80 XP), suit la progression (`onQuestProgress` sur chaque kill serveur), clôture et
  récompense. Maximum 5 quêtes accomplies par personnage pour le Vertical Slice.

### WORLD_AGENT (cycle 60 s + surveillance d'invasion)
- Propose une **invasion** tous les 8 min si aucune active, prospérité ≥ 40 et au
  moins un témoin connecté — validée puis exécutée par EventService.
- Tient la **mémoire du monde** (`worldMemory`, 100 derniers faits) : morts,
  destructions, reconstructions, mécanismes, coffres, victoires.
- À chaque invasion repoussée/détruite : conséquences consignées dans `WorldEvent`.

### Dialogues
Règles de personnalité + profession + contexte (invasion, prospérité, mémoire) →
répliques en français. L'apothicaire offre une potion si le joueur n'en a pas.

## Adaptateur LLM (extension point)

L'architecture prévoit un adaptateur LLM optionnel pour les dialogues longs :
l'application principale embarque `z-ai-web-dev-sdk` (backend uniquement). Le
connecteur consisterait à brancher `dialogueWith()` sur une génération LLM avec le
contexte (mémoire du PNJ + faits du monde) puis à **valider/rejeter** la sortie
(longueur, contenu) avant diffusion. Non activé dans le Vertical Slice : la couche
règle est déterministe, instantanée et sans dépendance externe — choix documenté.

## Mémoire du monde

`gen3ia.worldMemory` — journal consultable (extension : panneau « Chroniques de
Solmère » dans l'UI). Chaque fait horodaté en jours de jeu.

## Limitations

- Pas de FACTION_AGENT / ECONOMY_AGENT / DUNGEON_AGENT autonomes (prévus par la
  charte) : leurs fonctions sont portées par EventService/BuildingService pour l'instant.
- Pas de RAG : la mémoire est une liste bornée en mémoire.
