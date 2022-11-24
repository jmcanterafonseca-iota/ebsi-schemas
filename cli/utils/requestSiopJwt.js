import { URLSearchParams } from "node:url";
import { randomUUID } from "node:crypto";
import axios from "axios";
import { Agent as SiopAgent, encode, verifyJwtTar } from "@cef-ebsi/siop-auth";
import { exportJWK, generateKeyPair, importJWK } from "jose";

export const requestSiopJwt = async ({
  clientKid,
  clientPrivateKey,
  authorisationApiUrl,
  trustedAppsRegistryUrl,
}) => {
  const alg = "ES256K";
  const encryptionKeyPair = await generateKeyPair(alg);
  const publicEncryptionKeyJwk = await exportJWK(encryptionKeyPair.publicKey);
  const privateEncryptionKeyJwk = await exportJWK(encryptionKeyPair.privateKey);

  const siopAgent = new SiopAgent({
    privateKey: await importJWK(
      encode.privateKey.fromHextoJWK(clientPrivateKey),
      alg
    ),
    kid: clientKid,
    alg,
    siopV2: true,
  });

  // 1. First, the client calls /authentication-requests
  const authenticationRequestsResponse = await axios.post(
    `${authorisationApiUrl}/authentication-requests`,
    {
      scope: "openid did_authn",
    }
  );

  // 2. The client verifies the response
  const uri = authenticationRequestsResponse.data;

  const urlParams = new URLSearchParams(uri.replace("openid://?", ""));
  const params = Object.fromEntries(urlParams);
  Object.keys(params).forEach((k) => {
    params[k] = decodeURIComponent(params[k]);
  });
  const { payload } = await verifyJwtTar(params.request, {
    trustedAppsRegistry: `${trustedAppsRegistryUrl}/apps`,
  });

  // 3. The client creates an authentication response and gets an ID Token
  const nonce = randomUUID();

  const authenticationResponse = await siopAgent.createResponse({
    nonce,
    redirectUri: payload.client_id,
    claims: {
      encryption_key: publicEncryptionKeyJwk,
    },
    responseMode: "form_post",
  });

  const { idToken } = authenticationResponse;

  // 4. The client call /siop-sessions with the ID Token
  const siopSessionsResponse = await axios.post(
    `${authorisationApiUrl}/siop-sessions`,
    new URLSearchParams({ id_token: idToken }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  // 5. Finally, the client verifies the SIOP authentication response and gets an access token
  const accessToken = await SiopAgent.verifyAkeResponse(
    siopSessionsResponse.data,
    {
      nonce,
      privateEncryptionKeyJwk,
      trustedAppsRegistry: `${trustedAppsRegistryUrl}/apps`,
      alg,
    }
  );

  return accessToken;
};

export default requestSiopJwt;
