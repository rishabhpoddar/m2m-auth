import axios from "axios";
import express, { Request, Response, Application } from 'express';
import JsonWebToken, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const currMicroservice = process.argv[2];
if (currMicroservice === undefined) {
    throw new Error("Please provide the microservice name as an argument like 'npm run start m1'");
}

function getMicroservicePort(microservice: string) {
    if (microservice === "m1") {
        return 8001;
    }
    if (microservice === "m2") {
        return 8002;
    }
    return 8003
}

function getAuthJwtForMicroservice(microservice: string) {
    // Ideally, we put the JWT below in the environment variable for this microservice
    if (microservice === "m1") {
        return "eyJraWQiOiJzLTIxN2E4ZjE0LTgyY2YtNDJmYi04YjQ0LTZhN2YxMDM0NDMxMyIsInR5cCI6IkpXVCIsImFsZyI6IlJTMjU2In0.eyJpYXQiOjE3MDkxMzk0NTksImV4cCI6NDg2MjczOTQ1OSwiaXNzIjoiYXV0aC1zZXJ2ZXIiLCJzdWIiOiJtMSIsImF1ZCI6ImF1dGgtc2VydmVyIn0.nko5yyvUpjK9LxWX_XaNFhrH4pBgUh3pZ_i3Arn-qnG8j-771It0jVoJ_Z-aAsReVWNpratd3PhvX8o1lV1GSeO8ZASu96UrzJm2wmRqOxmyIfac8BFIzfYXddrDgcOFwfmFwdfMeVRjWm4gyF62V5NjpahU33RaffrS8l7uqQmCoiW9JOFi1vcSkYG0Dnh0NfKCdPC7zaLMizoBLDWYjKmeOYspHqSNoJHkDL5JAJg6OOTYRtxI-1rde5CphhL01cQwT2f6CnuTBqGm-ihxzuVvn8KYDUWdHJjP2RfnAHqY3HX3Cq7jLNoSd643mO974VY3Ve3SsVOb5qyysQ8Sdg"
    } else if (microservice === "m2") {
        return "eyJraWQiOiJzLTIxN2E4ZjE0LTgyY2YtNDJmYi04YjQ0LTZhN2YxMDM0NDMxMyIsInR5cCI6IkpXVCIsImFsZyI6IlJTMjU2In0.eyJpYXQiOjE3MDkxNDQ4NTMsImV4cCI6NDg2Mjc0NDg1MywiaXNzIjoiYXV0aC1zZXJ2ZXIiLCJzdWIiOiJtMiIsImF1ZCI6ImF1dGgtc2VydmVyIn0.XB748cQNjYEGW4iYonkJUuawgLAsjSvPMx3tAVte3-LFiAY54b5NIQ6TGChthW2BpUvEfMf1UdwS5icfEclKi4xgPXR1T54LghknPcD83p0tqv9exuWM2c_kUyIMHLdVlHIZ2KtC-OewzDcDCWn3w6g5EusHdd2oCCqfqyuhyUDkKhOrH1KjRKPkDALqYrnzebGmVUBOHpUyy8aWvH3UaTb7weL1DJq5FJ_RC96XRKnoCcdGo-apqi16ry-VYJ0Qf01JM6J1uX2i-QNF28HODv8Y9cTLkQ1EDOKOXmGPYybLSTIPKT-H-yyAep996s04uUoTULf8zWOCibQ4u_jZKg"
    } else {
        return "eyJraWQiOiJzLTIxN2E4ZjE0LTgyY2YtNDJmYi04YjQ0LTZhN2YxMDM0NDMxMyIsInR5cCI6IkpXVCIsImFsZyI6IlJTMjU2In0.eyJpYXQiOjE3MDkxNDQ4NzAsImV4cCI6NDg2Mjc0NDg3MCwiaXNzIjoiYXV0aC1zZXJ2ZXIiLCJzdWIiOiJtMyIsImF1ZCI6ImF1dGgtc2VydmVyIn0.WQ5u5yN-inSgj4s2_vstYLsRaGP7FtZMT7LEkwUWYooQqNfodEXooYGCbvh6se6jm0lOa8qdUF6KisfEVv3aZLLuiP_XukSEc7yNuoSTR0nPhlToJ8m56l_8rZ-cMBjrKRR3CfD3wBUSjW2P7rUzcx4QijjAd84CfMkaC_C54SOiuryiVbsrcjiClI-tgFb2NfxEDuGmioJ7we8r0kCCIABWZPuIZ5WJsDyE68P9kT99fhIMoIFI4QTvoryIp9jWdrERitHhQ1XMI40QnLYYau3CxYc-Y1hIlVrlTNg4XJzyj4zTMxXOG6F48W1A6u_wenrum_g0MBOK6-JlJysiew"
    }
}

const app: Application = express();

const cachedJWT: { [key: string]: string } = {};

async function queryMicroservice(target: string, res: Response) {
    try {
        let jwt = cachedJWT[target];
        if (jwt === undefined) {
            // fetch a JWT from the auth-server.
            let response = await axios.post("http://localhost:8000/accesstoken", { target }, {
                headers: {
                    "Authorization": "Bearer " + getAuthJwtForMicroservice(currMicroservice)
                },
            });

            jwt = response.data.accessToken;
            cachedJWT[target] = jwt;
        }
        // now we query the target microservice.
        let response = await axios.get(`http://localhost:${getMicroservicePort(target)}/hello`, {
            headers: {
                "Authorization": "Bearer " + jwt
            }
        });
        res.send(response.data);
    } catch (e: any) {
        res.status(500).send("Error: " + e.message);
    }
}

app.use(express.json());

let client = jwksClient({
    jwksUri: 'http://localhost:8000/auth/jwt/jwks.json'
});

function getKey(header: JwtHeader, callback: SigningKeyCallback) {
    client.getSigningKey(header.kid, function (err, key) {
        var signingKey = key!.getPublicKey();
        callback(err, signingKey);
    });
}

app.get('/hello', (req: Request, res: Response) => {
    // other micro services will query this. So we auth them.
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
        if (aud !== currMicroservice && iss !== "auth-server") {
            return res.status(401).send("aud is not auth-server");
        }
        let sub = decodedJWT.sub;
        res.send("Hello to " + sub + " from " + currMicroservice + "!");
    });
});

app.post('/query', (req: Request, res: Response) => {
    // This API is used to query other micorsevices from this one.
    queryMicroservice(req.body.target, res);
});

app.listen(getMicroservicePort(currMicroservice), () => {
    console.log(`Running microservice ${currMicroservice} on http://localhost:${getMicroservicePort(currMicroservice)}`);
});