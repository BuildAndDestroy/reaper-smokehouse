# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD.

## Workflows

### PR Build and Test (`pr-build.yml`)

Runs on all pull requests targeting the `main` branch.

**Triggers:**
- Pull request opened
- Pull request synchronized (new commits pushed)
- Pull request reopened
- Pull request marked as ready for review

**Jobs:**

1. **Lint and Audit**
   - Runs `npm audit` to check for security vulnerabilities
   - Checks for outdated dependencies
   - Fails if moderate or higher severity vulnerabilities are found

2. **Build and Test**
   - Installs dependencies
   - Verifies package.json and server.js syntax
   - Checks that all required static files exist
   - Runs tests (if configured)

3. **Docker Build**
   - Builds the Docker image using the Dockerfile
   - Tests the built image by running it and checking the health endpoint
   - Uses Docker Buildx for multi-platform support
   - Caches layers for faster builds

4. **Security Scan**
   - Runs comprehensive security audit
   - Reports vulnerabilities in a structured format
   - Continues on error to provide full report

5. **Validate Kubernetes Manifests**
   - Validates all Kubernetes YAML files using `kubectl --dry-run`
   - Ensures manifests are syntactically correct
   - Only runs on PRs from the same repository (not forks)

6. **Build Summary**
   - Aggregates results from all jobs
   - Provides a summary in the GitHub Actions UI
   - Fails if any critical job fails

## Requirements

- Node.js 18+
- Docker (for Docker build job)
- kubectl (for K8s validation job)

## Status Badge

Add this to your README.md to show build status:

```markdown
![PR Build](https://github.com/YOUR_USERNAME/reapers-smokehouse/workflows/PR%20Build%20and%20Test/badge.svg)
```

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

Change the audit level in the workflow:

```yaml
run: npm audit --audit-level=high  # or low, moderate, high, critical
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

