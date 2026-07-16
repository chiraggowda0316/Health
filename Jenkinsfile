pipeline {
    agent any

    environment {
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
                sh "docker stop ${DOCKER_IMAGE_NAME}-app || true"
                sh "docker rm ${DOCKER_IMAGE_NAME}-app || true"
                
                // Deploying with standard bridge port mapping
                sh "docker run -d --name ${DOCKER_IMAGE_NAME}-app -p 3000:3000 ${DOCKER_IMAGE_NAME}:${BUILD_TAG}"
            }
        }

        stage('Curl Verification') {
            steps {
                echo 'Evaluating service status metrics by resolving direct container IP...'
                script {
                    def maxAttempts = 6
                    def attempt = 0
                    def isReady = false
                    def containerIp = ""
                    
                    // Fetch the internal container IP dynamically from the docker engine
                    containerIp = sh(script: "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${DOCKER_IMAGE_NAME}-app", returnStdout: true).trim()
                    echo "Targeting Container Internal IP Address: ${containerIp}"
                    
                    if (containerIp == "") {
                        error "Could not resolve valid IP for container ${DOCKER_IMAGE_NAME}-app"
                    }
                    
                    while (attempt < maxAttempts && !isReady) {
                        attempt++
                        echo "Readiness loop evaluation check #${attempt}/${maxAttempts}..."
                        try {
                            // Direct curl mapping targeting the precise internal container socket
                            def response = sh(script: "curl -s -o /dev/null -w '%{http_code}' http://${containerIp}:3000/health", returnStdout: true).trim()
                            if (response == "200") {
                                isReady = true
                            }
                        } catch (Exception e) {
                            echo "Waiting for container endpoint response..."
                        }
                        if (!isReady) { 
                            sh "sleep 4" 
                        }
                    }
                    
                    if (!isReady) {
                        echo "--- PRINTS LIVE LOGS ON FINAL FAILURE CONTEXT ---"
                        sh "docker logs ${DOCKER_IMAGE_NAME}-app || true"
                        error "Application health verification phase failed (Connection Timeout)."
                    }
                    
                    echo 'Printing assignment expected multi-endpoint verification outputs:'
                    sh "curl -s http://${containerIp}:3000/"
                    sh "curl -s http://${containerIp}:3000/health"
                    sh "curl -s http://${containerIp}:3000/api/tasks"
                }
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
                    sh "docker run -d --name ${DOCKER_IMAGE_NAME}-app -p 3000:3000 ${DOCKER_IMAGE_NAME}:${PREVIOUS_TAG}"
                    echo "Rollback completed successfully."
                } catch (Exception e) {
                    echo "Rollback strategy terminated: No previous valid working tags identified."
                }
            }
        }
    }
}
