import * as jose from "jose";
import initActors from "./actors.js";

const setupHeader = (actor) => {
  const header = {
    typ: "JOSE+JSON",
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

const enrichVP = (payload, data) => {
  addIfExists(payload, "vp", data);
  return payload;
};

const enrichVC = (payload, data) => {
  addIfExists(payload, "vc", data);
  return payload;
};

export default async function signJws(data, actorsList) {
  const type = Array.isArray(data.type) ? data.type : [data.type];
  const actors = await initActors();

  const payload = {};
  if (type.some((t) => t === "VerifiablePresentation")) {
    const vcs = Array.isArray(data.verifiableCredential)
      ? data.verifiableCredential
      : [data.verifiableCredential];
    const signedCredentials = await Promise.all(
      vcs.map(async (i) => signJws(i, ["issuer", "issuer2"]))
    );

    const vpData = {
      ...data,
      verifiableCredential: signedCredentials.map((sc) =>
        jose.base64url.encode(JSON.stringify(sc))
      ),
    };

    enrichVP(payload, vpData);
  } else if (type.some((t) => t === "VerifiableAttestation")) {
    enrichVC(payload, data);
  }

  let jwsSignature = new jose.GeneralSign(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  actorsList.forEach((actor) => {
    const header = setupHeader(actors[actor]);
    jwsSignature = jwsSignature
      .addSignature(actors[actor].key)
      .setProtectedHeader(header);
  });

  return jwsSignature.sign();
}
