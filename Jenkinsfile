pipeline {
    agent any

    environment {
        IMAGE = 'vasanth45/url-shortener'
        TAG   = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Test') {
            steps {
                sh '''
                    npm ci
                    npm test
                '''
            }
        }

        stage('Build image') {
            steps {
                sh 'docker build -t $IMAGE:$TAG -t $IMAGE:latest .'
            }
        }

        stage('Push image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub',
                                                  usernameVariable: 'DH_USER',
                                                  passwordVariable: 'DH_PASS')]) {
                    sh '''
                        echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
                        docker push $IMAGE:$TAG
                        docker push $IMAGE:latest
                    '''
                }
            }
        }

        stage('Deploy to dev') {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    sh '''
                        export IMAGE_REF=$IMAGE:$TAG REPLICAS=1 APP_ENV=dev BASE_URL=http://localhost:3001
                        kubectl apply -n dev -f k8s/mongo.yaml
                        envsubst '${IMAGE_REF} ${REPLICAS} ${APP_ENV} ${BASE_URL}' < k8s/web.yaml | sed "s|\\${IMAGE}|$IMAGE_REF|" | kubectl apply -n dev -f -
                        kubectl rollout status deployment/url-shortener -n dev --timeout=180s
                    '''
                }
            }
        }

        stage('Approve prod') {
            steps {
                timeout(time: 30, unit: 'MINUTES') {
                    input message: "Dev is running ${env.IMAGE}:${env.TAG}. Deploy it to PROD?", ok: 'Deploy to prod'
                }
            }
        }

        stage('Deploy to prod') {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    sh '''
                        export IMAGE_REF=$IMAGE:$TAG REPLICAS=2 APP_ENV=prod BASE_URL=http://localhost:3002
                        kubectl apply -n prod -f k8s/mongo.yaml
                        envsubst '${IMAGE_REF} ${REPLICAS} ${APP_ENV} ${BASE_URL}' < k8s/web.yaml | sed "s|\\${IMAGE}|$IMAGE_REF|" | kubectl apply -n prod -f -
                        kubectl rollout status deployment/url-shortener -n prod --timeout=180s
                    '''
                }
            }
        }
    }

    post {
        success { echo "Released ${env.IMAGE}:${env.TAG}" }
        failure { echo 'Pipeline failed. Open the red stage and read its log.' }
        always  { sh 'docker logout || true' }
    }
}
