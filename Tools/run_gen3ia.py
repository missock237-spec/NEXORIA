#!/usr/bin/env python3
"""NEXORIA — Tools/run_gen3ia.py : lanceur pratique du pipeline Gen3ia.

Usage équivalent à `python3 -m Gen3ia <étage>` depuis la racine du dépôt.
Exemples :
    python3 Tools/run_gen3ia.py full
    python3 Tools/run_gen3ia.py validate
    python3 Tools/run_gen3ia.py maps meshes docs
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    return subprocess.call([sys.executable, "-m", "Gen3ia", *sys.argv[1:]], cwd=ROOT)


if __name__ == "__main__":
    raise SystemExit(main())
