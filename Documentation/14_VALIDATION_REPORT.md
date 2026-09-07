# RAPPORT DE VALIDATION (étapes 17-18)

> Document GÉNÉRÉ par Gen3ia depuis WorldData/ — ne pas éditer à la main.



**0 erreur(s), 1 avertissement(s), 0 autocorrection(s).**

| Contrôle | État | Détail |
|---|---|---|
| heightmaps_seams | ⚠️ | discontinuités > 8 m : 50/435 (max 22.19 m) |
| settlements_slope | ✅ | sites trop pentus : [] |
| settlements_flooded | ✅ | sites inondés : [] |
| settlements_height_drift | ✅ | 0 corrigés par aplatissement + re-snap |
| poi_ground_drift | ✅ | 0 POI re-snapés sur le terrain |
| rivers_reach_water | ✅ | 3 fleuves ne rejoignent pas clairement l'eau (confluences internes comptées) |
| caves_entrances | ✅ | 0 entrée(s) reclassée(s) subaquatique(s) |
| dungeons_graph | ✅ | salles isolées : [] |
| routes_length | ✅ | routes très longues : [] |
| perf_budget_low | ✅ | LOW : ~12 chunks actifs, ~72000 tris terrain (budget 300k) |

## Limitations connues (honnêteté du pipeline)

- Les discontinuités résiduelles (≤ 22 m) se concentrent sur les falaises raides, où la méthode des différences secondes atteint sa limite ; en jeu, les chunks voisins partagent la même fonction de base, l'artefact reste local.
- La détection terre/mer des grottes utilise le masque 512 (128 m/px) ; le validateur reclasse en *subaquatique* toute entrée sous le niveau marin fin.