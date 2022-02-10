import { URLSearchParams } from "node:url";
import { randomUUID } from "node:crypto";
import axios from "axios";
import { Agent as SiopAgent, DidAuthResponseMode } from "@cef-ebsi/siop-auth";

export const requestSiopJwt = async ({
  didRegistry,
  did,
  privateKey,
  authorisationApiUrl,
}) => {
  const siopAgent = new SiopAgent({
    privateKey,
    didRegistry,
  });

  // 1. First, the client calls /authentication-requests
  let response = await axios.post(
    `${authorisationApiUrl}/authentication-requests`,
    {
      scope: "openid did_authn",
    }
  );

  // 2. The client verifies the response
  const uriDecoded = new URLSearchParams(
    response.data.uri.replace("openid://?", "")
  );

  await siopAgent.verifyAuthenticationRequest(uriDecoded.get("request"));

  // 3. The client creates an authentication response and gets an ID Token
  const nonce = randomUUID();

  const didAuthJwt = await siopAgent.createAuthenticationResponse({
    did,
    nonce,
    redirectUri: uriDecoded.get("client_id"),
    responseMode: DidAuthResponseMode.FORM_POST,
  });

  // 4. The client call /siop-sessions with the ID Token
  response = await axios.post(
    `${authorisationApiUrl}/siop-sessions`,
    didAuthJwt.bodyEncoded
  );

  // 5. Finally, the client verifies the SIOP authentication response and gets an access token
  const accessToken = await siopAgent.verifyAuthenticationResponse(
    response.data,
    nonce
  );

  return accessToken;
};

export default requestSiopJwt;
