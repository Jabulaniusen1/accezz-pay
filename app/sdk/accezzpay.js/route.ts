const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
const sdkVersion = "1.0.0"

const sdkSource = `(() => {
  const DEFAULT_BASE_URL = ${JSON.stringify(appUrl || "")};
  const PAYMENTS_ENDPOINT = "/api/payments/initialize";
  const state = {
    config: null,
  };

  function assert(condition, message) {
    if (!condition) {
      throw new Error(\`AccezzPay SDK: \${message}\`);
    }
  }

  async function initializePayment(payload) {
    const endpoint = (state.config?.baseUrl || DEFAULT_BASE_URL || window.location.origin) + PAYMENTS_ENDPOINT;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || "Unable to initialize payment");
    }
    return response.json();
  }

  function openCheckout(options) {
    assert(state.config, "Call AccezzPay.init() before open()");
    const payload = {
      organizer_id: state.config.organizerId,
      product_id: state.config.productId,
      ticket_type_id: options?.ticketTypeId || state.config.ticketTypeId,
      quantity: options?.quantity || state.config.quantity || 1,
      buyer_name: options?.buyerName,
      buyer_email: options?.buyerEmail,
      buyer_phone: options?.buyerPhone,
      redirect_url: options?.redirectUrl || state.config.redirectUrl,
    };

    assert(payload.ticket_type_id, "ticketTypeId is required");
    assert(payload.buyer_name && payload.buyer_email, "buyerName and buyerEmail are required");

    initializePayment(payload)
      .then((session) => {
        if (state.config?.mode === "inline" && window.PaystackPop) {
          const handler = window.PaystackPop.setup({
            key: state.config.publicKey,
            email: payload.buyer_email,
            amount: session.amount || 0,
            reference: session.reference,
          });
          handler.openIframe();
        } else {
          window.open(session.authorizationUrl, "_blank", "noopener,noreferrer");
        }
      })
      .catch((error) => {
        console.error("AccezzPay SDK error", error);
        if (typeof state.config?.onError === "function") {
          state.config.onError(error);
        }
      });
  }

  const AccezzPay = {
    version: "${sdkVersion}",
    init(config) {
      assert(config, "Missing configuration");
      assert(config.publicKey, "publicKey is required");
      assert(config.organizerId, "organizerId is required");
      assert(config.productId, "productId is required");

      state.config = {
        baseUrl: config.baseUrl || DEFAULT_BASE_URL,
        publicKey: config.publicKey,
        organizerId: config.organizerId,
        productId: config.productId,
        ticketTypeId: config.ticketTypeId,
        quantity: config.quantity,
        mode: config.mode || "redirect",
        redirectUrl: config.redirectUrl,
        onError: config.onError,
      };

      if (state.config.mode === "inline" && typeof window !== "undefined" && !window.PaystackPop) {
        const script = document.createElement("script");
        script.src = "https://js.paystack.co/v2/inline.js";
        script.async = true;
        document.head.appendChild(script);
      }

      return this;
    },
    open(options) {
      openCheckout(options || {});
    },
  };

  if (typeof window !== "undefined") {
    window.AccezzPay = AccezzPay;
  }
})();`

export function GET() {
  return new Response(sdkSource, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}

