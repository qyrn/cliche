# cliché

Captures d'écran pour KDE Plasma sous Wayland. Tu appuies sur Impr, tu choisis une zone, et l'image part dans le presse-papiers et dans `Images/Screenshots`.

## Ce qu'il fait

- Impr fige l'écran tout de suite. Tu glisses pour choisir une zone, puis tu peux la déplacer ou la redimensionner avec les bords.
- Entrée copie la zone et l'enregistre. Sans zone, Entrée prend tout l'écran.
- T lit le texte de la zone et le copie. La lecture tourne en local avec Tesseract.
- L'historique range toutes tes captures par jour. Un clic sur une image la recopie, un double-clic l'ouvre.

## Dans l'écran de sélection

| Touche                        | Action                     |
| ----------------------------- | -------------------------- |
| Glisser                       | Choisir une zone           |
| Entrée, Ctrl+C ou double-clic | Copier et enregistrer      |
| T                             | Copier le texte de la zone |
| Échap ou clic droit           | Annuler                    |

## Installation

Il te faut KDE Plasma 6 sous Wayland, `wl-clipboard`, `tesseract` avec `tesseract-data-fra` et `tesseract-data-eng`, et de quoi compiler du C avec `libsystemd`.

```sh
pnpm install
pnpm install:linux
```

Le script installe l'app dans `~/Applications/cliche`, ajoute l'entrée de menu et le lancement au démarrage. Pour changer de raccourci, va dans Configuration du système, puis Clavier, puis Raccourcis, et cherche cliché.

## Comment ça marche

Un petit programme en C (`native/kwin-grab.c`) demande l'image de l'écran à KWin par D-Bus et la renvoie en pixels bruts, sans passer par un fichier. La fenêtre de sélection reste en mémoire, prête à s'afficher dès que tu appuies sur la touche.
