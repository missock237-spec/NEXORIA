#!/bin/bash
# Parcours E2E : titre → monde → village → portail → hub → duel
set -e
AB=agent-browser

walk() { # walk <yaw> <seconds>
  $AB eval "window.__nx.setVillageCam($1); window.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyW'}))" > /dev/null
  sleep "$2"
  $AB eval "window.dispatchEvent(new KeyboardEvent('keyup', {code: 'KeyW'}))" > /dev/null
}

pos() { $AB eval "JSON.stringify(window.__nx.playerState)"; }

$AB reload > /dev/null
sleep 9
$AB find text "RETOURNER AU MONDE" click > /dev/null || true
sleep 2.5
$AB find text "ENTRER" click > /dev/null || true
sleep 7
$AB find text "CONTINUER" click > /dev/null || true
sleep 2

# Navigation vers le portail (11,-7) : Est puis Nord puis ajustements
walk 1.5708 8
walk 1.5708 8
walk 1.5708 8
walk 1.5708 6
pos
walk 0 9
walk 0 9
walk 0 9
walk 0 9
pos
walk -0.34 9
walk -0.34 6
pos
