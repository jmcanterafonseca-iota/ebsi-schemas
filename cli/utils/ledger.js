/* eslint-disable no-param-reassign */
import axios from "axios";
import { ethers } from "ethers";

export function formatEthersUnsignedTransaction(unsignedTransaction) {
  return {
    to: unsignedTransaction.to,
    data: unsignedTransaction.data,
    value: unsignedTransaction.value,
    nonce: Number(unsignedTransaction.nonce),
    chainId: Number(unsignedTransaction.chainId),
    gasLimit: unsignedTransaction.gasLimit,
    gasPrice: unsignedTransaction.gasPrice,
  };
}

export async function waitToBeMined({ txId, accessToken, ledger, task }) {
  let receipt = null;
  let tries = 0;

  task.title = "Waiting for transaction to be mined...";

  /* eslint-disable no-await-in-loop */
  while (tries < 200) {
    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 500);
    });

    tries += 1;
    task.title = `Waiting to be mined${".".repeat(tries)}`;

    try {
      const responseReceipt = await axios.post(
        `${ledger}/blockchains/besu`,
        {
          jsonrpc: "2.0",
          method: "eth_getTransactionReceipt",
          params: [txId],
          id: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 10000,
        }
      );

      receipt = responseReceipt.data.result;
      if (receipt) {
        return receipt;
      }
    } catch (e) {
      // Repeat
    }
  }

  throw new Error("Exceeded max tries");
}

export async function publishSchema({
  schemaId,
  payload,
  tsr,
  ledger,
  privateKey,
  accessToken,
  task,
}) {
  let method;

  const serializedSchema = JSON.stringify(payload);
  const serializedSchemaBuffer = Buffer.from(serializedSchema);

  try {
    await axios.get(`${tsr}/schemas/${schemaId}`, {
      timeout: 10000,
    });

    method = "updateSchema";
  } catch (error) {
    if (error.response && error.response.status === 404) {
      method = "insertSchema";
      task.title = "Registering new schema...";
    } else {
      throw error;
    }
  }

  // Check if revisions exists
  if (method === "updateSchema") {
    const schemaRevisionId = ethers.utils.sha256(serializedSchemaBuffer);

    try {
      await axios.get(
        `${tsr}/schemas/${schemaId}/revisions/${schemaRevisionId}`,
        {
          timeout: 10000,
        }
      );

      return "exists_already";
    } catch (error) {
      if (error.response && error.response.status === 404) {
        task.title = "Schema already exists. Update in progress...";
      } else {
        throw error;
      }
    }
  }

  const metadata = {};
  const serializedMetadata = JSON.stringify(metadata);
  const serializedMetadataBuffer = Buffer.from(serializedMetadata);

  const wallet = new ethers.Wallet(privateKey);
  const params = {
    from: wallet.address,
    schemaId,
    schema: `0x${serializedSchemaBuffer.toString("hex")}`,
    metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
  };

  task.title = "Preparing request...";

  const responseBuild = await axios.post(
    `${tsr}/jsonrpc`,
    {
      jsonrpc: "2.0",
      method,
      params: [params],
      id: 231,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 10000,
    }
  );

  task.title = "Signing request...";

  const unsignedTransaction = responseBuild.data.result;
  const uTx = formatEthersUnsignedTransaction(
    JSON.parse(JSON.stringify(unsignedTransaction))
  );
  uTx.chainId = Number(uTx.chainId);
  const sgnTx = await wallet.signTransaction(uTx);
  const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

  task.title = "Sending signed transaction...";

  const responseSend = await axios.post(
    `${tsr}/jsonrpc`,
    {
      jsonrpc: "2.0",
      method: "sendSignedTransaction",
      params: [
        {
          protocol: "eth",
          unsignedTransaction,
          r,
          s,
          v: `0x${Number(v).toString(16)}`,
          signedRawTransaction: sgnTx,
        },
      ],
      id: "45",
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 10000,
    }
  );

  // Wait to be mined
  const receipt = await waitToBeMined({
    txId: responseSend.data.result,
    accessToken,
    ledger,
    task,
  });

  if (receipt.status !== "0x1") {
    throw new Error("The script it unable to register the schema.");
  }

  if (method === "insertSchema") {
    return "published";
  }

  return "updated";
}
