import express, { Request, Response, Application } from 'express';
import supertokens from "supertokens-node"
import JWTRecipe from "supertokens-node/recipe/jwt"
import { middleware } from "supertokens-node/framework/express";
import { errorHandler } from "supertokens-node/framework/express";
import JsonWebToken, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const app: Application = express();
const port = process.env.PORT || 8000;

supertokens.init({
    appInfo: {
        apiDomain: "http://localhost:" + port,
        appName: "M2M auth demo",
        websiteDomain: "example.com"
    },
    supertokens: {
        connectionURI: "https://st-dev-6c18c3b0-c96b-11ee-813b-df2fdf122adb.aws.supertokens.io/appid-m2m-auth", // location of the core
        apiKey: "2o3EmNQGPQ3YaC6kbAcB33keTv" // provide the core's API key if configured
    },
    recipeList: [
        JWTRecipe.init()
    ]
})

app.use(express.json());

app.use(middleware());

let client = jwksClient({
    jwksUri: 'http://localhost:' + port + '/auth/jwt/jwks.json'
});

function getKey(header: JwtHeader, callback: SigningKeyCallback) {
    client.getSigningKey(header.kid, function (err, key) {
        var signingKey = key!.getPublicKey();
        callback(err, signingKey);
    });
}

const allowedMicroservicesInteractions: { [key: string]: string[] } = {
    "m1": ["m2", "m1"],
    "m2": ["m1", "m2"],
    "m3": ["m1"]
}


app.post('/accesstoken', (req: Request, res: Response) => {
    let jwt = req.headers.authorization?.split(' ')[1];
    if (jwt === undefined) {
        return res.status(401).send("Unauthorized");
    }
    JsonWebToken.verify(jwt, getKey, {}, async function (err, decoded) {
        if (err) {
            return res.status(401).send("Unauthorized");
        }
        let decodedJWT = decoded;
        if (decodedJWT === undefined || typeof decodedJWT === "string") {
            return res.status(401).send("Unauthorized");
        }
        let aud = decodedJWT.aud;
        let iss = decodedJWT.iss;
        if (aud !== "auth-server" && iss !== "auth-server") {
            return res.status(401).send("aud is not auth-server");
        }
        let sub = decodedJWT.sub;
        if (sub === undefined || allowedMicroservicesInteractions[sub] === undefined) {
            return res.status(401).send("Unknown source microservice");
        }

        let targetMicroservice = req.body.target;
        if (targetMicroservice === undefined || allowedMicroservicesInteractions[sub].indexOf(targetMicroservice) === -1) {
            return res.status(401).send("Unauthorized target microservice");
        }

        let accessToken = await JWTRecipe.createJWT({
            iss: "auth-server",
            sub,
            aud: targetMicroservice
        }, 3600); // lifetime of this JWT is 1 hour
        if (accessToken.status !== "OK") {
            return res.status(500).send("Internal error");
        }

        res.json({ accessToken: accessToken.jwt });
    });
});

app.use(errorHandler())

app.listen(port, () => {
    console.log(`Server auth server on http://localhost:${port}`);
});