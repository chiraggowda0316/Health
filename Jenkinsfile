pipeline {
    agent any

    environment {
        // ASSIGNMENT CONFIGURATION - Match these to your actual secure private endpoints
        DOCKER_REGISTRY   = "://domain.com"
        DOCKER_IMAGE_NAME = "task-tracker"
        REGISTRY_CREDS    = "private-registry-credentials-id"
        
        // Build tracking and rollback parameters
        BUILD_TAG         = "build-${BUILD_NUMBER}"
        PREVIOUS_TAG      = "build-${BUILD_NUMBER.toInteger() - 1}"
    }

    stages {
        stage('SCM Pull') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies & Test') {
            steps {
                echo 'Executing application validation suites inside an isolated Node.js container...'
                // Explicitly uses npm install to support workspaces without an existing package-lock file
                sh "docker run --rm -v \$(pwd):/app -w /app node:20-alpine sh -c 'npm install && npm test'"
            }
        }

        stage('Build Image') {
            steps {
                echo "Compiling optimized multi-stage image tagged: ${BUILD_TAG}"
                sh "docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${BUILD_TAG} ."
                
                echo "Publishing container image to private registry destination..."
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDS}", usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                    sh "docker login -u ${REG_USER} -p ${REG_PASS} ${DOCKER_REGISTRY}"
                    sh "docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${BUILD_TAG}"
                }
            }
        }

        stage('Deploy') {
            steps {
                echo 'Orchestrating container deployment strategy via Docker Compose...'
                // Cleans up legacy builds and dangling application instances safely
                sh "docker-compose down --remove-orphans || docker compose down --remove-orphans || true"
                sh "export DOCKER_REGISTRY=${DOCKER_REGISTRY} DOCKER_IMAGE_NAME=${DOCKER_IMAGE_NAME} BUILD_TAG=${BUILD_TAG} && (docker-compose up -d || docker compose up -d)"
            }
        }

        stage('Curl Verification') {
            steps {
                echo 'Evaluating service status metrics via a dynamic readiness verification loop...'
                script {
                    def maxAttempts = 10
                    def attempt = 0
                    def isReady = false
                    
                    while (attempt < maxAttempts && !isReady) {
                        attempt++
                        echo "Readiness loop evaluation check #${attempt}/${maxAttempts}..."
                        try {
                            def response = sh(script: "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health", returnStdout: true).trim()
                            if (response == "200") {
                                isReady = true
                            }
                        } catch (Exception e) {
                            echo "Application server process starting up, waiting..."
                        }
                        if (!isReady) { sh "sleep 3" }
                    }
                    
                    if (!isReady) {
                        error "Application health verification phase failed (Connection Timeout)."
                    }
                }
                
                echo 'Printing assignment expected multi-endpoint verification outputs:'
                sh 'curl -s http://localhost:3000/'
                sh 'curl -s http://localhost:3000/health'
                sh 'curl -s http://localhost:3000/api/tasks'
            }
        }
    }

    post {
        always {
            echo 'Pruning legacy dangling images and freeing workspace environment resource chunks...'
            sh 'docker image prune -f || true'
            cleanWs()
        }
        success {
            echo 'Pipeline successfully passed and deployed!'
            // Optional: slackSend(color: '#00FF00', message: "SUCCESSFUL: Build #${env.BUILD_NUMBER} is live.")
        }
        failure {
            echo "Deployment anomalies detected. Initializing rollback state sequence to: ${PREVIOUS_TAG}"
            script {
                try {
                    sh "export DOCKER_REGISTRY=${DOCKER_REGISTRY} DOCKER_IMAGE_NAME=${DOCKER_IMAGE_NAME} BUILD_TAG=${PREVIOUS_TAG} && (docker-compose up -d || docker compose up -d)"
                    echo "Rollback sequence completed successfully."
                } catch (Exception e) {
                    echo "Rollback strategy terminated: No previous valid working tags identified."
                }
            }
        }
    }
}
