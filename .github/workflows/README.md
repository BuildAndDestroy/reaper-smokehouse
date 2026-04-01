# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD.

## Workflows

### PR Security Scan (`pr-security-scan.yml`)

Runs on every PR targeting `main`: **npm audit** (High/Critical gate), **Semgrep** (SAST), and **OWASP ZAP Baseline** (DAST). ZAP uses a **tmpfs** mount on `/zap/wrk` so the ZAP container can write its automation plan on GitHub-hosted runners.

**Jobs:** vulnerability audit, Semgrep, OWASP ZAP Baseline, summary.

### OWASP ZAP Baseline — DAST (`dast-zap-baseline.yml`)

Runs on **push to `main`** and **`workflow_dispatch`** (run manually from the Actions tab). Starts Docker Compose (MongoDB + app), then runs `zap-baseline.py` against `http://host.docker.internal:3000` with `-I`.

Uses **`--tmpfs /zap/wrk`** with `mode=1777` so the ZAP image’s non-root user can write `zap.yaml` (named volumes are often root-owned and caused permission errors on GitHub-hosted runners).

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
   - Uses [kubeconform](https://github.com/yannh/kubeconform) against the Kubernetes OpenAPI schemas (no cluster or kubeconfig required)
   - Only runs on PRs from the same repository (not forks)

5. **Build Summary**
   - Aggregates results from all jobs
   - Fails if Dependencies, Build and Test, Docker Build, or K8s Validation failed (skipped K8s job on forks does not fail the summary)

## Requirements

- Node.js 18+
- Docker (for Docker build job)

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

