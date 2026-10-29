// Pipedrive account settings for Ghost Sales Agency (blackdiamondsolar.pipedrive.com),
// read from the account on 29 October 2026. These are IDs, not secrets; the API token stays in Netlify.
export default {
  // Website enquiries land in the Leads Inbox, like WHY Solar's, and are converted to deals once booked
  defaultOwnerId: 24411857, // Sarina

  // Existing deal/lead custom fields this site fills in
  fields: {
    siteAddress: "c3c8000e0c884d67b7ec64102cd1c107203d2c64", // Site Address
    postCode: "ce86ffc1ca697b9d523f38f0f5f8e48af5d013b4",    // Post Code
    homeOwner: "476331081e7189578c6f45eaa2381786d93d3b54",   // Home Owner (enum)
    billSize: "dc92cddacb32148e1a4cb8d155e3e47d2aa77365",    // Electricity Bill Size
    campaign: "090a33b5ed168933692e2e22d4fd943061b5cd8d",    // Campaign
    leadSource: "40acdaf1f71366186f6b66df438b049224afd745",  // Lead Source (enum)
    adSource: "31fbb0788838940c7b0781ddd8d772102ba433b2",    // Ad source
    landingPage: "ffab1dd609a542239e59119bd90de4cbdd1abcf8", // Landing page
    adSetName: "918261c8792c64065ccc64a85ac21feeccb19339",   // Ad set name
    adName: "7f18a2f4f5568698e8ede5db6a3c160509caf602"       // Ad name
  },

  // Option IDs for enum fields
  options: {
    homeOwnerOwn: 163,
    leadSourceFacebook: 47,
    leadSourceWebsite: 60
  }
};
