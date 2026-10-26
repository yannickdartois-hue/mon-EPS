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


def _rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def _mix(a, b, t):
    """Mélange la couleur a avec b (t = part de b)."""
    return '#' + ''.join(f'{round(x * (1 - t) + y * t):02x}' for x, y in zip(_rgb(a), _rgb(b)))


def charte(a):
    """Petit <style> « Charte v1 » propre à l'activité : sa couleur et la teinte de chaque cycle.
    Règle : 1 cycle = couleur normale ; 2 cycles = le niveau le plus bas en clair, le plus haut en foncé ;
    un 3e cycle (ex. Autonomie) = couleur normale. Les teintes sont déclarées dans activites.json."""
    c = a['couleur']
    v = {'clair': (_mix(c, '#ffffff', .80), '#1c2128'),
         'normal': (c, '#ffffff'),
         'fonce': (_mix(c, '#000000', .38), '#ffffff')}
    vs = {'clair': (_mix(c, '#161b22', .55), '#e6edf3'),        # thème sombre (option)
          'normal': (_mix(c, '#ffffff', .25), '#0d1117'),
          'fonce': (_mix(c, '#ffffff', .55), '#0d1117')}
    l = [f':root{{--act:{c};--act-fonce:{_mix(c, "#000000", .38)};--act-pale:{_mix(c, "#ffffff", .88)};'
         f'--act-sombre:{_mix(c, "#ffffff", .45)};--act-pale-sombre:{_mix(c, "#161b22", .78)}}}']
    for k, t in a['teintes'].items():
        (b, s), (bs, ss) = v[t], vs[t]
        l.append(f':root{{--c-{k}:{b};--c-{k}-pale:{_mix(c, "#ffffff", .88)}}}')
        l.append(f'body.niv-{k}{{--niv:{b};--sur-niv:{s};--niv-pale:var(--act-pale)}}')
        l.append(f':root[data-theme="dark"] body.niv-{k}{{--niv:{bs};--sur-niv:{ss}}}')
        l.append(f'.cy button[data-cy={k}].on{{background:{b};color:{s}}}')
        l.append(f':root[data-theme="dark"] .cy button[data-cy={k}].on{{background:{bs};color:{ss}}}')
        l.append(f'.pc.niv-{k} .sc.jour{{outline-color:var(--ligne)}}')
        l.append(f'.pc.niv-{k}{{--nivp:{c if t == "clair" else b}}}')  # liseré des cartes de séance : jamais trop pâle sur blanc
    return '\n'.join(l)


def page(cle, a):
    g = lire(os.path.join(ICI, 'gabarit.html'))
    liens = ''.join(f'  <a class="bt clair" href="{u}">{t}</a>\n' for t, u in a['liens'])
    val = dict(a, liens=liens, charte=charte(a),
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
    if '"eps-charte-v1.css"' not in texte:
        texte = texte.replace('"eps-outil.css",', '"eps-outil.css", "eps-charte-v1.css",', 1)
        if '"eps-charte-v1.css"' not in texte:
            raise ValueError('liste hors ligne introuvable dans sw.js (charte)')
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
