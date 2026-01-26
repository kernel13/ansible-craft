# CI/CD Integration

Examples of integrating ansible-craft into CI/CD pipelines.

## Overview

ansible-craft supports automation through:
- `--json` flag for machine-readable output
- `--no-interactive` flag to skip prompts
- `--quiet` flag for cleaner logs
- Exit codes for status detection

## GitHub Actions

### Generate Role on Push

```yaml
# .github/workflows/generate-role.yml
name: Generate Ansible Role

on:
  workflow_dispatch:
    inputs:
      description:
        description: 'Role description'
        required: true
        type: string
      name:
        description: 'Role name'
        required: false
        type: string

jobs:
  generate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install ansible-craft
        run: npm install -g ansible-craft

      - name: Generate Role
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          ansible-craft new role "${{ inputs.description }}" \
            ${{ inputs.name && format('-n {0}', inputs.name) || '' }} \
            --no-interactive \
            --fix \
            --json > result.json

      - name: Process Result
        run: |
          if jq -e '.success' result.json > /dev/null; then
            echo "Role generated successfully"
            echo "Files created:"
            jq -r '.files[].path' result.json
          else
            echo "Generation failed:"
            jq -r '.error.message' result.json
            exit 1
          fi

      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: generated-role
          path: |
            ${{ inputs.name || '**' }}/
            result.json
```

### Validate Generated Roles

```yaml
# .github/workflows/validate-roles.yml
name: Validate Roles

on:
  pull_request:
    paths:
      - 'roles/**'

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install ansible-lint
        run: pip install ansible-lint

      - name: Lint Roles
        run: |
          for role in roles/*/; do
            echo "Linting $role"
            ansible-lint "$role"
          done

  molecule:
    runs-on: ubuntu-latest
    needs: lint

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Dependencies
        run: |
          pip install molecule molecule-docker ansible

      - name: Run Molecule Tests
        run: |
          for role in roles/*/; do
            if [ -d "$role/molecule" ]; then
              echo "Testing $role"
              cd "$role"
              molecule test
              cd -
            fi
          done
```

### Generate and Create PR

```yaml
# .github/workflows/generate-and-pr.yml
name: Generate Role and Create PR

on:
  issues:
    types: [labeled]

jobs:
  generate:
    if: github.event.label.name == 'generate-role'
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Parse Issue
        id: parse
        run: |
          # Extract description from issue body
          DESCRIPTION=$(echo "${{ github.event.issue.body }}" | head -n 1)
          echo "description=$DESCRIPTION" >> $GITHUB_OUTPUT

      - name: Install ansible-craft
        run: npm install -g ansible-craft

      - name: Generate Role
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          ansible-craft new role "${{ steps.parse.outputs.description }}" \
            -o roles/ \
            --no-interactive \
            --fix

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          title: "feat: Add generated role from #${{ github.event.issue.number }}"
          body: |
            Generated from issue #${{ github.event.issue.number }}

            Description: ${{ steps.parse.outputs.description }}
          branch: generate-role-${{ github.event.issue.number }}
          commit-message: "feat: add generated role"
```

## GitLab CI

### Basic Generation Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - generate
  - validate
  - deploy

variables:
  ROLE_OUTPUT_DIR: roles

generate-role:
  stage: generate
  image: node:20
  before_script:
    - npm install -g ansible-craft
  script:
    - |
      ansible-craft new role "$ROLE_DESCRIPTION" \
        -n "$ROLE_NAME" \
        -o "$ROLE_OUTPUT_DIR" \
        --no-interactive \
        --fix \
        --json > result.json
  artifacts:
    paths:
      - $ROLE_OUTPUT_DIR/
      - result.json
    expire_in: 1 week
  rules:
    - if: $ROLE_DESCRIPTION

validate-role:
  stage: validate
  image: python:3.11
  before_script:
    - pip install ansible-lint
  script:
    - ansible-lint "$ROLE_OUTPUT_DIR/$ROLE_NAME"
  needs:
    - generate-role
  rules:
    - if: $ROLE_DESCRIPTION

molecule-test:
  stage: validate
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - apk add --no-cache python3 py3-pip
    - pip install molecule molecule-docker ansible
  script:
    - cd "$ROLE_OUTPUT_DIR/$ROLE_NAME"
    - molecule test
  needs:
    - generate-role
  rules:
    - if: $ROLE_DESCRIPTION && $RUN_MOLECULE == "true"
```

### Multi-Role Generation

```yaml
# .gitlab-ci.yml
generate-roles:
  stage: generate
  image: node:20
  parallel:
    matrix:
      - ROLE:
          - name: nginx
            description: "nginx reverse proxy with SSL"
          - name: postgresql
            description: "postgresql database with replication"
          - name: redis
            description: "redis cache cluster"
  before_script:
    - npm install -g ansible-craft
  script:
    - |
      ansible-craft new role "$ROLE[description]" \
        -n "$ROLE[name]" \
        -o roles/ \
        --no-interactive \
        --fix
  artifacts:
    paths:
      - roles/
```

## Jenkins

### Jenkinsfile

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        ANTHROPIC_API_KEY = credentials('anthropic-api-key')
    }

    parameters {
        string(name: 'ROLE_DESCRIPTION', description: 'Role description')
        string(name: 'ROLE_NAME', description: 'Role name (optional)')
    }

    stages {
        stage('Setup') {
            steps {
                sh 'npm install -g ansible-craft'
            }
        }

        stage('Generate') {
            steps {
                script {
                    def nameArg = params.ROLE_NAME ? "-n ${params.ROLE_NAME}" : ""

                    sh """
                        ansible-craft new role "${params.ROLE_DESCRIPTION}" \
                            ${nameArg} \
                            -o roles/ \
                            --no-interactive \
                            --fix \
                            --json > result.json
                    """
                }
            }
        }

        stage('Validate') {
            steps {
                sh 'pip install ansible-lint'
                sh 'ansible-lint roles/*/'
            }
        }

        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'roles/**/*', fingerprint: true
                archiveArtifacts artifacts: 'result.json'
            }
        }
    }

    post {
        success {
            script {
                def result = readJSON file: 'result.json'
                echo "Generated role: ${result.name}"
                echo "Files: ${result.files.size()}"
            }
        }
        failure {
            script {
                if (fileExists('result.json')) {
                    def result = readJSON file: 'result.json'
                    echo "Error: ${result.error?.message}"
                }
            }
        }
    }
}
```

## Azure DevOps

### Azure Pipeline

```yaml
# azure-pipelines.yml
trigger: none

parameters:
  - name: roleDescription
    displayName: 'Role Description'
    type: string
  - name: roleName
    displayName: 'Role Name'
    type: string
    default: ''

variables:
  - group: ansible-craft-secrets  # Contains ANTHROPIC_API_KEY

stages:
  - stage: Generate
    jobs:
      - job: GenerateRole
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: npm install -g ansible-craft
            displayName: 'Install ansible-craft'

          - script: |
              NAME_ARG=""
              if [ -n "${{ parameters.roleName }}" ]; then
                NAME_ARG="-n ${{ parameters.roleName }}"
              fi

              ansible-craft new role "${{ parameters.roleDescription }}" \
                $NAME_ARG \
                -o $(Build.ArtifactStagingDirectory)/roles \
                --no-interactive \
                --fix \
                --json > $(Build.ArtifactStagingDirectory)/result.json
            displayName: 'Generate Role'
            env:
              ANTHROPIC_API_KEY: $(ANTHROPIC_API_KEY)

          - publish: $(Build.ArtifactStagingDirectory)
            artifact: GeneratedRole
```

## Shell Scripts

### Batch Generation Script

```bash
#!/bin/bash
# generate-roles.sh

set -e

# Check API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Error: ANTHROPIC_API_KEY not set"
    exit 1
fi

# Role definitions
declare -A ROLES=(
    ["nginx"]="nginx reverse proxy with SSL and rate limiting"
    ["postgresql"]="postgresql 15 with streaming replication"
    ["redis"]="redis cache cluster with sentinel"
)

OUTPUT_DIR="${1:-./roles}"
mkdir -p "$OUTPUT_DIR"

# Generate each role
for name in "${!ROLES[@]}"; do
    description="${ROLES[$name]}"
    echo "Generating: $name"

    ansible-craft new role "$description" \
        -n "$name" \
        -o "$OUTPUT_DIR" \
        --no-interactive \
        --fix \
        --json > "$OUTPUT_DIR/$name.result.json"

    if jq -e '.success' "$OUTPUT_DIR/$name.result.json" > /dev/null; then
        echo "✓ $name generated successfully"
    else
        echo "✗ $name failed:"
        jq -r '.error.message' "$OUTPUT_DIR/$name.result.json"
    fi
done

echo "Generation complete. Roles in: $OUTPUT_DIR"
```

### Retry Wrapper

```bash
#!/bin/bash
# generate-with-retry.sh

MAX_RETRIES=3
RETRY_DELAY=10

retry_generate() {
    local description="$1"
    local name="$2"
    local attempt=1

    while [ $attempt -le $MAX_RETRIES ]; do
        echo "Attempt $attempt of $MAX_RETRIES"

        if ansible-craft new role "$description" -n "$name" --no-interactive --fix; then
            return 0
        fi

        if [ $attempt -lt $MAX_RETRIES ]; then
            echo "Retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi

        ((attempt++))
    done

    return 1
}

retry_generate "$@"
```

## Best Practices

### Always Use Non-Interactive Mode

```bash
# In CI/CD, always add these flags:
--no-interactive  # Skip prompts
--fix             # Auto-fix lint issues
--quiet           # Cleaner logs (optional)
--json            # Machine-readable output
```

### Handle Exit Codes

```bash
ansible-craft new role "nginx" --no-interactive
case $? in
    0) echo "Success" ;;
    1) echo "Error occurred" ;;
    2) echo "Cancelled" ;;
esac
```

### Use JSON for Parsing

```bash
# Parse JSON output
result=$(ansible-craft new role "nginx" --json)
success=$(echo "$result" | jq -r '.success')
name=$(echo "$result" | jq -r '.name')
```

### Store API Key Securely

- Use CI/CD secret storage
- Never hardcode in pipelines
- Rotate keys regularly

## Related

- **[CLI API Reference](../../api-reference/cli-api.md)** - Full CLI reference
- **[Exit Codes](../../api-reference/exit-codes.md)** - Exit code meanings
- **[JSON Schemas](../../api-reference/json-schemas.md)** - Output format
