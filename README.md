# Projet de CI/CD et Déploiement Continu avec Docker, Ansible et GitHub Actions

Ce projet met en œuvre une chaîne d'intégration et de déploiement continus (CI/CD) complète pour une application web full-stack. L'objectif était de partir de plusieurs services indépendants (backend, base de données, proxy) et d'automatiser entièrement leur test, leur "packaging" sous forme d'images Docker, et leur déploiement sur un serveur de production.

Ce `README` documente l'architecture finale du projet, les efforts d'automatisation et la logique de la chaîne de CI/CD mise en place.

## ✨ Technologies Utilisées

- **Conteneurisation :** Docker & Docker Compose
- **Backend :** API Java Spring Boot
- **Frontend :** Application monopage (HTML, CSS, JavaScript)
- **Proxy Inverse :** Apache HTTPD
- **Base de Données :** PostgreSQL
- **Gestion de Configuration & Déploiement :** Ansible
- **Intégration et Déploiement Continus :** GitHub Actions

## 🏗️ Architecture de l'Application

L'application est décomposée en quatre services conteneurisés distincts qui communiquent via un réseau Docker privé :

1.  **`proxy` (Apache HTTPD) :** C'est le point d'entrée de l'application. Il a deux rôles :
    *   Servir les fichiers statiques du **front-end** à l'utilisateur.
    *   Agir comme un **proxy inverse** : toutes les requêtes commençant par `/api/` sont redirigées vers le service backend.

2.  **`app` (Spring Boot) :** Le service backend qui expose une API REST pour gérer les données (par exemple, la liste des étudiants). Il communique avec la base de données pour la persistance.

3.  **`database` (PostgreSQL) :** La base de données relationnelle qui stocke les informations de l'application. Ses données sont persistées sur le serveur hôte grâce à un volume Docker.

4.  **`network` :** Un réseau Docker dédié (`my-network`) qui isole les conteneurs et leur permet de communiquer entre eux en utilisant leurs noms de service comme noms d'hôte (ex: `http://simple-api:8080`).

## 🚀 La Chaîne CI/CD

Le cœur de ce projet est l'automatisation. Deux workflows GitHub Actions travaillent de concert pour assurer un déploiement fluide et fiable.

### 1. Workflow de CI : `main.yml` (`CI devops 2025`)

Ce workflow se déclenche à chaque `push` sur les branches `main` ou `develop`. Son rôle est la **construction et l'intégration**.
- **Test :** Il compile le backend Java et exécute les tests d'intégration avec Maven.
- **Build :** Si les tests réussissent, il construit les trois images Docker (backend, database, et l'image combinée httpd/frontend).
- **Publish :** Il publie ces images sur Docker Hub, les taguant avec `:latest`.

### 2. Workflow de CD : `deploy.yml` (`Deploy to Server with Ansible`)

Ce workflow se déclenche à chaque `push` sur `main`. Son rôle est le **déploiement**. Pour plus de clarté et de contrôle, il a été refactorisé en plusieurs jobs :
- **Job `setup` :** Prépare l'environnement d'exécution en installant Ansible.
- **Job `deploy-services` (matrice) :** Ce job utilise une **matrice de déploiement** pour créer trois jobs visibles et parallèles, un pour chaque service (`database`, `app`, `proxy`). Cela permet de voir distinctement le déploiement de chaque composant.
- **Déploiement avec Ansible :** Chaque job de déploiement se connecte au serveur et exécute la partie pertinente du playbook Ansible en utilisant des `tags`. Ansible s'assure alors que la dernière version de chaque image est téléchargée (`pull: true`) et que chaque conteneur est détruit et recréé (`recreate: true`) pour garantir que tous les changements sont appliqués.

## 🛠️ Efforts de Conception et de Refactoring

- **Idempotence :** Le déploiement avec Ansible est idempotent. Le relancer plusieurs fois garantit le même état final sans créer d'erreur.
- **Séparation des préoccupations :** L'utilisation de rôles Ansible (`docker`, `network`, `database`, `app`, `proxy`) rend le projet clair et maintenable.
- **Déploiement par composant :** La refactorisation du playbook Ansible et du workflow de déploiement avec des `tags` et une matrice permet un contrôle fin et une excellente visibilité sur le processus de déploiement.
- **Sécurité :** Les informations sensibles (identifiants Docker Hub, clé SSH) sont gérées de manière sécurisée via les secrets GitHub Actions. 