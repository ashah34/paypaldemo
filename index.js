// https://developer.paypal.com/docs/api/catalog-products/v1/
const express = require("express");
const axios = require("axios");
const cors = require('cors');
const app = express();
const mysql = require("mysql2/promise");
app.use(express.json());
const { poolPromise, sql } = require("./db"); // your MSSQL config file
// app.use(cors({ origin: 'http://localhost:3000' }))
// Setup DB pool


const PORT = 3000;
const PAYPAL_CLIENT_ID = "AWr_vGCRtFX1KmtKSwSv3eA2opJ9Y1m__35EAugbMWW7KQH7_V-7eM5KntsXOQSLgZFW3niICUsQli0E";
const PAYPAL_SECRET = "EOCfkM-Uf2MmKhPxxlUf8Tg0wKy-xTUVk9j6y-hwZ-Qqi3H8nmzSIkwoPDcW68qjkkxda2Gz5B69ld6j";
const PAYPAL_API = "https://api-m.sandbox.paypal.com";
// const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
// const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
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
console.log(response.data.access_token);

  return response.data.access_token;
};

app.post("/create-product", async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const timestamp = Date.now();
// mybetbuilders.com
    const productPayload = {
      name: "MyBetBuilders",
      type: "DIGITAL",
      // id: `p-${timestamp}`,
      description: "All access to our products such as Multibet, BBB, Trebles.",
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

    res.status(200).json({ success: true,message:'Product created successfully!!', data: response.data  });
  } catch (error) {
    console.error("PayPal Product Creation Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

// Update product
app.patch("/products/:product_id", async (req, res) => {
  const { product_id } = req.params;
  const patchOperations = req.body; // Expecting array of patch operations

  try {
    const accessToken = await getAccessToken();

    const response = await axios.patch(
      `${PAYPAL_API}/v1/catalogs/products/${product_id}`,
      patchOperations,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ success: true, message: "Product updated successfully." });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({
      error: true,
      message: error.response?.data || error.message,
    });
  }
});
// List PayPal Products
app.get("/products", async (req, res) => {
  const { page_size = 10, page = 1, total_required = true } = req.query;

  try {
    const accessToken = await getAccessToken();

    const response = await axios.get(`${PAYPAL_API}/v1/catalogs/products`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      params: {
        page_size,
        page,
        total_required,
      },
    });

const data = response.data;

    res.status(200).json({
      count: data.total_items || data.products?.length || 0,
      total_pages: data.total_pages || 1,
      page: Number(page),
      page_size: Number(page_size),
      products: data.products || [],
    });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({
      error: true,
      message: error.response?.data || error.message,
    });
  }
});
// p-1754477235412 - PRODUCT ID
app.post("/create-plan", async (req, res) => {
  try {
    const accessToken = await getAccessToken();

    const planPayload = {
      product_id: "p-1754467625", // 👈 your product ID
      name: "BestBetbuilder 20200807",
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

app.get("/plans", async (req, res) => {
  const {
    product_id,
    plan_ids,
    page_size = 10,
    page = 1,
    total_required = true,
  } = req.query;

  try {
    const accessToken = await getAccessToken();

    const params = {
      page_size,
      page,
      total_required,
    };

    if (product_id) params.product_id = product_id;
    if (plan_ids) params.plan_ids = plan_ids;

    const response = await axios.get(`${PAYPAL_API}/v1/billing/plans`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      params,
    });

    res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({
      error: true,
      message: error.response?.data || error.message,
    });
  }
});

app.patch("/plan/:planId", async (req, res) => {
  const { planId } = req.params;
  const patchBody = req.body;

  try {
    const accessToken = await getAccessToken();

    const response = await axios.patch(
      `${PAYPAL_API}/v1/billing/plans/${planId}`,
      patchBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Plan updated successfully.",
    });
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({
      error: true,
      message: error.response?.data || error.message,
    });
  }
});
// product_id: "p-1754467625"
app.post("/create-subscription", async (req, res) => {
  try {
    const accessToken = await getAccessToken();

    const subscriptionPayload = {
      plan_id: "P-6VU7597709697014PNCJRCRI", // Your actual plan_id
    start_time: new Date(Date.now() + 60 * 1000).toISOString(),

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

// subscription_id :I-WM1HK1M67JS0
// "plan_id": "P-6VU7597709697014PNCJRCRI"
app.get("/subscription/:subscription_id", async (req, res) => {
  const { subscription_id } = req.params;
  const { fields } = req.query; // e.g., last_failed_payment,plan

  try {
   
    const accessToken = await getAccessToken();
     console.log("Subscription ID:", subscription_id);
console.log("Access Token:", accessToken);
console.log("Requesting URL:", `${PAYPAL_API}/v1/billing/subscriptions/${subscription_id}`);
    const response = await axios.get(
      `${PAYPAL_API}/v1/billing/subscriptions/${subscription_id}`,
      {
        headers: {
          "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        params: fields ? { fields } : {},
      }
    );
    
    res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({
      error: true,
      message: error.response?.data || error.message,
    });
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

    const paypalResponse = await axios.post(
      `${PAYPAL_API}/v1/billing/subscriptions/${subscription_id}/cancel`,
      { reason: cancelReason },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ success: true, message: "Subscription cancelled successfully." , data: paypalResponse.data });
  } catch (error) {
    console.error("PayPal Subscription Cancel Error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

app.post("/paypal/webhook", async (req, res) => {
  const body = req.body;

  try {
    const pool = await poolPromise;

    await pool
      .request()
      .input("event_id", sql.VarChar, body.id)
      .input("event_type", sql.VarChar, body.event_type)
      .input("resource_type", sql.VarChar, body.resource_type)
      .input("subscription_id", sql.VarChar, body.resource?.id || null)
      .input("status", sql.VarChar, body.resource?.status || null)
      .input("raw_data", sql.NVarChar, JSON.stringify(body))
      .query(
        `INSERT INTO paypal_webhooks 
         (event_id, event_type, resource_type, subscription_id, status, raw_data) 
         VALUES (@event_id, @event_type, @resource_type, @subscription_id, @status, @raw_data)`
      );

    res.status(200).json({ success: true, message: "Webhook stored in DB." });
  } catch (err) {
    console.error("❌ Webhook DB Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});





