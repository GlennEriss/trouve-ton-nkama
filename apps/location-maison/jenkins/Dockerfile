FROM jenkins/jenkins:2.504.2-jdk21

USER root

# Install Docker CLI inside the Jenkins controller
RUN apt-get update && apt-get install -y --no-install-recommends \
      lsb-release ca-certificates curl gnupg && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg \
      -o /etc/apt/keyrings/docker.asc && \
    # Verify Docker GPG key fingerprint for security
    gpg --dry-run --quiet --import --import-options import-show /etc/apt/keyrings/docker.asc | \
      grep -q "9DC858229FC7DD38854AE2D88D81803C0EBFCD88" || \
      (echo "Docker GPG key verification failed" && exit 1) && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
      https://download.docker.com/linux/debian $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" \
      > /etc/apt/sources.list.d/docker.list && \
    apt-get update && apt-get install -y --no-install-recommends docker-ce-cli && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Switch back to the Jenkins user and install plugins
USER jenkins
RUN jenkins-plugin-cli --plugins \
      "blueocean docker-workflow json-path-api" 