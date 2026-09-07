# PERMADEATH_SYSTEM — Mort définitive des PNJ

## Règle absolue

Un PNJ mort **ne respawn jamais**. Aucun timer, aucun reset, aucune exception.
La mort est validée par le serveur (`NpcService.killNpc`), consignée de façon
irréversible dans la table `NpcDeath`, et l'état `Npc.lifeState = 'DEAD'` est persisté.
Validé par les tests T5/T10 : le PNJ tué est absent des vivants après reconnexion
**et après redémarrage du serveur**.

## Séquence de mort (10 étapes de la charte → implémentation)

1. **Le serveur valide la mort** — `hurtNpc()` : PV ≤ 0 → `killNpc(npc, killer, cause)`.
2. **L'événement est enregistré** — ligne `NpcDeath` (tueur, cause, jour, heure en jeu).
3. **Aucun respawn** — le PNJ est filtré des vivants dans tous les snapshots ;
   son corps reste visible au sol (`deadNpcs` du welcome).
4. **Les relations sont mises à jour** — les membres de la famille reçoivent le deuil
   (`griefUntil` = 2 jours en jeu) et mémorisent l'événement.
5. **La famille réagit** — elle reste au domicile, refuse le bavardage habituel.
6. **Le métier devient vacant** — si le PNJ avait un métier économique, la prospérité
   du village chute de 6 et l'annonce « Le métier de X est vacant » est diffusée.
   (La Forge sans forgeron ne produit plus de bâtisseurs bonus si toute la lignée
   meurt.)
7. **Le logement change d'état** — le domicile reste présent (foncier persistant) ;
   la réaffectation viendra avec le système de succession.
8. **Les quêtes associées sont recalculées** — les quêtes de chasse ne référencent que
   des monstres (non concernées) ; les quêtes liées à un PNJ sont annulables via
   Gen3ia (extension prévue).
9. **Les agents Gen3ia reçoivent l'information** — `gen3ia.notifyDeath()` → mémoire
   du monde (`logWorld`).
10. **Le monde conserve cette conséquence** — broadcasts `npc_died` + `chat` + `toast`,
    écritures en base immédiates.

## Causes de mort possibles

- `monster:<id>` — attaque de Rôdeur (invasions, errances).
- `world` — conséquences d'événements futurs (famine, guerres).
- `gm` — outil de test serveur (clé GM, jamais exposé au client).

## Ce que la mort NE fait PAS

- Elle ne supprime pas le PNJ de la base (son histoire reste consultable).
- Elle ne réapparaît jamais « par magie » après un redémarrage (testé).
- Elle n'est jamais déclenchable directement par un client (aucune route).

## Limitations honnêtes

- Pas encore de système de succession automatique (apprenti → maître) : le métier
  reste vacant jusqu'à l'implémentation du module de succession.
- Pas de enterrement/cérémonie : le deuil est comportemental (repli au domicile).
