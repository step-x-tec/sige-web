# SIGE — Frontend (Next.js)

## Installation

```bash
npm install
```

Crée un fichier `.env.local` :

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

(l'URL du backend NestJS livré précédemment)

```bash
npm run dev
```

## Périmètre livré dans cette première tranche

Volontairement restreint plutôt qu'une tentative de couvrir les ~45 écrans
de la navigation du §44 d'un coup — sans retour de ta part sur celui-ci, je
risquais de construire 40 écrans dans une direction que tu voudrais changer.

- `/login` — connexion + MFA (§48)
- `/today` — "Mon espace" enseignant : cours du jour, appel intelligent (§11, §14)
- `/attendance/[slotId]` — effectif de la classe + saisie rapide des
  présences, avec "tout marquer présent" par défaut et correction des
  seules exceptions (§13, §45 : "l'appel doit pouvoir être effectué en
  quelques secondes")

C'est délibérément le parcours enseignant le plus cité dans le cahier des
charges (§69 : "c'est cette simplicité qui doit distinguer la plateforme"),
pas un choix arbitraire de point de départ.

## Plan de design (à valider avec toi)

Je n'ai pas attendu de validation pour livrer quelque chose d'utilisable,
mais ce plan reste ouvert à la discussion — rien n'est figé.

**Palette "cahier/tableau noir"** — ancrée dans le sujet (école) plutôt que
les réflexes SaaS génériques (bleu corporate) ou les tics visuels IA actuels
(crème + terracotta) :
- `paper` `#FAF9F5` — fond, papier chaud
- `ink` `#20241F` — texte, noir chaud
- `board` `#2B4736` — vert tableau noir, couleur d'action principale
- `chalk` `#E8C468` — jaune craie, accent secondaire (statut "en cours")
- `clay` `#A6472B` — brique/rouille, réservé aux états d'alerte (absent),
  jamais décoratif
- `rule` `#DEDACD` — gris-beige clair, bordures et séparateurs

**Typographie** : Fraunces (serif à caractère, titres — évoque le cahier
plutôt qu'un dashboard froid) + IBM Plex Sans (interface, très lisible sur
mobile) + IBM Plex Mono (réservé aux matricules/codes, jamais décoratif).

**Layout** : listes empilées à bordure fine plutôt que grille de cartes à
ombre — le cours en cours se distingue par une bordure gauche verte, pas
par une ombre portée. Mobile-first : c'est l'écran d'un enseignant sur son
téléphone entre deux cours (§45), pas un tableau de bord desktop.

## Prochaines tranches suggérées, par ordre de valeur

1. Espace titulaire de classe (§20-21) — vue d'ensemble d'une classe
2. Saisie de notes (réutilise le même principe que l'appel : liste +
   correction rapide)
3. Espace administrateur (élèves, classes, finance) — plus proche d'un
   tableau de gestion classique, direction visuelle différente à discuter
4. Portails parent/élève — desktop autant que mobile, contenu en lecture
   seule

## Limites connues de cette tranche

- Pas de mode hors-ligne (§46) — l'appel échoue si la connexion tombe
  pendant la saisie, à traiter séparément (service worker + file d'attente
  locale).
- Pas de tests (unitaires, e2e) — à ajouter avant toute mise en production.
- Le rafraîchissement de token (`lib/api.ts`) suppose un seul onglet actif ;
  pas de synchronisation multi-onglets pour l'instant.

## Mise à jour — espace titulaire de classe (§20-21), frontend

- `/classes` — liste des classes dont l'utilisateur est titulaire.
- `/classes/[classId]` — effectif + liste des enseignants de la classe.

### Volontairement pas encore dans cette page

Les statistiques du "Tableau de bord du titulaire" décrites au §21
(présence du jour, moyenne générale, notes manquantes, % de bulletins
terminés) ne sont pas encore affichées — elles demandent soit de nouveaux
endpoints d'agrégation backend, soit d'assembler plusieurs appels existants
côté frontend, et je préfère te livrer la vue de base fonctionnelle
maintenant plutôt que de retarder cette tranche pour tout faire d'un coup.

## Mise à jour — saisie de notes (§16-17)

- `/assessments/new` — création d'une évaluation (titre, période, date,
  barème, coefficient), accessible depuis le bouton "Nouvelle évaluation"
  sur `/today`.
- `/assessments/[assessmentId]` — saisie des notes : effectif de la classe
  fusionné avec les notes déjà saisies (utile pour corriger), validation du
  barème en direct (note hors barème → champ en rouge, bouton
  d'enregistrement désactivé tant que ça n'est pas corrigé), case vide =
  "note manquante" plutôt qu'un zéro forcé (§52). Si l'évaluation est
  verrouillée, les champs sont désactivés avec un message explicite plutôt
  qu'un échec silencieux à la soumission.

### Volontairement pas encore fait

Pas d'écran pour lister les évaluations déjà créées d'un enseignement (donc
pas de moyen de revenir corriger une évaluation depuis l'interface une fois
qu'on a quitté la page) — seul le flux création → saisie immédiate est
couvert. Pareil pour le workflow de validation (contrôle/validation/
verrouillage, §19) côté titulaire/admin : construit côté backend, pas encore
d'écran dédié côté frontend.

## Correction — écran de première configuration MFA

`/login` affiche maintenant la clé secrète à ajouter dans une application
d'authentification quand le backend répond `mfaSetupRequired: true` (rôles
à MFA obligatoire, première connexion). Sans ça, l'écran de saisie du code
apparaissait sans qu'aucune clé n'ait jamais été communiquée nulle part.

## Mise à jour — écrans d'administration minimaux

Répond directement à la friction notée dans le guide de test (tout passait
par `curl`) :

- `/admin/academic-years` — création + activation d'année scolaire
- `/admin/classes` — création de classe, avec ajout rapide de campus/niveau
  repliable si besoin
- `/admin/subjects` — création de matière
- `/admin/students` — création d'élève + recherche + inscription dans une
  classe
- `/admin/staff` — création de compte enseignant/personnel, affiche le mot
  de passe temporaire à communiquer

### Simplifications assumées

- `useInstitution()` prend le premier établissement du tenant — correct
  tant qu'il n'y en a qu'un, à transformer en sélecteur le jour où un
  tenant en gère plusieurs (§57).
- Le lien "Administration" est visible dans la navigation pour tout
  utilisateur connecté, sans filtrage par rôle — un enseignant qui clique
  dessus obtiendra des erreurs 403 du backend plutôt qu'un menu adapté à
  ses droits. Pas grave pour tester avec le compte admin, mais à corriger
  (cacher les liens selon les permissions réelles) avant un usage réel
  multi-rôles.
- Pas d'écran pour enseignements (`teaching-assignments`) ni créneaux
  d'emploi du temps (`timetable-slots`) — toujours par `curl` pour l'instant
  (voir TESTING.md, étape 7). Les formulaires de classe reproduisent tous
  les mêmes patterns ; ceux-ci sont les prochains si tu veux fermer ce
  chapitre.

## Mise à jour — écran enseignements + emploi du temps (§10, §22)

`/admin/timetables` ferme le dernier besoin de `curl` pour un premier test
de bout en bout complet : attribution d'enseignement (matière + enseignant
à une classe) puis créneaux d'emploi du temps, avec la liste des
enseignements déjà attribués affichée pour éviter les doublons. Les
conflits (enseignant/classe/salle déjà occupés, §22) restent détectés côté
backend — le formulaire affiche l'erreur telle que renvoyée par l'API sans
duplication de la logique de contrôle côté frontend.

Avec cette page, TESTING.md peut être suivi entièrement dans le navigateur
à partir de la connexion admin, sans plus aucun appel `curl` pour les
étapes 5 à 7.

## Mise à jour — portails parent & élève (frontend, §34-35)

- Après connexion, `/` interroge `GET /auth/me` et redirige vers `/today`
  (staff), `/parent` (parent) ou `/student` (élève).
- `/parent` — liste des enfants ; `/parent/[studentId]` — emploi du temps,
  présences, bulletins (avec ouverture du PDF), solde dû.
- `/student` — mêmes onglets, scopés sur soi-même, pas de sélection
  d'enfant.
- `lib/api.ts` : nouvelle méthode `getBlobUrl()` pour les réponses binaires
  (PDF) — le fetch JSON habituel ne convenait pas.

### Simplification assumée

Un compte qui cumulerait plusieurs profils (staff ET parent, par exemple)
est redirigé uniquement vers l'espace staff — pas de sélecteur pour basculer
entre profils. Cas rare en pratique (un même compte est presque toujours un
seul rôle), mais à corriger si le besoin se présente.

## Mise à jour — écran liste des évaluations (dernier gap connu fermé)

`/assessments?teachingAssignmentId=...` — remplace le bouton "Nouvelle
évaluation" sur `/today` par "Évaluations" : liste toutes les évaluations
de l'enseignement (statut, nombre de notes saisies), avec la création
toujours accessible depuis cette liste. Plus besoin de perdre l'accès à une
évaluation après avoir quitté sa page de saisie.

## Mise à jour — dernier gap connu fermé : filtrage du menu par rôle

- Le lien "Administration" n'apparaît plus dans la navigation que si
  `permissions.includes('users.manage')` (proxy pour "profil
  administratif").
- `/admin` lui-même redirige vers `/today` si l'utilisateur n'a pas cette
  permission — protège aussi contre un accès direct par URL, pas seulement
  contre le lien visible.
- Le contrôle réel reste entièrement côté backend (`PermissionsGuard`) —
  ce filtrage n'est qu'ergonomique, jamais une garantie de sécurité en soi.

Avec ça, plus aucun gap connu de ma part sur les fonctionnalités déjà
construites. Prochaines directions possibles : mode hors-ligne pour
l'appel (§46), tests automatisés, ou étendre la couverture fonctionnelle
(bibliothèque, transport, cantine — évolutions listées au §71).

## Mise à jour — mode hors ligne pour l'appel (§46)

Portée volontairement limitée à l'appel — la fonctionnalité explicitement
citée au §46, pas une tentative de rendre tout le frontend hors-ligne d'un
coup.

### Ce qui fonctionne sans réseau

1. **Consulter son cours et son effectif** — `/today` et la page d'appel
   servent la dernière réponse connue (mise en cache dans IndexedDB à
   chaque chargement réussi) si le réseau ne répond pas, avec un bandeau
   "chargé depuis la dernière sauvegarde locale" pour ne jamais laisser
   croire que c'est à jour.
2. **Faire l'appel** — si l'enregistrement échoue faute de réseau (pas une
   erreur applicative — permission refusée, créneau invalide, etc., qui
   reste affichée normalement), la saisie part dans une file d'attente
   IndexedDB au lieu d'être perdue. L'enseignant voit "Enregistré
   localement — sera synchronisé" et peut continuer sa journée.
3. **Synchronisation automatique** — au retour du réseau (évènement
   navigateur `online`), la file se vide toute seule vers le backend. Un
   bandeau en haut de l'app affiche le nombre d'appels en attente, avec un
   bouton "Synchroniser maintenant" si l'utilisateur ne veut pas attendre.

### Pourquoi pas de résolution de conflit complexe

`POST /attendance/submit` fait un UPSERT par (session du jour, élève) côté
backend — rejouer un appel en attente écrase juste la valeur avec la
dernière saisie de l'enseignant. Pas de fusion à inventer pour ce cas
précis ; documenté en commentaire dans `offlineSync.ts` plutôt que
construit "au cas où".

### Fichiers ajoutés

- `public/sw.js` — service worker minimal, cache l'app shell (HTML/JS/CSS)
  pour que l'app se charge sans réseau ; n'intercepte jamais les appels API
  (autre origine, données dynamiques — gérées séparément).
- `lib/offlineDb.ts` — wrapper IndexedDB (cache de lecture + file d'écriture).
- `lib/offlineSync.ts` — vidage de la file, écoute de l'évènement `online`.
- `components/OfflineBanner.tsx` — indicateur visuel.

### Limite assumée

Un échec autre que réseau sur un élément en file (ex: le créneau a été
supprimé entre-temps par un admin) le laisse bloqué indéfiniment dans la
file avec cette logique simple — pas de mécanisme de purge après N échecs
pour l'instant. À ajouter si ça devient un vrai cas en usage réel plutôt
que construit par anticipation.

## Mise à jour — mode hors ligne étendu à la saisie de notes

Même mécanisme que l'appel, appliqué à `/assessments/[id]` : l'évaluation et
l'effectif se chargent depuis le cache local si le réseau est indisponible,
et la soumission des notes part dans sa propre file d'attente
(`pendingGrades`, IndexedDB v2 — migration automatique, pas d'action
nécessaire) si l'enregistrement échoue faute de réseau. Le bandeau en haut
de l'app affiche maintenant le total combiné (appels + notes) en attente de
synchronisation, avec le même bouton "Synchroniser maintenant".

Même raisonnement que pour l'appel sur l'absence de résolution de conflit :
`POST /assessments/:id/grades` fait un UPSERT par (évaluation, élève) côté
backend, donc rejouer une saisie en attente écrase simplement avec la
dernière valeur saisie.
