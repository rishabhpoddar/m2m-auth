# M2M auth with SuperTokens

This application showcases how to implement machine to machine auth using SuperTokens. We have the following components:
- Auth server: This is a node server that uses SuperTokens' NodeJS SDK. This will issue access tokens (JWTs) to microservices which they can use to communicate with other microservices. It will also maintain a list of microservices that are allowed to communicate with each other. This service relies on the SuperTokens core to create JWTs. We use the managed core (from supertokens.com) in this demo, but you can even self host this. 
- Microservices: This is also a node server (but it can be in any language). In this demo, it has an endpoint `/hello GET` which other microservices can call. This endpoint is protected using JWT auth.

## Installing and running the demo

### Start the auth server on `http://localhost:8000`
```bash
cd auth-server
npm i
npm run start
```

### Start microservice 1 on `http://localhost:8001`
```bash
cd microservices
npm i
npm run start m1
```

### Start microservice 2 on `http://localhost:8002`
```bash
cd microservices
npm run start m2
```

### Start microservice 3 on `http://localhost:8003`
```bash
cd microservices
npm run start m3
```

At this point, you should have the auth server and 3 microservices running.

## Making microservices communicate with each other

The auth server maintains a mapping of which server is allowed to query which other service:

```ts
const allowedMicroservicesInteractions: { [key: string]: string[] } = {
    "m1": ["m2", "m1"],
    "m2": ["m1", "m2"],
    "m3": ["m1"]
}
```

For example, in the above, service `m1` is only allowed to query service `m2` and `m1`. It is not allowed to query service `m3`. Whilst this demo has this in code, you can instead store this mapping in your database.

To make microservice `m1` query `m2`, use the following cURL command:

```bash
curl --location --request POST 'http://localhost:8001/query' \
--header 'Content-Type: application/json' \
--data-raw '{
    "target": "m1"
}'
```

Here, we are querying `m1` on `http://localhost:8001` and setting the target to `m2`. If this is allowed by the auth-server, it will return a 200 status code, else it will return a 401.

## How it works
Whenever microservice `mX` wants to query `mY`, `mX` will first get a JWT from the auth server by querying `http://localhost:8000/accesstoken POST` with an auth token and the JSON body `{"target": "mY"}`. If `mX` is allowed to communicate with `mY`, then the auth server will return a JWT, else it will return a 401. The returned JWT will have the following payload:
- `aud`: `mY`
- `iss`: `auth-server`
- `sub`: `mX`
When this is used to query `mY`, `mY` will verify the JWT using the following checks:
- The signature of the JWT is valid and it's not expired
- The `iss` is `auth-server`
- The `aud` is `mY` (i.e. it's itself)

It can then know that `mX` queried it by reading the `sub` claim of the JWT.

Now, for `mX` to be able to query the auth server in the first place, it needs an access token. This is a special JWT that is very long lived (100 years) and is hard coded in `mX`. The claims of the JWT are:
- `aud`: `auth-server`
- `iss`: `auth-server`
- `sub`: `mX`

When used, the auth server will verify the JWT using the following checks:
- The signature of the JWT is valid and it's not expired
- The `iss` is `auth-server`
- The `aud` is `auth-server` (i.e. it's itself)

The auth server can then know that `mX` queried it by reading the `sub` claim of the JWT. In order to generate this special JWT, you can query the SuperTokens core with the following cURL command:

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

Notice that the lifetime of this token is 100 years, so for all practical purposes, this will never expire (unless you manually change the public keys in the SuperTokens core database).