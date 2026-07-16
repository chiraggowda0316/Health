pipeline {
    agent any

    environment {
        // Task requirements
        DOCKER_REGISTRY   = "://domain.com"
        DOCKER_IMAGE_NAME = "task-tracker"
        REGISTRY_CREDS    = "private-registry-credentials-id"
        
        // Build tracking
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
                echo 'Running tests inside an isolated Node.js Docker container...'
                // Mounts the directory to run npm install and test inside a clean container
                sh "docker run --rm -v \$(pwd):/app -w /app node:20-alpine sh -c 'npm ci && npm test'"
            }
        }

        stage('Build Image') {
            steps {
                echo "Building secure image tagged: ${BUILD_TAG}"
                sh "docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${BUILD_TAG} ."
                
                echo "Publishing build to private registry..."
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDS}", usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                    sh "docker login -u ${REG_USER} -p ${REG_PASS} ${DOCKER_REGISTRY}"
                    sh "docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${BUILD_TAG}"
                }
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying application via Docker Compose...'
                // Handles backward compatibility for legacy docker-compose binaries if needed
                sh "docker-compose down --remove-orphans || docker compose down --remove-orphans || true"
                sh "export DOCKER_REGISTRY=${DOCKER_REGISTRY} DOCKER_IMAGE_NAME=${DOCKER_IMAGE_NAME} BUILD_TAG=${BUILD_TAG} && (docker-compose up -d || docker compose up -d)"
            }
        }

        stage('Curl Verification') {
            steps {
                echo 'Executing loop verification targeting application health endpoint...'
                script {
                    def maxAttempts = 10
                    def attempt = 0
                    def isReady = false
                    
                    while (attempt < maxAttempts && !isReady) {
                        attempt++
                        echo "Readiness check attempt ${attempt}/${maxAttempts}..."
                        try {
                            def response = sh(script: "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health", returnStdout: true).trim()
                            if (response == "200") {
                                isReady = true
                            }
                        } catch (Exception e) {
                            echo "Waiting for app to start..."
                        }
                        if (!isReady) { sh "sleep 3" }
                    }
                    
                    if (!isReady) {
                        error "Application health verification check timed out."
                    }
                }
                
                echo 'Printing assignment expected verification payloads:'
                sh 'curl -s http://localhost:3000/'
                sh 'curl -s http://localhost:3000/health'
                sh 'curl -s http://localhost:3000/api/tasks'
            }
        }
    }

    post {
        always {
            echo 'Pruning legacy dangling images and resource allocations...'
            sh 'docker image prune -f || true'
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully! Sending notifications...'
            // Optional: slackSend(color: '#00FF00', message: "SUCCESSFUL: ${env.JOB_NAME} [Build #${env.BUILD_NUMBER}]")
        }
        failure {
            echo "Deployment failed! Reverting back to previous working tag: ${PREVIOUS_TAG}"
            script {
                try {
                    sh "export DOCKER_REGISTRY=${DOCKER_REGISTRY} DOCKER_IMAGE_NAME=${DOCKER_IMAGE_NAME} BUILD_TAG=${PREVIOUS_TAG} && (docker-compose up -d || docker compose up -d)"
                    echo "Rollback completed successfully."
                } catch (Exception e) {
                    echo "Rollback failed. Please check host deployment manually."
                }
            }
        }
    }
}
