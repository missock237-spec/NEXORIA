# ASSET_PIPELINE — Pipeline d'assets 3D

## État du Vertical Slice : 100 % procédural

Tous les assets 3D de la province sont générés par code (Three.js/R3F) :

| Asset | Génération | Fichier |
|---|---|---|
| Terrain | PlaneGeometry 480 m, hauteurs via `heightAt()` partagée, couleurs par biome | `three/province/parts.tsx` |
| Arbres | 2 InstancedMesh (troncs cylindres + cônes), semis déterministe | idem |
| Rochers | InstancedMesh dodecahedron | idem |
| Bâtiments | Boîtes + cônes modulaires par état (7 états + 4 paliers de chantier) | idem |
| Remparts/porte | Boîtes orientées sur l'enceinte | idem |
| Donjon | Cylindres (piliers/porte), boîtes (porte, pierres), disques (sols de salles) | idem |
| Personnages | Capsule + sphère + épée (joueurs/PNJ), couleurs par race/profession | idem |
| Monstres | Capsule + yeux émissifs, anneau orange pour les raiders | idem |
| Mini-boss | Golem de boîtes ×2,4 avec barre de vie | idem |

## Convention d'assets (pour la production)

La charte (section 23) fixe la convention — reprise telle quelle pour l'intégration
future d'assets GLTF : `Characters/ NPC/ Monsters/ Bosses/ Buildings/ Environment/
Vegetation/ Weapons/ Armor/ Props/ Dungeons/ Ruins/ VFX/`, chaque asset avec ID,
catégorie, LOD, collision, matériau, texture, taille, poids mémoire et plateforme.
La passerelle recommandée : **gltfjsx** (GLTF → composant R3F typé) + Draco/KTX2,
chargés via Next `dynamic(() => import(...), { ssr: false })`.

## Pourquoi du procédural ici (décision)

1. Tout est **réellement exécutable et testable** dans cet environnement.
2. Aucune dépendance de licence/art externe.
3. Les géométries restent modulaires : remplacer un `BuildingMesh` par un GLTF ne
   change ni le protocole ni le serveur.

## Limitations

- Stylisation low-poly assumée pour le Vertical Slice.
- Pas d'animations squelettales (bob procédural) ; le runtime de personnage animé
  existe déjà dans le créateur (`AvatarModel.tsx`) et sera réutilisé.
- Pas de LOD par maillage (l'intéressement serveur + le fog jouent ce rôle ici).
