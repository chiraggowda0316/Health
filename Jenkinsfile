pipeline {
    agent any

    tools {
        // Requires NodeJs Plugin configuration matching named target
        nodejs 'node'
    }

    environment {
        // Configure these to match your actual secure private endpoints
        DOCKER_REGISTRY   = "://domain.com"
        DOCKER_IMAGE_NAME = "task-tracker"
        REGISTRY_CREDS    = "private-registry-credentials-id"
        
        // Setup build tracking identifiers
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
                echo 'Running package installations and verification scripts...'
                sh 'npm install'
                sh 'npm test'
            }
        }

        stage('Build & Push Image') {
            steps {
                echo "Compiling secure image tagged: ${BUILD_TAG}"
                sh "docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${BUILD_TAG} ."
                
                echo "Publishing build to private registry..."
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDS}", usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                    sh "docker login -u ${REG_USER} -p ${REG_PASS} ${DOCKER_REGISTRY}"
                    sh "docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${BUILD_TAG}"
                }
            }
        }

        stage('Deploy Infrastructure') {
            steps {
                echo 'Deploying application via Docker Compose...'
                sh "docker-compose down --remove-orphans || true"
                sh "docker-compose up -d"
            }
        }

        stage('Readiness & Verification') {
            steps {
                echo 'Executing loop verification targeting application endpoints...'
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
                                echo "Application health endpoint is responsive!"
                            }
                        } catch (Exception e) {
                            echo "Waiting for service connectivity..."
                        }
                        if (!isReady) { sh "sleep 3" }
                    }
                    
                    if (!isReady) {
                        error "Application health verification check failed timed out."
                    }
                }
                
                echo 'Printing system endpoint verification payloads:'
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
            slackSend(color: '#00FF00', message: "SUCCESSFUL: Job '${env.JOB_NAME}' [Build #${env.BUILD_NUMBER}] completed successfully.")
        }
        failure {
            slackSend(color: '#FF0000', message: "FAILED: Job '${env.JOB_NAME}' [Build #${env.BUILD_NUMBER}] broken. Initializing automatic rollback actions...")
            echo "Executing rollback strategies deploying target: ${PREVIOUS_TAG}"
            script {
                try {
                    sh "export BUILD_TAG=${PREVIOUS_TAG} && docker-compose up -d"
                    echo "Rollback sequence completed successfully."
                } catch (Exception e) {
                    echo "Rollback failed. Please check host deployment logs."
                }
            }
        }
    }
}

