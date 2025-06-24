# récupère les IDs
vault read -field=role_id auth/approle/role/logisgabon_dev/role-id
vault write -field=secret_id -f auth/approle/role/logisgabon_dev/secret-id

vault read -field=role_id auth/approle/role/logisgabon_prod/role-id
vault write -field=secret_id -f auth/approle/role/logisgabon_prod/secret-id