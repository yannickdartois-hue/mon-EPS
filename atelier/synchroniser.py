#!/usr/bin/env python3
"""
synchroniser.py — recopie les MODULES COMMUNS de l'atelier mon-EPS dans chaque appli.

Principe (« cœur commun », étape 1) :
  - chaque module commun a UN original, ici dans mon-EPS/atelier ;
  - chaque appli garde SA copie (elle reste autonome : portable seule, par activité,
    par exemple vers EPSBox ; une erreur dans une appli ne touche pas les autres) ;
  - ce script recopie l'original partout où il est utilisé, augmente le numéro de
    version du sw.js des applis modifiées (sinon les tablettes gardent l'ancien
    fichier en cache) et signale toute copie qui a divergé.

Usage (depuis un dossier qui contient les clones des dépôts côte à côte) :
  python3 mon-EPS/atelier/synchroniser.py              # vérifie seulement (rien n'est modifié)
  python3 mon-EPS/atelier/synchroniser.py --appliquer  # recopie et augmente les versions
  python3 mon-EPS/atelier/synchroniser.py --dossier /chemin/vers/les/clones

Code de sortie : 0 si tout est identique (ou après --appliquer), 1 s'il reste des écarts.
Le script ne publie rien : relire, tester, puis faire les commits (message en français).

Ajouter une appli : l'ajouter dans les listes ci-dessous (dépôt/chemin du fichier).
Ajouter un module : créer l'original dans l'atelier, puis une entrée dans MODULES.
Un module absent d'une appli n'est PAS ajouté automatiquement (il faudrait aussi
la balise <script> et la ligne dans sw.js) : le script le signale seulement.
"""
import argparse, hashlib, os, re, shutil, sys

ELEVES = ['gym-eleves', 'demi-fond-eleves', 'tennis-de-table-eleves', 'badminton-eleves',
          'cross-training-eleves', 'Carnet-Step-']
PROFS = ['gym-prof', 'demi-fond-prof', 'tennis-de-table-prof', 'badminton-prof', 'cross-training-prof']

# original (relatif à mon-EPS/atelier)  ->  copies « dépôt/chemin »
MODULES = {
    'applis-eleves/eps-code.js':       [f'{r}/eps-code.js' for r in ELEVES + PROFS],
    'applis-eleves/eps-avatars.js':    [f'{r}/eps-avatars.js' for r in ELEVES + PROFS],
    'applis-eleves/eps-rappel.js':     [f'{r}/eps-rappel.js' for r in ELEVES],
    'applis-eleves/eps-pouls.js':      ['demi-fond-eleves/eps-pouls.js', 'Carnet-Step-/eps-pouls.js'],
    'ecran-de-cours/commun/eps-aide.js':   [f'{r}/eps-aide.js' for r in ELEVES + PROFS],
    'ecran-de-cours/commun/eps-maj.js':    [f'{r}/eps-maj.js' for r in ELEVES + PROFS],
    'ecran-de-cours/commun/eps-coffre.js': [f'{r}/eps-coffre.js' for r in PROFS] + ['Carnet-Step-/prof/eps-coffre.js'],
    'ecran-de-cours/commun/eps-garde.js':  [f'{r}/eps-garde.js' for r in PROFS] + ['Carnet-Step-/prof/eps-garde.js'],
    # barre violette « 🎭 DÉMO » (20/11/2026)
    'ecran-de-cours/commun/eps-demo.js':  [f'{r}/eps-demo.js' for r in ELEVES + PROFS]
                                          + ['musculation-eleves/eps-demo.js', 'musculation-prof/eps-demo.js', 'CCF-Demi-Fond-PROF/eps-demo.js'],
}
# Musculation (20/11/2026) : mêmes modules communs que les autres applis, sauf les avatars (non utilisés)
for _orig, _copies in {
    'applis-eleves/eps-code.js':           ['musculation-eleves/eps-code.js', 'musculation-prof/eps-code.js'],
    'applis-eleves/eps-rappel.js':         ['musculation-eleves/eps-rappel.js'],
    'applis-eleves/eps-pouls.js':          ['musculation-eleves/eps-pouls.js'],
    'ecran-de-cours/commun/eps-aide.js':   ['musculation-eleves/eps-aide.js', 'musculation-prof/eps-aide.js'],
    'ecran-de-cours/commun/eps-maj.js':    ['musculation-eleves/eps-maj.js', 'musculation-prof/eps-maj.js'],
    'ecran-de-cours/commun/eps-coffre.js': ['musculation-prof/eps-coffre.js'],
    'ecran-de-cours/commun/eps-garde.js':  ['musculation-prof/eps-garde.js'],
}.items():
    MODULES[_orig] = MODULES[_orig] + _copies

# Numéros de version décimaux (v1.2, v2.0…) — règle de Yannick : on lui DEMANDE le numéro avant chaque mise en ligne
# (petit changement = +0.1, très gros changement = version majeure). Le script ne choisit donc jamais seul.
RE_VERSION = re.compile(r"""(const\s+(?:VERSION|CACHE|C)\s*=\s*['"][A-Za-z0-9_.-]*?-v)(\d+(?:\.\d+)?)(['"])""")
RE_NUMERO = re.compile(r'^v?(\d+\.\d+)$')


def empreinte(p):
    with open(p, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def lire_version(depot):
    """Version actuelle du sw.js du dépôt (ex. '1.2'), ou None."""
    sw = os.path.join(depot, 'sw.js')
    if not os.path.isfile(sw):
        return None
    with open(sw, encoding='utf-8') as f:
        m = RE_VERSION.search(f.read())
    return m.group(2) if m else None


def proposer(v):
    a, _, b = v.partition('.')
    return f'{a}.{int(b or 0) + 1}'


def ecrire_version(depot, nouvelle):
    sw = os.path.join(depot, 'sw.js')
    with open(sw, encoding='utf-8') as f:
        s = f.read()
    m = RE_VERSION.search(s)
    s = s[:m.start(2)] + nouvelle + s[m.end(2):]
    if not s.strip():
        raise RuntimeError('sw.js vide : arrêt')
    with open(sw, 'w', encoding='utf-8') as f:
        f.write(s)


def demander_versions(depots, dossier, donnees):
    """Numéro de version de chaque dépôt modifié : --versions, sinon question posée dans le terminal.
    Rend None si un numéro manque ou est invalide (rien n'est alors recopié)."""
    choix = {}
    for d in sorted(depots):
        actuelle = lire_version(os.path.join(dossier, d))
        if actuelle is None:
            print(f'!! {d} : sw.js ou numéro de version introuvable. Rien n’est recopié.')
            return None
        rep = donnees.get(d)
        if rep is None:
            if not sys.stdin.isatty():
                print(f'!! {d} : numéro de version non donné (actuelle v{actuelle}, petit changement : v{proposer(actuelle)}).'
                      '\n   Relancer avec --versions ' + ','.join(f'{x}=…' for x in sorted(depots)) + '. Rien n’est recopié.')
                return None
            rep = input(f'Nouvelle version pour {d} (actuelle v{actuelle}, petit changement : v{proposer(actuelle)}) : ').strip()
        m = RE_NUMERO.match(rep)
        if not m:
            print(f'!! {d} : « {rep} » n’est pas un numéro comme 1.3 ou 2.0. Rien n’est recopié.')
            return None
        if tuple(map(int, m.group(1).split('.'))) <= tuple(map(int, actuelle.split('.'))):
            print(f'!! {d} : v{m.group(1)} n’est pas plus grand que v{actuelle}. Rien n’est recopié.')
            return None
        choix[d] = m.group(1)
    return choix


def main():
    ici = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description='Recopie les modules communs de mon-EPS dans les applis.')
    ap.add_argument('--appliquer', action='store_true', help='recopier et changer les versions (sinon : vérifier seulement)')
    ap.add_argument('--versions', default='',
                    help='numéros choisis par Yannick, ex. gym-prof=1.3,badminton-eleves=1.2 (sinon le script les demande)')
    ap.add_argument('--dossier', default=os.path.normpath(os.path.join(ici, '..', '..')),
                    help='dossier qui contient les clones des dépôts (par défaut : celui de mon-EPS)')
    a = ap.parse_args()
    donnees = dict(x.split('=', 1) for x in a.versions.split(',') if '=' in x)

    ecarts, absents, manquants, a_copier = [], [], set(), []
    for orig, copies in MODULES.items():
        src = os.path.join(ici, orig)
        if not os.path.isfile(src):
            print(f'!! original introuvable : atelier/{orig}')
            ecarts.append(orig)
            continue
        h = empreinte(src)
        for c in copies:
            depot = c.split('/')[0]
            if not os.path.isdir(os.path.join(a.dossier, depot)):
                manquants.add(depot)
                continue
            dst = os.path.join(a.dossier, c)
            if not os.path.isfile(dst):
                absents.append(c)
                continue
            if empreinte(dst) != h:
                ecarts.append(c)
                a_copier.append((src, dst, depot))

    print('=== Modules communs ===')
    if manquants:
        print('Dépôts non trouvés (non vérifiés) : ' + ', '.join(sorted(manquants)))
    if absents:
        print('Module absent (à ajouter à la main si besoin : <script> + sw.js) :')
        for c in absents:
            print('  - ' + c)
    if not ecarts:
        print('Toutes les copies sont identiques aux originaux.')
        return 0
    print('Copie différente de l’original :')
    for c in ecarts:
        print('  - ' + c)
    if not a.appliquer:
        print('\nLancer avec --appliquer pour recopier les originaux (le numéro de version de chaque appli sera demandé).')
        return 1
    depots = {d for _, _, d in a_copier}
    print('\n=== Numéros de version (à choisir par Yannick) ===')
    choix = demander_versions(depots, a.dossier, donnees)
    if choix is None:
        return 2
    for src, dst, _ in a_copier:
        shutil.copyfile(src, dst)
    print('\n=== Recopié, versions changées ===')
    for d in sorted(choix):
        ecrire_version(os.path.join(a.dossier, d), choix[d])
        print(f'  - {d} : v{choix[d]}')
    print('\nÀ faire : tester les applis modifiées, puis un commit par dépôt (message en français).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
