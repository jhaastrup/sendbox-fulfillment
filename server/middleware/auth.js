import { Shopify } from "@shopify/shopify-api";

import topLevelAuthRedirect from "../helpers/top-level-auth-redirect.js";
import { CarrierService, Fulfillment } from "@shopify/shopify-api/dist/rest-resources/2022-04/index.js";

 //Use mutation to register a fulfillment

 const registerFulfillment =  `mutation {
  fulfillmentServiceCreate(
    name: "Sendbox-Shipping", 
    trackingSupport: true, 
    callbackUrl:"/sendbox_callback/fulfillment_order_notification", 
    fulfillmentOrdersOptIn:true 
    inventoryManagement:true 
    ) {
    userErrors {
      message
    }
    fulfillmentService {
      id
      location {
          id
        }
    }
  }
}`;

export default function applyAuthMiddleware(app) {
  app.get("/auth", async (req, res) => {
    if (!req.signedCookies[app.get("top-level-oauth-cookie")]) {
      return res.redirect(
        `/auth/toplevel?${new URLSearchParams(req.query).toString()}`
      );
    }

    const redirectUrl = await Shopify.Auth.beginAuth(
      req,
      res,
      req.query.shop,
      "/auth/callback",
      app.get("use-online-tokens")
    );

    res.redirect(redirectUrl);
  });

  app.get("/auth/toplevel", (req, res) => {
    res.cookie(app.get("top-level-oauth-cookie"), "1", {
      signed: true,
      httpOnly: true,
      sameSite: "strict",
    });

    res.set("Content-Type", "text/html");

    res.send(
      topLevelAuthRedirect({
        apiKey: Shopify.Context.API_KEY,
        hostName: Shopify.Context.HOST_NAME,
        host: req.query.host,
        query: req.query,
      })
    );
  });

  app.get("/auth/callback", async (req, res) => {
    try {
      const session = await Shopify.Auth.validateAuthCallback(
        req,
        res,
        req.query
      );

      const host = req.query.host;
      app.set(
        "active-shopify-shops",
        Object.assign(app.get("active-shopify-shops"), {
          [session.shop]: session.scope,
        })
      );
      console.log(JSON.stringify(session));
      //try registeing the carrier service here 
      const carrier_service = new CarrierService({ session });
      carrier_service.name = "Sendbox Shipping";
      carrier_service.callback_url = "https://c50f-154-73-8-1.ngrok.io/shipping_callback";
      carrier_service.service_discovery = true;
      await carrier_service.save({});
      //end of what i am trying 

      //try registering order management app which is the fulfillment service here
        /* const fulfillment_service = new Fulfillment({session});
        fulfillment_service.name = "Sendbox Shipping";
        fulfillment_service.handle = "sendbox_shipping";
        fulfillment_service.callback_url = "/fulfillment_callback";
        fulfillment_service.requires_shipping_method = true; 
        fulfillment_service.tracking_support = true;
        await fulfillment_service.save({}); */

      //end of what i am trying 2

      //try this first

     
      
      // `session` is built as part of the OAuth process
      const client = new Shopify.Clients.Graphql(
        session.shop,
        session.accessToken
      );
      const fulfillment = await client.query({
        data: registerFulfillment,
      }); 
      console.log(JSON.stringify(fulfillment));
      


      const response = await Shopify.Webhooks.Registry.register({
        shop: session.shop,
        accessToken: session.accessToken,
        topic: "APP_UNINSTALLED",
        path: "/webhooks",
      });

      if (!response["APP_UNINSTALLED"].success) {
        console.log(
          `Failed to register APP_UNINSTALLED webhook: ${response.result}`
        );
      }

      // Redirect to app with shop parameter upon auth
      res.redirect(`/?shop=${session.shop}&host=${host}`);
    } catch (e) {
      switch (true) {
        case e instanceof Shopify.Errors.InvalidOAuthError:
          res.status(400);
          res.send(e.message);
          break;
        case e instanceof Shopify.Errors.CookieNotFound:
        case e instanceof Shopify.Errors.SessionNotFound:
          // This is likely because the OAuth session cookie expired before the merchant approved the request
          res.redirect(`/auth?shop=${req.query.shop}`);
          break;
        default:
          res.status(500);
          res.send(e.message);
          break;
      }
    }
  });
}
