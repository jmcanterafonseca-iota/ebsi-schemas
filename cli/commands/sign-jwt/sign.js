import * as jose from "jose";
import initActors from "./actors.js";

const setupHeader = (actor) => {
  const header = {
    typ: "JWT",
    alg: actor.jwk.alg,
    kid: `${actor.did}#${actor.thumbprint}`,
  };

  if (actor.type === "NP") {
    header.jwk = actor.jwk;
  }

  return header;
};

const addIfExists = (payload, property, data) => {
  if (data !== null) {
    payload[property] = data; // eslint-disable-line
  }
};

const enrichVP = (payload, data, vcSubject, verifier) => {
  addIfExists(payload, "iss", data.holder);
  addIfExists(payload, "sub", vcSubject);
  addIfExists(payload, "aud", verifier.did);
  addIfExists(payload, "nonce", "1234567890");
  addIfExists(payload, "exp", Math.round(Date.now() / 1000 + 1500));
  addIfExists(payload, "iat", Math.round(Date.now() / 1000));
  addIfExists(payload, "vp", data);
  return payload;
};

const enrichVC = (payload, data) => {
  addIfExists(payload, "iss", data.issuer);
  addIfExists(
    payload,
    "sub",
    data.credentialSubject && data.credentialSubject.id
  );
  addIfExists(payload, "iat", data.issued);
  addIfExists(payload, "nbf", data.validFrom);
  addIfExists(payload, "exp", data.validUntil);
  addIfExists(payload, "jti", data.id);
  addIfExists(payload, "vc", data);
  return payload;
};

export default async function sign(data, actor) {
  const type = Array.isArray(data.type) ? data.type : [data.type];
  const actors = await initActors();
  const header = setupHeader(actors[actor]);

  const payload = {};
  if (type.some((t) => t === "VerifiablePresentation")) {
    const vcs = Array.isArray(data.verifiableCredential)
      ? data.verifiableCredential
      : [data.verifiableCredential];
    const vcSubject =
      vcs[0] && vcs[0].credentialSubject && vcs[0].credentialSubject.id;
    const signedCredentials = await Promise.all(
      vcs.map(async (i) => sign(i, "issuer"))
    );

    const vpData = {
      ...data,
      verifiableCredential: signedCredentials,
    };

    enrichVP(payload, vpData, vcSubject, actors.verifier);
  } else if (type.some((t) => t === "VerifiableAttestation")) {
    enrichVC(payload, data);
  }

  return new jose.SignJWT(payload)
    .setProtectedHeader(header)
    .sign(actors[actor].key);
}
