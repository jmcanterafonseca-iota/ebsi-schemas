import * as jose from "jose";
import { base58btc } from "multiformats/bases/base58"; // eslint-disable-line

const aliceJwk = {
  kty: "EC",
  d: "d_PpSCGQWWgUc1t4iLLH8bKYlYfc9Zy_M7TsfOAcbg8",
  use: "sig",
  crv: "P-256",
  kid: "e3Mrg7Tx2Fiw1vAq-I3puP3_eTVpH-3LAlJ0mkuyHS8",
  x: "ngy44T1vxAT6Di4nr-UaM9K3Tlnz9pkoksDokKFkmNc",
  y: "QCRfOKlSM31GTkb4JHx3nXB4G_jSPMsbdjzlkT_UpPc",
  alg: "ES256",
};
const bobJwk = {
  kty: "EC",
  d: "qAAbNWOBUYBcEuDYHMWE6h4O1hgsSIhMlzR2v17F-Ls",
  use: "sig",
  crv: "P-256",
  kid: "BATbR00cIhPVKr5xm1y-TUvueCjzPxACery0C6L0hyc",
  x: "n1l8HzJyfmvqCprbrsDoK9sUyRK2DTWoTbOFdRT_6HE",
  y: "DDd9ecdyVsFJGVS1f1AtItefpKKZQDt4zFJFpk9G06A",
  alg: "ES256",
};
const issuerJwk = {
  kty: "EC",
  d: "z617Hhdusxqt3KN98NHvFtWTpSW_sq2cCZpNSzu8m88",
  use: "sig",
  crv: "P-256",
  kid: "CG4OE7FEwwh4Nr7ip3l8gq31FZq3jYAJZMru362H9pU",
  x: "ZYE6uX3XvQ9rLc6s0eeo2YiOM2VfwrEZOZXzTOthcHE",
  y: "k-t1bfe-MmmXWQ0QaxK3uJMYlMNkJHYGUSLpxP9RQak",
  alg: "ES256",
};
const verifierJwk = {
  kty: "EC",
  d: "ucRzbXf23xXpfyXvDOeg-Woo5pywv6XJ1CQovhiZb_U",
  use: "sig",
  crv: "P-256",
  kid: "Q4RRYUdI0oYZBUR--OFR8qr4aXu1CgKZpNRyVAgHQc0",
  x: "g-foMvQQEANWgL3RXy3pu-gYdcG3Em9W245UNXiYwhs",
  y: "fowb8W13LEjvyfeiJDep6ivw9oimh2mjt28_SSckBOI",
  alg: "ES256",
};

const formatDID = (hex) => {
  const buff = Buffer.from(hex, "hex");
  console.assert(buff.length === 17 || buff.length === 33, "invalid did size");
  console.assert(buff[0] === 1 || buff[0] === 2, "invalid did version");
  return `did:ebsi:${base58btc.encode(new Uint8Array(buff))}`;
};

async function makeNaturalPerson(jwk) {
  const thumbprint = await jose.calculateJwkThumbprint(jwk, "sha256");
  const didv2Hex = "02" + Buffer.from(thumbprint, "base64url").toString("hex"); // eslint-disable-line
  return {
    key: await jose.importJWK(jwk, "ES256"),
    thumbprint,
    did: formatDID(didv2Hex),
    type: "NP",
    jwk: {
      kty: jwk.kty,
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
      alg: jwk.alg,
    },
  };
}

const makeLegalEntity = async (jwk, did) => {
  const naturalPerson = await makeNaturalPerson(jwk);
  naturalPerson.did = formatDID(did);
  naturalPerson.type = "LE";
  return naturalPerson;
};

export default async () => ({
  alice: await makeNaturalPerson(aliceJwk),
  bob: await makeNaturalPerson(bobJwk),
  issuer: await makeLegalEntity(
    issuerJwk,
    "01af8270b9275bb3a8b1f3f924cbf9ba69"
  ),
  verifier: await makeLegalEntity(
    verifierJwk,
    "01beadcafebeadcafebeadcafebeadcafe"
  ),
});
