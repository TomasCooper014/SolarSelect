// Which region a lead belongs to, by postcode. First match wins. Each region can go to its own Pipedrive lead owner (leave ownerId null for Sarina), and names the retailer that bought it. Postcode ranges are inclusive. Replace the examples with your real regions.
export default {
  "regions": [
    {
      "id": "seq",
      "name": "South-east Queensland",
      "retailer": "Retailer A",
      "postcodes": [
        "4000-4299",
        "4300-4399",
        "4500-4579"
      ],
      "pipedrive": {
        "ownerId": null
      }
    },
    {
      "id": "sydney",
      "name": "Greater Sydney",
      "retailer": "Retailer B",
      "postcodes": [
        "2000-2234",
        "2555-2574",
        "2740-2786"
      ],
      "pipedrive": {
        "ownerId": null
      }
    }
  ],
  "fallback": {
    "id": "unassigned",
    "name": "Unassigned",
    "retailer": null,
    "pipedrive": {
      "ownerId": null
    }
  }
};
