# Document d'Architecture : Cycle de Vie d'une Partie

Ce document décrit le cycle de vie complet d'une session de jeu sur Red Tetris, de sa création dynamique à sa destruction. Il sert de complément au `DOC-architecture.md` en se concentrant sur le flux temporel et les interactions.

## Philosophie

Le serveur est conçu pour être sans état persistant. Une partie ("Game Room") n'existe que si au moins un joueur y est connecté. Elle est créée à la volée pour le premier joueur et est automatiquement détruite lorsque le dernier joueur la quitte. Cela garantit une utilisation efficace des ressources du serveur.

---

## Les 4 Phases du Cycle de Vie

Le cycle de vie d'une partie peut être décomposé en quatre phases distinctes : la Naissance, la Croissance, la Vie et la Fin.

### Phase 1 : La Naissance (Création)

La naissance d'une partie est déclenchée par le **premier joueur** qui tente de rejoindre une "room" qui n'existe pas encore.

1.  **Déclencheur (Client)** : Un utilisateur navigue vers une URL formatée : `/#/nom-de-la-partie/nom-du-joueur`.
2.  **Réaction (Client)** : Dans `App.vue`, le `watchEffect` détecte les paramètres de l'URL et appelle l'action `gameStore.initializeSocket()`.
3.  **Connexion (Client -> Serveur)** : Le `gameStore` établit la connexion `socket.io` et, une fois connecté, émet l'événement `joinGame` avec les informations de la partie et du joueur.
4.  **Création (Serveur)** : Le serveur reçoit `joinGame`. Il constate qu'aucune partie n'existe pour `nom-de-la-partie` dans son registre `activeGames`.
    *   Il crée une nouvelle instance : `new Game(...)`.
    *   Il stocke cette instance dans `activeGames`.
    *   **Il démarre la boucle de jeu** en créant un `setInterval` qui appellera périodiquement la méthode `game.tick()`. L'ID de cet intervalle est stocké dans `gameIntervals`.
5.  **Confirmation (Serveur -> Client)** : Le serveur envoie immédiatement un premier `gameStateUpdate` pour que le client ait l'état initial du jeu.

**Résultat :** Une nouvelle partie est vivante sur le serveur, avec sa propre boucle de jeu active.

### Phase 2 : La Croissance (Jonction)

La phase de croissance se produit lorsqu'un **deuxième joueur (ou plus)** rejoint une partie déjà existante.

1.  **Déclencheur (Client)** : Un autre utilisateur navigue vers la même URL de partie (`/#/nom-de-la-partie/autre-nom`).
2.  **Connexion (Client -> Serveur)** : Le processus est identique : `watchEffect` -> `initializeSocket` -> `joinGame`.
3.  **Jonction (Serveur)** : Le serveur reçoit `joinGame`. Cette fois, il trouve une instance de jeu existante pour `nom-de-la-partie` dans `activeGames`.
    *   Il **n'appelle pas** `new Game()`.
    *   Il appelle la méthode `game.addPlayer()` sur l'instance existante pour y ajouter le nouveau venu.
4.  **Synchronisation (Serveur -> Tous les Clients)** : Le serveur diffuse un `gameStateUpdate` à **tous les joueurs** de la room pour les informer de l'arrivée du nouveau participant.

**Résultat :** La partie existante contient maintenant plusieurs joueurs, tous synchronisés.

### Phase 3 : La Vie (Déroulement)

C'est l'état stable de la partie, où le jeu se déroule activement. Il est rythmé par deux processus parallèles :

**A. La Pulsation du Serveur (La Boucle de Jeu)**

-   **Processus** : De manière continue et automatique, le `setInterval` sur le serveur se déclenche.
-   **Action** : À chaque déclenchement, il exécute `game.tick()` pour faire avancer la logique (ex: descente des pièces), puis diffuse le nouvel état à tous via `gameStateUpdate`.
-   **Rôle** : Garantit une progression constante et synchronisée du jeu, indépendamment des actions des joueurs.

**B. Les Actions du Joueur (Interaction)**

-   **Déclencheur (Client)** : Un joueur appuie sur une touche (ex: `ArrowLeft`).
-   **Émission (Client)** : Le composant `GameBoard` émet un événement `@playerAction` qui est capté par `App.vue`, qui appelle l'action `gameStore.sendPlayerAction('moveLeft')`. Le store envoie l'événement `playerAction` au serveur.
-   **Traitement (Serveur)** : Le serveur reçoit `playerAction`. Il trouve la bonne instance de `Game` et appelle `game.handlePlayerAction(playerId, 'moveLeft')`.
-   **Mise à jour** : La logique de jeu interne est mise à jour. Le résultat de cette action sera visible par tous les joueurs lors de la **prochaine pulsation** de la boucle de jeu qui enverra le `gameStateUpdate`.

**Résultat :** Le jeu progresse et réagit aux commandes des joueurs, en maintenant tous les clients synchronisés.

### Phase 4 : La Fin (Destruction)

La fin d'une partie est déclenchée par la **déconnexion du dernier joueur**.

1.  **Déclencheur (Client/Réseau)** : Un joueur ferme son onglet, ou sa connexion est perdue.
2.  **Détection (Serveur)** : Le serveur reçoit l'événement `disconnect` de `socket.io`.
3.  **Nettoyage Partiel (Serveur)** :
    *   Le serveur identifie la room du joueur déconnecté.
    *   Il appelle `game.removePlayer(playerId)` sur l'instance de jeu correspondante.
    *   La méthode `removePlayer` renvoie le nombre de joueurs restants.
4.  **Condition de Destruction (Serveur)** : Le serveur vérifie si le nombre de joueurs restants est `0`.
    *   **Si OUI** : La partie doit être détruite.
        *   Il appelle `clearInterval()` avec l'ID stocké dans `gameIntervals` pour **arrêter la boucle de jeu**. (Étape la plus critique pour éviter les fuites de mémoire).
        *   Il supprime l'instance de la partie de `activeGames` et l'intervalle de `gameIntervals`.
    *   **Si NON** : La partie continue de vivre. Le serveur diffuse simplement un `gameStateUpdate` pour informer les joueurs restants du départ.

**Résultat :** Les ressources de la partie (mémoire et cycles CPU de la boucle) sont complètement libérées dès qu'elle n'est plus utile.

---

## Diagramme de Séquence Simplifié

```mermaid
sequenceDiagram
    participant Joueur1
    participant Client1
    participant Serveur
    participant GameInstance

    Note over Joueur1, Serveur: Phase 1: Naissance
    Joueur1->>Client1: Navigue vers /#/partie1/j1
    Client1->>Serveur: connect()
    Serveur-->>Client1: connection établie
    Client1->>Serveur: emit('joinGame', {room: 'partie1', name: 'j1'})
    Serveur->>GameInstance: new Game(...)
    Serveur->>Serveur: setInterval(tick, 1000)
    Serveur-->>Client1: emit('gameStateUpdate')

    Note over Joueur1, Serveur: Phase 2: Croissance
    participant Joueur2
    participant Client2
    Joueur2->>Client2: Navigue vers /#/partie1/j2
    Client2->>Serveur: connect()
    Serveur-->>Client2: connection établie
    Client2->>Serveur: emit('joinGame', {room: 'partie1', name: 'j2'})
    Serveur->>GameInstance: addPlayer({id:..., name:'j2'})
    Serveur-->>Client1: emit('gameStateUpdate')
    Serveur-->>Client2: emit('gameStateUpdate')

    Note over Joueur1, Serveur: Phase 3: Vie
    loop Boucle de Jeu
        Serveur->>GameInstance: tick()
        GameInstance-->>Serveur: newState
        Serveur-->>Client1: emit('gameStateUpdate', newState)
        Serveur-->>Client2: emit('gameStateUpdate', newState)
    end
    Client1->>Serveur: emit('playerAction', 'moveLeft')
    Serveur->>GameInstance: handlePlayerAction('j1', 'moveLeft')

    Note over Joueur1, Serveur: Phase 4: Fin
    Joueur1->>Client1: Ferme l'onglet
    Client1->>Serveur: disconnect()
    Serveur->>GameInstance: removePlayer('j1')
    Joueur2->>Client2: Ferme l'onglet
    Client2->>Serveur: disconnect()
    Serveur->>GameInstance: removePlayer('j2')
    Note right of Serveur: Plus de joueurs !
    Serveur->>Serveur: clearInterval()
    Serveur->>Serveur: delete activeGames['partie1']```