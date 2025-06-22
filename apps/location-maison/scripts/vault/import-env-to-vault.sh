#!/usr/bin/env bash
# import-env-to-vault.sh  envfile path_in_vault
set -e

ENV_FILE="$1"         # .env.local.prod
VAULT_PATH="$2"       # secret/logisgabon/prod

# Convert .env (KEY=VAL) -> JSON {"KEY":"VAL",...}
json=$(grep -v '^\s*#' "$ENV_FILE" | # supprime les commentaires
       grep -v '^\s*$'        |      # supprime les lignes vides
       awk -F '=' '{k=$1; $1=""; v=substr($0,2); gsub(/"/,"\\\"",v); printf "\"%s\":\"%s\",",k,v}' |
       sed 's/,$//' )          # enlève la virgule finale

json="{${json}}"

# Envoi vers Vault KV v2
vault kv put "$VAULT_PATH" @<(echo "$json")
echo "✅  Importé $ENV_FILE → $VAULT_PATH"