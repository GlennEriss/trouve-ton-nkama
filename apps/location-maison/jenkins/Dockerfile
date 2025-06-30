FROM jenkins/jenkins:2.504.2-jdk21

USER root

# Install Docker CLI inside the Jenkins controller
RUN apt-get update && apt-get install -y --no-install-recommends \
      lsb-release ca-certificates curl && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL --proto '=https' --tlsv1.2 https://download.docker.com/linux/debian/gpg \
      -o /etc/apt/keyrings/docker.asc && \
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

# Exposer les ports Jenkins
EXPOSE 8090 