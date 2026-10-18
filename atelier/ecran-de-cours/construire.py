#!/usr/bin/env python3
"""Fabrique l'écran de cours des 5 cycles à partir d'une seule source.

    python3 construire.py             reconstruit les dépôts (../../../<dépôt>/)
    python3 construire.py --verifier  ne change rien ; signale tout dépôt qui a
                                      dérivé de la source (modifié à la main)

Ce qui est écrit dans chaque dépôt :
  - index.html  : gabarit.html + apps/<activité>.css + apps/<activité>.js
  - ecran.js, ecran.css : le moteur commun (copie identique partout)
  - commun/*    : eps-design.css, eps-outil.css, eps-commun.js (copies identiques)
  - sw.js       : ecran.js et ecran.css ajoutés à la liste hors ligne, et numéro
                  de cache augmenté dès qu'un fichier a changé (l'iPad recharge).
"""
import json, os, re, sys

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.normpath(os.path.join(ICI, '..', '..', '..'))  # dossier qui contient les dépôts
COMMUNS = ['ecran.js', 'ecran.css'] + ['commun/' + f for f in sorted(os.listdir(os.path.join(ICI, 'commun')))]


def lire(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def page(cle, a):
    g = lire(os.path.join(ICI, 'gabarit.html'))
    liens = ''.join(f'  <a class="bt clair" href="{u}">{t}</a>\n' for t, u in a['liens'])
    val = dict(a, liens=liens,
               css=lire(os.path.join(ICI, 'apps', cle + '.css')).strip(),
               config=lire(os.path.join(ICI, 'apps', cle + '.js')))
    def rempl(m):
        k = m.group(1)
        if k not in val:
            sys.exit(f'{cle} : « {k} » manque dans apps/activites.json')
        return str(val[k])
    return re.sub(r'\{\{(\w+)\}\}', rempl, g)


def sw_maj(texte, monter):
    if '"ecran.js"' not in texte:
        texte = texte.replace('"eps-outil.css",', '"eps-outil.css", "ecran.css", "ecran.js",', 1)
        if '"ecran.js"' not in texte:
            raise ValueError('liste hors ligne introuvable dans sw.js')
    if monter:
        texte, n = re.subn(r"(const (?:CACHE|V|C)='[^']*?)(\d+)'", lambda m: f"{m.group(1)}{int(m.group(2)) + 1}'", texte, count=1)
        if not n:
            raise ValueError('numéro de cache introuvable dans sw.js')
    return texte


def main():
    verifier = '--verifier' in sys.argv
    acts = json.loads(lire(os.path.join(ICI, 'apps', 'activites.json')))
    seul = [x for x in sys.argv[1:] if not x.startswith('--')]
    derive = False
    for cle, a in acts.items():
        if seul and cle not in seul:
            continue
        depot = os.path.join(RACINE, a['depot'])
        voulu = {'index.html': page(cle, a)}
        for f in COMMUNS:
            voulu[os.path.basename(f)] = lire(os.path.join(ICI, f))
        change = [n for n, t in voulu.items()
                  if not os.path.exists(os.path.join(depot, n)) or lire(os.path.join(depot, n)) != t]
        swp = os.path.join(depot, 'sw.js')
        sw = lire(swp)
        sw_neuf = sw_maj(sw, bool(change))
        if verifier:
            etat = 'à jour' if not change and sw_neuf == sw else 'DIFFÉRENT de la source : ' + ', '.join(change or ['sw.js'])
            derive |= etat != 'à jour'
            print(f'{cle:16} {etat}')
            continue
        for n in change:
            with open(os.path.join(depot, n), 'w', encoding='utf-8') as f:
                f.write(voulu[n])
        if sw_neuf != sw:
            with open(swp, 'w', encoding='utf-8') as f:
                f.write(sw_neuf)
        print(f'{cle:16} ' + ('rien à changer' if not change and sw_neuf == sw else 'écrit : ' + ', '.join(change + (['sw.js'] if sw_neuf != sw else []))))
    if verifier and derive:
        sys.exit(1)


if __name__ == '__main__':
    main()
