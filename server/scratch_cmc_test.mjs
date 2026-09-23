import axios from 'axios';
import https from 'https';
import dns from 'dns';

const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

const customLookup = (hostname, options, callback) => {
  if (typeof options === 'function') { callback = options; options = {}; }
  resolver.resolve4(hostname, (err, addresses) => {
    if (err || !addresses?.length) return dns.lookup(hostname, options, callback);
    if (options?.all) return callback(null, addresses.map(a => ({ address: a, family: 4 })));
    callback(null, addresses[0], 4);
  });
};

const agent = new https.Agent({ lookup: customLookup });
const CMC_KEY = 'd2683cef7721413696432d6b7e771a32';

try {
  const res = await axios.get(
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
    {
      headers: { 'X-CMC_PRO_API_KEY': CMC_KEY },
      params: { symbol: 'BTC' },
      timeout: 12000,
      httpsAgent: agent,
    }
  );
  console.log('✅ SUCCESS:', JSON.stringify(res.data?.data?.BTC?.quote?.USD, null, 2));
} catch (err) {
  console.error('❌ Status:', err.response?.status);
  console.error('❌ Error body:', JSON.stringify(err.response?.data, null, 2));
  console.error('❌ Message:', err.message);
}
