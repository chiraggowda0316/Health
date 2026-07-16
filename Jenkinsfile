pipeline {
    agent any

    environment {
        // ASSIGNMENT CONFIGURATION - Flat tag targeting local machine verification
        DOCKER_REGISTRY   = "localhost"
        DOCKER_IMAGE_NAME = "task-tracker"
        
        // Build tracking parameters
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
                echo 'Building an isolated test image context and running validation suites...'
                // Builds up to the target builder environment layer and executes its test scripts directly
                sh "docker build --target builder -t ${DOCKER_IMAGE_NAME}:test ."
                sh "docker run --rm ${DOCKER_IMAGE_NAME}:test npm test"
            }
        }

        stage('Build Image') {
            steps {
                echo "Compiling clean multi-stage production container tagged: ${BUILD_TAG}"
                sh "docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${BUILD_TAG} ."
            }
        }

        stage('Deploy') {
            steps {
                echo 'Orchestrating container deployment strategy via native Docker execution...'
                sh "docker stop ${DOCKER_IMAGE_NAME}-app || true"
                sh "docker rm ${DOCKER_IMAGE_NAME}-app || true"
                
                // Spin up the runtime environment matching assigned requirements
                sh "docker run -d --name ${DOCKER_IMAGE_NAME}-app -p 3000:3000 ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${BUILD_TAG}"
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
            echo 'Pruning legacy dangling images and freeing workspace environments...'
            sh 'docker image prune -f || true'
            cleanWs()
        }
        success {
            echo 'Pipeline successfully passed and deployed!'
        }
        failure {
            echo "Deployment anomalies detected. Reverting back to previous working tag: ${PREVIOUS_TAG}"
            script {
                try {
                    sh "docker stop ${DOCKER_IMAGE_NAME}-app || true"
                    sh "docker rm ${DOCKER_IMAGE_NAME}-app || true"
                    sh "docker run -d --name ${DOCKER_IMAGE_NAME}-app -p 3000:3000 ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${PREVIOUS_TAG}"
                    echo "Rollback completed successfully."
                } catch (Exception e) {
                    echo "Rollback strategy terminated: No previous valid working tags identified."
                }
            }
        }
    }
}
