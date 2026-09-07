# DESTRUCTION_SYSTEM — Destruction des bâtiments

## Principe

Une maison détruite **apparaît réellement détruite** : murs effondrés à 35 % de leur
hauteur, toit disparu, gravats au sol. Puis, après 2 minutes sans reconstruction,
l'état `RUINS` prend le relais : murs à 22 %, teinte cendrée (incendie simulé),
gravats noircis.

## Chaîne de destruction

```
PV 100 % ──dégâts──► DAMAGED (≤66 %) ──► HEAVILY_DAMAGED (≤33 %) ──► DESTROYED (0)
                                                                          │ 2 min
                                                                          ▼
                                                                       RUINS
```

Sources de dégâts (serveur uniquement) :
- **Raiders d'invasion** : 14 dps par Rôdeur au contact d'un bâtiment (siège).
- **Outil GM de test** (`damage_building`, clé requise) — utilisé par les tests.

## Conséquences durables

1. La fonction économique s'arrête (une forge détruite ne produit plus).
2. Prospérité -8 immédiate si le bâtiment économique.
3. Annonce mondiale (toast + chat) et consignation dans l'événement d'invasion
   en cours (`WorldEvent.consequences`).
4. Le bâtiment reste détruit après redémarrage du serveur (persistance validée).
5. Un **chantier de reconstruction** peut alors être ouvert (voir
   RECONSTRUCTION_SYSTEM) — sinon les ruines demeurent, indéfiniment.

## Ce que la destruction ne fait pas

- Elle ne supprime pas le bâtiment de la base (l'emplacement reste occupé).
- Elle n'est jamais déclenchée par un client (aucune route d'attaque de bâtiment).

## Test de référence

T6 : forge détruite par GM → annonce reçue → dépôt des matériaux (40 bois,
25 pierre, 10 fer) → chantier 99 % → coups de main joueurs → `RESTORED` à 100 % →
état conservé après redémarrage (T10 : `forge toujours restaurée`).

## Limitations

- Les monstres errants n'attaquent pas les bâtiments (seuls les raiders).
- Pas de débris physiques animés (statique volontaire, budget mobile).
- Les remparts/porte de Pierrefont sont destructibles par GM mais pas encore ciblés
  par les raids.
