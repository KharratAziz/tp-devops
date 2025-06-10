# Réponses au TP3 - Ansible et Déploiement Continu

Ce document répond aux questions posées dans l'énoncé du TP3, en se basant sur le projet final.

---

### Question 3-1 : Documentation de l'inventaire et des commandes de base

#### Inventaire Ansible

L'inventaire Ansible définit les serveurs sur lesquels nous allons opérer. Dans notre projet, il se trouve dans `ansible/inventories/setup.yml`.

Voici la structure de notre inventaire :

```yaml
# ansible/inventories/setup.yml
all:
  children:
    prod:
      hosts:
        aziz.kharrat.takima.cloud:
```
*   **`all`**: Un groupe qui englobe tous les autres.
*   **`children`**: Permet de définir des sous-groupes.
*   **`prod`**: Notre groupe de production, qui pourrait contenir plusieurs serveurs si nécessaire.
*   **`hosts`**: La liste des adresses IP ou des noms de domaine de nos serveurs. Ici, le serveur unique de production.

Les variables comme `ansible_user` et la clé SSH sont fournies dynamiquement par le workflow GitHub Actions lors de l'exécution, via l'option `--extra-vars`.

#### Commandes de Base


1.  **`ansible all -i inventories/setup.yml -m ping`**
    *   **Rôle :** C'est une commande de diagnostic fondamentale. Elle se connecte à tous (`all`) les serveurs définis dans l'inventaire (`-i ...`) et exécute le module (`-m`) `ping`.
    *   **Objectif :** Vérifier que la connexion SSH est fonctionnelle, que les clés sont correctes et qu'Ansible peut communiquer avec les serveurs cibles. Un retour "pong" signifie que tout est prêt pour le déploiement.

2.  **`ansible all -i inventories/setup.yml -m setup -a "filter=ansible_distribution*"`**
    *   **Rôle :** Exécute le module `setup`, qui collecte des informations détaillées sur le système distant. Ces informations sont appelées "facts".
    *   **Objectif :** Permet d'inspecter l'état du serveur. L'argument `-a "filter=..."` permet de n'afficher que les "facts" qui nous intéressent, ici la distribution du système d'exploitation (ex: "Debian", "Ubuntu"). C'est très utile pour écrire des playbooks qui s'adaptent à différents environnements.

3.  **`ansible all -i inventories/setup.yml -m apt -a "name=apache2 state=absent" --become`**
    *   **Rôle :** Exécute le module `apt` pour gérer les paquets sur les systèmes Debian/Ubuntu.
    *   **Objectif :** Assurer qu'un paquet (`name=apache2`) est dans un état précis (`state=absent`, c'est-à-dire désinstallé). L'option `--become` (équivalente à `sudo`) est nécessaire pour avoir les droits d'administrateur pour installer ou supprimer des logiciels. C'est un exemple parfait du **principe d'idempotence** d'Ansible : on décrit l'état final désiré, et Ansible se charge de l'atteindre.

Dans notre projet final, nous n'exécutons plus ces commandes manuellement. Elles sont encapsulées dans la commande `ansible-playbook` lancée par notre workflow GitHub Actions.

---

### Question 3-2 : Documentation du playbook

Notre playbook a évolué pour devenir plus modulaire et réutilisable grâce à l'utilisation de **rôles** et de **tags**. Voici le contenu final de notre fichier `ansible/playbook.yml` et sa documentation.

```yaml
# ansible/playbook.yml
- hosts: all
  name: Setup common infrastructure (Docker and Network)
  roles:
    - docker
    - network

- hosts: all
  name: Deploy Database Service
  tags: [database]
  roles:
    - database

- hosts: all
  name: Deploy Application Service
  tags: [app]
  roles:
    - app

- hosts: all
  name: Deploy Proxy Service
  tags: [proxy]
  roles:
    - proxy
```

**Structure et Fonctionnement :**

1.  **Séparation en "Plays" :** Le playbook est divisé en quatre "plays" (blocs qui commencent par `- hosts: all`).
    *   Le **premier play** est toujours exécuté. Il installe les dépendances communes et indispensables : Docker et le réseau partagé `my-network`.
    *   Les **trois plays suivants** sont dédiés au déploiement de chaque service individuel : `database`, `app`, et `proxy`.

2.  **Utilisation des Rôles :** Au lieu d'avoir une longue liste de tâches dans un seul fichier, la logique de chaque partie est encapsulée dans un rôle (ex: `roles/docker`, `roles/database`). Cela rend le projet beaucoup plus lisible et facile à maintenir. Le playbook principal se contente d'appeler ces rôles.

3.  **Utilisation des Tags :** C'est une fonctionnalité clé de notre refactorisation.
    *   Chaque play de déploiement de service possède un `tag` (ex: `tags: [app]`).
    *   Cela nous permet, depuis notre workflow GitHub Actions, d'exécuter uniquement une partie du playbook en utilisant l'option `--tags`.
    *   C'est ainsi que nous avons pu créer des jobs de déploiement séparés et visibles dans GitHub Actions pour chaque composant.

---

### Question 3-3 : Documentation des tâches `docker_container`

Le déploiement de nos services se fait via le module `docker_container`. Prenons l'exemple de notre conteneur `proxy`, qui est le plus critique pour l'utilisateur final car il sert le front-end.

Voici sa configuration dans `ansible/roles/proxy/tasks/main.yml` :

```yaml
# ansible/roles/proxy/tasks/main.yml
- name: Launch the proxy container
  docker_container:
    name: httpd
    image: kharrataziz/tp-devops-httpd
    pull: true
    recreate: true
    state: started
    restart_policy: always
    networks:
      - name: my-network
    ports:
      - "80:80"
  vars:
    ansible_python_interpreter: /opt/docker_venv/bin/python
```

**Détail des paramètres :**

*   `name: httpd`: Définit le nom du conteneur sur le serveur. C'est un nom simple et reconnaissable.
*   `image: kharrataziz/tp-devops-httpd`: C'est le cœur de notre CI/CD. Cette ligne indique à Ansible d'utiliser l'image que notre workflow de CI a construite et poussée sur Docker Hub.
*   `pull: true`: Ce paramètre crucial force Docker à toujours vérifier s'il existe une nouvelle version de l'image sur Docker Hub avant de lancer le conteneur.
*   `recreate: true`: C'est notre garantie de déploiement. Ce paramètre force la destruction du conteneur existant et sa recréation à partir de la nouvelle image à chaque fois. Cela assure que tous les changements (configuration, code) sont bien appliqués, résolvant les problèmes que nous avons rencontrés.
*   `state: started`: Assure que le conteneur est en état de marche après le déploiement.
*   `restart_policy: always`: Une police d'assurance. Si le serveur redémarre, Docker relancera automatiquement ce conteneur.
*   `networks: [my-network]`: Connecte ce conteneur au réseau partagé pour qu'il puisse communiquer avec le conteneur `simple-api`.
*   `ports: ["80:80"]`: Expose l'application au monde extérieur. Il mappe le port 80 du serveur (le port HTTP standard) au port 80 du conteneur Apache.

---

### Question 4 : Sécurité du déploiement automatique

#### Est-il vraiment sûr de déployer automatiquement chaque nouvelle image ?

Non, ce n'est **pas une pratique sûre** pour un environnement de production critique. La méthode que nous avons mise en place est du **Déploiement Continu (Continuous Deployment)** pur : chaque `push` sur la branche `main` finit directement en production.

**Les risques principaux :**
1.  **Régression :** Un commit qui introduit un bug (même mineur) sera immédiatement déployé, pouvant casser l'application pour tous les utilisateurs.
2.  **Absence de validation humaine :** Il n'y a aucune étape de validation manuelle pour vérifier que les nouvelles fonctionnalités se comportent comme prévu dans un environnement réel.
3.  **Failles de sécurité :** Une dépendance vulnérable ou une erreur de code pourrait être déployée instantanément.

#### Que peut-on faire pour rendre cela plus sûr ?

Pour sécuriser le processus, il faut passer du Déploiement Continu à la **Livraison Continue (Continuous Delivery)** et ajouter plusieurs couches de protection.

1.  **Protéger la Branche `main` :** C'est la première étape et la plus importante. Configurer des règles sur GitHub pour que personne ne puisse `push` directement sur `main`. Tout changement doit passer par une **Pull Request (PR)** qui requiert :
    *   L'approbation d'au moins un autre développeur (revue de code).
    *   La réussite de tous les tests automatisés (notre workflow CI).

2.  **Environnement de Staging (Pré-production) :**
    *   Créer un deuxième serveur, quasi-identique à la production, appelé "staging".
    *   Configurer le workflow pour que les `push` sur `main` déploient automatiquement sur cet environnement de **staging**.
    *   L'équipe (développeurs, testeurs, product owner) peut alors valider manuellement les changements sur le site de staging dans un environnement réel.

3.  **Déclenchement Manuel vers la Production :**
    *   Le déploiement en production ne doit plus être automatique. Il doit être déclenché par une action humaine une fois que la validation sur staging est terminée.
    *   Cela peut se faire via :
        *   Un `workflow_dispatch` (un bouton "Deploy to Production" sur GitHub Actions).
        *   La création d'un tag Git (ex: `v1.2.0`) qui déclenche le workflow de déploiement en production.

4.  **Améliorer les Tests Automatisés :**
    *   **Tests End-to-End (E2E) :** Ajouter des tests (avec des outils comme Cypress ou Playwright) qui simulent la navigation d'un utilisateur sur le front-end déployé en staging. Le déploiement en production ne serait autorisé que si ces tests réussissent.
    *   **Scan de Vulnérabilités :** Intégrer des outils comme `Trivy` ou `Snyk` dans la CI pour scanner nos images Docker et nos dépendances à la recherche de failles de sécurité connues. 