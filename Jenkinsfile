// Local Jenkins mirror of .github/workflows/ci.yml (WEB-222).
// GitHub Actions stays the primary gate. Do not add checks here that CI
// does not run. SaaS keys stay unset so no-op paths are what get tested.

pipeline {
  agent any

  environment {
    CI = 'true'
    DATABASE_URL = 'postgresql://graphorg:graphorg@127.0.0.1:5433/graphorg'
    REDIS_URL = 'redis://127.0.0.1:6379'
    AUTH_SECRET = 'ci-web-auth-secret-at-least-32-chars'
    UV_PYTHON_INSTALL_DIR = '/opt/uv-python'
  }

  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
  }

  stages {
    stage('Web') {
      steps {
        sh '''
          npm ci
          npm run format:check
          npm run lint
          npm run typecheck
          npm run test --workspace=apps/web
          npm run build --workspace=apps/web
        '''
      }
    }

    stage('E2E') {
      environment {
        AUTH_SECRET = 'e2e-test-auth-secret-at-least-32-chars'
        AUTH_TRUST_HOST = 'true'
        AUTH_URL = 'http://127.0.0.1:3000'
      }
      steps {
        sh '''
          npm exec --workspace=apps/web -- playwright install chromium
          npm run build --workspace=apps/web
          npm run test:e2e --workspace=apps/web
        '''
      }
      post {
        always {
          archiveArtifacts artifacts: 'apps/web/playwright-report/**', allowEmptyArchive: true
        }
      }
    }

    stage('AI worker') {
      steps {
        sh '''
          cd services/ai-worker
          uv venv --python 3.12 .venv
          uv pip install --python .venv/bin/python -e ".[dev]"
          .venv/bin/pytest
        '''
      }
    }
  }
}
