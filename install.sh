set -e

cat <<EOF >.env
COOKIE_PARSER_SECRET_KEY=""
# Optional
## For more information visit https://cloud.google.com/document-ai/docs/process-documents-client-libraries#client-libraries-usage-nodejs
GCP_PROJECT_ID=""
GCP_DOC_AI_PROCESSOR_CLIENT_EMAIL=""
GCP_DOC_AI_PROCESSOR_PRIVATE_KEY=""
GCP_DOC_AI_PROCESSOR_NAME=""
## 0 means false
## 1 means true
GCP_DOC_AI_SKIP_HUMAN_REVIEW="0"
EOF

npm i --no-audit --no-fund

echo
echo "File .env created"
echo
echo "DONE!"