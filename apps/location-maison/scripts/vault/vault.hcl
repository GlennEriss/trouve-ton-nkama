# Lancer vault: vault server -config=vault.hcl
# créer le core: vault operator init -key-shares=1 -key-threshold=1 > init.txt
# set le VAULT_TOKEN: export VAULT_TOKEN=
# Monter le secret: vault secrets enable -path=secret kv-v2

ui = true

listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = 1
}

storage "file" {
  path = "./vault-data"      # dossier où seront stockés les secrets
}

disable_mlock = true         # évite l’erreur mlock dans Docker ou macOS