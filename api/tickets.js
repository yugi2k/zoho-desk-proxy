export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const {
    ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN,
    ZOHO_ORG_ID,
    ZOHO_DOMAIN = 'zoho.com'
  } = process.env;

  try {
    // 1. Fetch fresh Access Token
    const tokenParams = new URLSearchParams({
      refresh_token: ZOHO_REFRESH_TOKEN,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token'
    });

    const ticketsRes = await fetch(`https://desk.${ZOHO_DOMAIN}/api/v1/tickets?include=assignee,departments&limit=${limit}&from=${from}&status=Open, In Progress, Working on it, Pending, Review, Awaiting Response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(`Token Error: ${JSON.stringify(tokenData)}`);
    }

    // 2. Loop through pages to get ALL tickets
    let allTickets = [];
    let from = 1;
    const limit = 100;
    let hasMore = true;
    const maxTickets = 2000; // Safety stop to prevent Vercel timeouts

    while (hasMore && allTickets.length < maxTickets) {
      const ticketsRes = await fetch(`https://desk.${ZOHO_DOMAIN}/api/v1/tickets?include=assignee,departments&limit=${limit}&from=${from}`, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${tokenData.access_token}`,
          'orgId': ZOHO_ORG_ID
        }
      });

      const ticketsData = await ticketsRes.json();
      
      // If we got data, add it to our massive list
      if (ticketsData.data && ticketsData.data.length > 0) {
        allTickets = allTickets.concat(ticketsData.data);
        
        // If Zoho returns less than 100, we've reached the last page!
        if (ticketsData.data.length < limit) {
          hasMore = false; 
        } else {
          // Otherwise, move to the next page of 100
          from += limit; 
        }
      } else {
        hasMore = false; 
      }
    }

    // Send the combined list of all tickets back to the HTML dashboard
    return res.status(200).json({ data: allTickets });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
