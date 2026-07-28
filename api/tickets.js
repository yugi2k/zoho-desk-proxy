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
    const tokenParams = new URLSearchParams({
      refresh_token: ZOHO_REFRESH_TOKEN,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token'
    });

    const tokenRes = await fetch(`https://accounts.${ZOHO_DOMAIN}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(`Token Error: ${JSON.stringify(tokenData)}`);
    }

    let allTickets = [];
    let from = 1;
    const limit = 100; 
    let hasMore = true;
    const maxTickets = 2000; 

    // YOUR CUSTOM STATUSES 
    const myStatuses = encodeURIComponent("Open,In Progress,Working on it,Pending,Review,Awaiting Response");

    while (hasMore && allTickets.length < maxTickets) {
      
      // FETCH URL USING YOUR CUSTOM STATUSES
      const ticketsRes = await fetch(`https://desk.${ZOHO_DOMAIN}/api/v1/tickets?include=assignee,departments&limit=${limit}&from=${from}&status=${myStatuses}`, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${tokenData.access_token}`,
          'orgId': ZOHO_ORG_ID
        }
      });

      const ticketsData = await ticketsRes.json();
      
      if (ticketsData.data && ticketsData.data.length > 0) {
        allTickets = allTickets.concat(ticketsData.data);
        if (ticketsData.data.length < limit) {
          hasMore = false; 
        } else {
          from += limit; 
        }
      } else {
        hasMore = false; 
      }
    }

    return res.status(200).json({ data: allTickets });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
