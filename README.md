
Command to create a JWT for M1:
```bash
curl --location --request POST 'https://st-dev-6c18c3b0-c96b-11ee-813b-df2fdf122adb.aws.supertokens.io/appid-m2m-auth/recipe/jwt' \
--header 'api-key: 2o3EmNQGPQ3YaC6kbAcB33keTv' \
--header 'Content-Type: application/json' \
--data-raw '{
    "payload": {
        "iss": "auth-server",
        "sub": "m1",
        "aud": "auth-server"
    },
    "validity": 3153600000,
    "useStaticSigningKey": true,
    "algorithm": "RS256",
    "jwksDomain": "http://localhost:8001"
}'
```