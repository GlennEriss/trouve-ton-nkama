# Role DEV
vault write auth/approle/role/logisgabon_dev \
      token_policies="logisgabon-dev" \
      token_ttl=24h token_max_ttl=72h

# Role PROD
vault write auth/approle/role/logisgabon_prod \
      token_policies="logisgabon-prod" \
      token_ttl=24h token_max_ttl=72h