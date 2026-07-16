pipeline {
    agent any

    environment {
        NETWORK_NAME      = "pipeline-network"
        DOCKER_IMAGE_NAME = "task-tracker"
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
                sh "docker build --target builder -t ${DOCKER_IMAGE_NAME}:test ."
                sh "docker run --rm ${DOCKER_IMAGE_NAME}:test npm test"
            }
        }

        stage('Build Image') {
            steps {
                echo "Compiling clean multi-stage production container tagged: ${BUILD_TAG}"
                sh "docker build -t ${DOCKER_IMAGE_NAME}:${BUILD_TAG} ."
            }
        }

        stage('Deploy') {
            steps {
                echo 'Orchestrating container deployment strategy...'
                sh "docker network create ${NETWORK_NAME} || true"
                sh "docker stop ${DOCKER_IMAGE_NAME}-app || true"
                sh "docker rm ${DOCKER_IMAGE_NAME}-app || true"
                sh "docker run -d --name ${DOCKER_IMAGE_NAME}-app --network ${NETWORK_NAME} -p 3000:3000 ${DOCKER_IMAGE_NAME}:${BUILD_TAG}"
            }
        }

        stage('Curl Verification') {
            steps {
                echo 'Evaluating service status metrics via a dynamic readiness verification loop...'
                script {
                    def maxAttempts = 5
                    def attempt = 0
                    def isReady = false
                    
                    while (attempt < maxAttempts && !isReady) {
                        attempt++
                        echo "Readiness loop evaluation check #${attempt}/${maxAttempts}..."
                        try {
                            def response = sh(script: "docker run --rm --network ${NETWORK_NAME} alpine:3.19 curl -s -o /dev/null -w '%{http_code}' http://${DOCKER_IMAGE_NAME}-app:3000/health", returnStdout: true).trim()
                            if (response == "200") {
                                isReady = true
                            }
                        } catch (Exception e) {
                            echo "Application server process failed to connect. Fetching crash reason..."
                        }
                        if (!isReady) { 
                            echo "--- CRASH DUMP FROM RUNNING CONTAINER (Attempt ${attempt}) ---"
                            sh "docker logs ${DOCKER_IMAGE_NAME}-app || true"
                            sh "sleep 4" 
                        }
                    }
                    
                    if (!isReady) {
                        error "Application health verification phase failed (Connection Timeout)."
                    }
                }
                
                echo 'Printing assignment expected multi-endpoint verification outputs:'
                sh "docker run --rm --network ${NETWORK_NAME} alpine:3.19 curl -s http://${DOCKER_IMAGE_NAME}-app:3000/"
                sh "docker run --rm --network ${NETWORK_NAME} alpine:3.19 curl -s http://${DOCKER_IMAGE_NAME}-app:3000/health"
                sh "docker run --rm --network ${NETWORK_NAME} alpine:3.19 curl -s http://${DOCKER_IMAGE_NAME}-app:3000/api/tasks"
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
                    sh "docker run -d --name ${DOCKER_IMAGE_NAME}-app --network ${NETWORK_NAME} -p 3000:3000 ${DOCKER_IMAGE_NAME}:${PREVIOUS_TAG}"
                    echo "Rollback completed successfully."
                } catch (Exception e) {
                    echo "Rollback strategy terminated: No previous valid working tags identified."
                }
            }
        }
    }
}
