MON BUDGET CLOUD - INSTALLATION

1. Créez un projet gratuit sur supabase.com.
2. Dans SQL Editor, exécutez tout le contenu de schema.sql.
3. Dans Project Settings > API, copiez Project URL et la clé publique anon/publishable.
4. Ouvrez config.js et remplacez les deux valeurs. Ne mettez jamais une clé service_role dans le navigateur.
5. Dans Authentication > Providers > Email, activez Email. Pour un usage simple, vous pouvez désactiver Confirm email, ou conserver la confirmation.
6. Publiez le dossier sur un hébergement HTTPS statique, par exemple GitHub Pages ou Cloudflare Pages.
7. Dans Authentication > URL Configuration, ajoutez l'URL publique du site.
8. Ouvrez l'URL sur PC et téléphone, créez le même compte et connectez-vous.

SECURITE
- Le fichier schema.sql active la sécurité RLS.
- Chaque utilisateur ne peut lire, ajouter, modifier ou supprimer que ses propres lignes.
- La clé publique anon est prévue pour le navigateur lorsque RLS est correctement configurée.
- Ne publiez jamais la clé service_role.

UTILISATION
- Les opérations et budgets sont enregistrés dans PostgreSQL via Supabase.
- Un cache local sert uniquement à la résilience d'affichage.
- Export JSON permet une sauvegarde manuelle complémentaire.
