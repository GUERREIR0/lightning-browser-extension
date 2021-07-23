import React, { useState, MouseEvent } from "react";
import axios from "axios";
import sha256 from "crypto-js/sha256";
import Hex from "crypto-js/enc-hex";
import { parsePaymentRequest } from "invoices";

import msg from "../../common/lib/msg";

import Button from "../components/button";
import PublisherCard from "../components/PublisherCard";

type Props = {
  details: {
    minSendable: number;
    maxSendable: number;
    callback: string;
  };
  origin: {
    name: string;
    icon: string;
  };
};

function LNURLPay({ details, origin }: Props) {
  const [value, setValue] = useState<string | number>(details.minSendable);

  async function confirm() {
    try {
      // Get the invoice
      const params = {
        amount: value, // user specified sum in MilliSatoshi
        // nonce: "", // an optional parameter used to prevent server response caching
        // fromnodes: "", // an optional parameter with value set to comma separated nodeIds if payer wishes a service to provide payment routes starting from specified LN nodeIds
        // comment: "", // an optional parameter to pass the LN WALLET user's comment to LN SERVICE. Note on comment length: GET URL's accept around ~2000 characters for the entire request string. Therefore comment can only be as large as to fit in the URL alongisde any/all of the properties outlined above.*
        // proofofpayer: "", // an optional ephemeral secp256k1 public key generated by payer, a corresponding private key should be retained by payer, a payee may later ask payer to provide a public key itself or sign a random message using corresponding private key and thus provide a proof of payer.
      };
      const res = await axios.get(details.callback, { params });
      const paymentRequest = res.data.pr;
      const paymentRequestDetails = parsePaymentRequest({
        request: paymentRequest,
      });

      // LN WALLET Verifies that h tag (description_hash) in provided invoice is a hash of metadata string converted to byte array in UTF-8 encoding
      const metadataHash = await sha256(details.metadata).toString(Hex);
      if (paymentRequestDetails.description_hash !== metadataHash) {
        alert("Invoice invalid.");
        return;
      }

      // LN WALLET Verifies that amount in provided invoice equals an amount previously specified by user
      if (paymentRequestDetails.mtokens !== String(value)) {
        alert("Invoice invalid.");
        return;
      }

      // TODO:
      // If routes array is not empty: verifies signature for every provided ChannelUpdate, may use these routes if fee levels are acceptable

      // TODO:
      // If successAction is not null: LN WALLET makes sure that tag value of is of supported type, aborts a payment otherwise

      // LN WALLET pays the invoice, no additional user confirmation is required at this point
      return await msg.reply({
        confirmed: true,
        paymentRequest,
      });

      // TODO:
      // Once payment is fulfilled LN WALLET executes a non-null successAction
      // For message, a toaster or popup is sufficient
      // For url, the wallet should give the user a popup which displays description, url, and a 'open' button to open the url in a new browser tab
      // For aes, LN WALLET must attempt to decrypt a ciphertext with payment preimage. LN WALLET should also store successAction data on the transaction record
    } catch (e) {
      console.log(e.message);
    }
  }

  function reject(e: MouseEvent) {
    e.preventDefault();
    msg.error("User rejected");
  }

  function renderAmount() {
    if (details.minSendable === details.maxSendable) {
      return <p>{details.minSendable} satoshi</p>;
    } else {
      return (
        <div className="flex flex-col">
          <input
            type="range"
            min={details.minSendable}
            max={details.maxSendable}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <output className="mt-1 text-sm">{value} satoshi</output>
        </div>
      );
    }
  }

  return (
    <div>
      <PublisherCard title={origin.name} image={origin.icon} />
      <div className="p-6">
        <dl className="shadow p-4 rounded-lg mb-8">
          <dt className="font-semibold text-gray-500">Send payment to</dt>
          <dd className="mb-6">{origin.name}</dd>
          <dt className="font-semibold text-gray-500">Amount</dt>
          <dd>{renderAmount()}</dd>
        </dl>
        <div className="text-center">
          <div className="mb-5">
            <Button onClick={confirm} label="Confirm" fullWidth />
          </div>

          <p className="mb-3 underline text-sm text-gray-300">
            Only connect with sites you trust.
          </p>

          <a
            className="underline text-sm text-gray-500"
            href="#"
            onClick={reject}
          >
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}

export default LNURLPay;
