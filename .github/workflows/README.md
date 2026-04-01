# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD.

## Workflows

### PR Security Scan (`pr-security-scan.yml`)

Runs on every pull request targeting `main`. This workflow is the **vulnerability gate**: it fails if `npm audit` reports **High** or **Critical** issues. It also runs **Semgrep** (SAST) and **OWASP ZAP Baseline** (DAST) against the app started with Docker Compose.

**Jobs:**

1. **Vulnerability audit** — `npm ci` then `npm audit --audit-level=high` (fails on High or Critical).
2. **Semgrep** — `semgrep scan --config auto` via Docker; exit code 1 (findings) does not fail the job, other exit codes fail.
3. **OWASP ZAP Baseline** — brings up MongoDB + app with Compose, runs `zap-baseline.py` against `http://host.docker.internal:3000` with `-I` (fail on new high-risk items, not on all warnings).
4. **Security scan summary** — aggregates status; fails the workflow if any required job failed.

### PR Build and Test (`pr-build.yml`)

Runs on all pull requests targeting the `main` branch.

**Triggers:**
- Pull request opened
- Pull request synchronized (new commits pushed)
- Pull request reopened
- Pull request marked as ready for review

**Jobs:**

1. **Dependencies**
   - Installs dependencies with `npm ci`
   - Lists outdated packages (`npm outdated`, informational)

2. **Build and Test**
   - Installs dependencies
   - Verifies package.json and server.js syntax
   - Checks that all required static files exist
   - Runs tests (if configured)

3. **Docker Build**
   - Builds the Docker image using the Dockerfile
   - Tests the built image by running Compose (MongoDB + app) and checking `/ready`
   - Uses Docker Buildx for multi-platform support
   - Caches layers for faster builds

4. **Validate Kubernetes Manifests**
   - Validates all Kubernetes YAML files using `kubectl --dry-run`
   - Includes `mongodb-secret.yaml`, `mongodb.yaml`, and the app deployment (MongoDB credentials via Secret)
   - Only runs on PRs from the same repository (not forks)

5. **Build Summary**
   - Aggregates results from all jobs
   - Provides a summary in the GitHub Actions UI
   - Fails if any critical job fails

## Requirements

- Node.js 18+
- Docker (for Docker build job)
- kubectl (for K8s validation job)

## Status Badge

Add this to your README.md to show build status:

![PR Build](https://github.com/BuildAndDestroy/reapers-smokehouse/workflows/PR%20Build%20and%20Test/badge.svg)

## Customization

### Adding Tests

If you add tests, update the `build-and-test` job:

```yaml
- name: Run tests
  run: npm test
```

### Adding Linting

To add ESLint or other linting:

```yaml
- name: Run linter
  run: npm run lint
```

### Modifying Security Audit Level

Edit **`pr-security-scan.yml`** (not `pr-build.yml`):

```yaml
run: npm audit --audit-level=high  # high | critical — high fails on High and Critical
```

## Troubleshooting

### Build Fails on Security Audit

If legitimate vulnerabilities are found:
1. Review the vulnerabilities: `npm audit`
2. Update dependencies: `npm update`
3. If updates don't fix it, consider using `npm audit fix`
4. For false positives, you can use `npm audit --audit-level=high` to only fail on high/critical

### Docker Build Fails

- Check that Dockerfile is valid
- Ensure all required files are present
- Check Docker build logs for specific errors

### K8s Validation Fails

- Ensure kubectl is available
- Check that all YAML files are valid Kubernetes manifests
- Verify API versions are correct

