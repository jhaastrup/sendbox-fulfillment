import { Shopify, ApiVersion } from "@shopify/shopify-api";
import axios from 'axios';
import verifyRequest from "./verify-request.js";
import pkg from '@apollo/client';

//const { gql, useMutation } = pkg;

export default function createNewCarrier(app) {
  //first do the callback that shopify will post shipping details to
  app.post("/shipping_callback", async (req, res) => {
    const data = req.body;
    const dd = JSON.stringify(data)
     console.log(dd);
    //pull out items 
    const items = data.rate.items.map((item)=>({
         name:item.name,
         quantity:item.quantity,
         value:item.price, 
         weight:item.grams
    }))
    //console.log(items)

    //calculate total weight of items
    let total_weight = 0;

    for (let i = 0; i < items.length; i++) {
      total_weight += items[i].weight;
    }
    const weight = total_weight/1000

    console.log(weight);
   

    //console.log(total_weight);

    //build the payload you will then post

    const quotesPayload = {
         //origin_name: data.rate.origin.name,
         origin_name: "Customer X",  
         origin_country:"Nigeria",
         origin_state: "Lagos",
         origin_city:data.rate.origin.city, 
         origin_street: data.rate.origin.address1,
         //origin_phone: '',
        // origin_phone: data.rate.origin.phone,

         destination_name: data.rate.destination.name,
         destination_country: "Nigeria",
         destination_state: "Lagos",
         destination_city: data.rate.destination.city, 
         destination_street: data.rate.destination.address1,
         //destination_phone: data.rate.destination.phone,
         //destination_phone: null,
         weight:weight,
         items:items
    }
    //console.log({quotesPayload});

    try {
        const {data} = await axios.post("https://live.sendbox.co/shipping/shipment_delivery_quote", quotesPayload, {
            headers:{
                "Authorization":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1aWQiOiI1ZDBkNmRlODZkNWVlYTAwMDExMTQ2NjkiLCJhaWQiOiI2MjA3YTZiNzI0NmJmNzAwMWJhODFkZjQiLCJ0d29fZmEiOmZhbHNlLCJpbnN0YW5jZV9pZCI6IjYxMzZkZmE2YTFhYjlkMzE4YmNmY2I5NCIsImlzcyI6InNlbmRib3guYXBwcy5hdXRoLTYxMzZkZmE2YTFhYjlkMzE4YmNmY2I5NCIsImV4cCI6MTY2MTYzODM0MX0.B-PgeofFQQKtXusu05HskTZD0B3RmdjTaj-kf3VwjeY", 
                "Content-type": "application/json",
            }
        });
       // console.log(data); 

        //finially send the response RATES to shopify in an array of objects

         const rates = data.rates.map((rate)=>({
          service_name: "Sendbox-Shipping",
          description: `Delivery ${rate.delivery_window}`,
          service_code:rate.key,
          currency: rate.currency, 
          total_price:rate.fee * 100

        }))
        res.json({rates:rates});
        //console.log(rates);
     
    } catch (error) {
        console.log(error);
    }

  });

  app.post("/sendbox_callback/fulfillment_order_notification", async(req, res) =>{
     const data = req.body
     console.log({data});
    res.status(200).send("working");
  })



  //lets try first

  app.get("/home", async (req, res) => {
    res.send("You are on Shopify side");
  }); 
}
