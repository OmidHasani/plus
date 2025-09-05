const https = require('https');
https.get("https://api.openai.com/v1/models", res => {
  console.log("✅ وضعیت:", res.statusCode);
}).on
