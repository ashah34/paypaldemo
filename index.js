const express = require("express");
const axios = require("axios");
const cors = require('cors');
const app = express();
app.use(express.json());
// app.use(cors({ origin: 'http://localhost:3000' }))
const PORT = 3000;

// ✅ PayPal Sandbox Credentials (HARDCODED)
const PAYPAL_CLIENT_ID = "AWr_vGCRtFX1KmtKSwSv3eA2opJ9Y1m__35EAugbMWW7KQH7_V-7eM5KntsXOQSLgZFW3niICUsQli0E";
const PAYPAL_SECRET = "EOCfkM-Uf2MmKhPxxlUf8Tg0wKy-xTUVk9j6y-hwZ-Qqi3H8nmzSIkwoPDcW68qjkkxda2Gz5B69ld6j";
const PAYPAL_API = "https://api-m.sandbox.paypal.com";

const getAccessToken = async () => {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");

  const response = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data.access_token;
};

app.post("/create-product", async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const timestamp = Date.now();

    const productPayload = {
      name: "BestBetsBuilder",
      type: "PHYSICAL",
      id: `p-${timestamp}`,
      description: "Demo - All access to our products such as Multibet, BBB, Trebles.",
      category: "SOFTWARE",
      image_url: `https://example.com/gallery/images/${timestamp}.jpg`,
      home_url: `https://example.com/catalog/${timestamp}`
    };

    const response = await axios.post(
      `${PAYPAL_API}/v1/catalogs/products`,
      productPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("PayPal Product Creation Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

// p-1754477235412 - PRODUCT ID
app.post("/create-plan", async (req, res) => {
  try {
    const accessToken = await getAccessToken();

    const planPayload = {
      product_id: "p-1754467625", // 👈 your product ID
      name: "Test-BestBetbuilder11",
      description: "Full access to all tools such as BBB, Multibet, Trebles",
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // 0 = infinite until canceled
          pricing_scheme: {
            fixed_price: {
              value: "9.99",
              currency_code: "GBP"
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: "1",
          currency_code: "GBP"
        },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3
      },
      taxes: {
        percentage: "0",
        inclusive: false
      }
    };

    const response = await axios.post(
      `${PAYPAL_API}/v1/billing/plans`,
      planPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("PayPal Plan Creation Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

// product_id: "p-1754467625"
app.post("/create-subscription", async (req, res) => {
  try {
    const accessToken = await getAccessToken();

    const subscriptionPayload = {
      plan_id: "P-6VU7597709697014PNCJRCRI", // Your actual plan_id
      startTime: new Date(Date.now() + 60 * 1000).toISOString(),
// Then use: start_time: startTime

      subscriber: {
        name: {
          given_name: "Ayushi",
          surname: "Shah"
        },
        email_address: "aashah@gmail.com",
        shipping_address: {
          name: {
            full_name: "A A SHAH"
          },
          address: {
            address_line_1: "Gala Empire",
            address_line_2: "Opp. Doordarshan TV Tower",
            admin_area_2: "",
            admin_area_1: "Thaltej",
            postal_code: "380014",
            country_code: "IN"
          }
        }
      },
      application_context: {
        brand_name: "Example Inc",
        locale: "en-US",
        shipping_preference: "SET_PROVIDED_ADDRESS",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
        },
        return_url: "https://example.com/return",
        cancel_url: "https://example.com/cancel"
      }
    };

    const response = await axios.post(
      `${PAYPAL_API}/v1/billing/subscriptions`,
      subscriptionPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // 👇 Return approval URL so frontend can redirect user
    const approvalLink = response.data.links.find(link => link.rel === "approve")?.href;
    console.log(response.data);
    
    res.status(200).json({
      success: true,
      subscription_id: response.data.id,
      approval_url: approvalLink
    });

  } catch (error) {
    console.error("PayPal Subscription Creation Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});


app.post("/cancel-subscription", async (req, res) => {
  const { subscription_id, reason } = req.body;

  if (!subscription_id) {
    return res.status(400).json({ success: false, message: "Subscription ID is required" });
  }

  try {
    const accessToken = await getAccessToken();

    const cancelReason = reason || "User-initiated cancellation.";

    const res = await axios.post(
      `${PAYPAL_API}/v1/billing/subscriptions/${subscription_id}/cancel`,
      { reason: cancelReason },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ success: true, message: "Subscription cancelled successfully." });
  } catch (error) {
    console.error("PayPal Subscription Cancel Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});



app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});





