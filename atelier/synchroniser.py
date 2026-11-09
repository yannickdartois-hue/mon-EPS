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
}

RE_VERSION = re.compile(r"""(const\s+(?:VERSION|CACHE|C)\s*=\s*['"][A-Za-z0-9_-]*?-v)(\d+)(['"])""")


def empreinte(p):
    with open(p, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def augmenter_version(depot):
    sw = os.path.join(depot, 'sw.js')
    if not os.path.isfile(sw):
        return None
    with open(sw, encoding='utf-8') as f:
        s = f.read()
    m = RE_VERSION.search(s)
    if not m:
        return None
    n = int(m.group(2)) + 1
    s = s[:m.start(2)] + str(n) + s[m.end(2):]
    with open(sw, 'w', encoding='utf-8') as f:
        f.write(s)
    return m.group(1).split("'")[-1].split('"')[-1] + str(n)


def main():
    ici = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description='Recopie les modules communs de mon-EPS dans les applis.')
    ap.add_argument('--appliquer', action='store_true', help='recopier et augmenter les versions (sinon : vérifier seulement)')
    ap.add_argument('--dossier', default=os.path.normpath(os.path.join(ici, '..', '..')),
                    help='dossier qui contient les clones des dépôts (par défaut : celui de mon-EPS)')
    a = ap.parse_args()

    ecarts, absents, manquants, modifies = [], [], set(), set()
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
                if a.appliquer:
                    shutil.copyfile(src, dst)
                    modifies.add(depot)

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
    print(('Recopié' if a.appliquer else 'Copie différente de l’original') + ' :')
    for c in ecarts:
        print('  - ' + c)
    if not a.appliquer:
        print('\nLancer avec --appliquer pour recopier les originaux.')
        return 1
    print('\n=== Versions des sw.js augmentées ===')
    for d in sorted(modifies):
        v = augmenter_version(os.path.join(a.dossier, d))
        print(f'  - {d} : ' + (v or 'sw.js ou numéro de version introuvable : À FAIRE À LA MAIN'))
    print('\nÀ faire : tester les applis modifiées, puis un commit par dépôt (message en français).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
