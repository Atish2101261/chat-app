const https = require('https');

const siteId = '8a572f34-7ac6-47dd-ba01-90a1fa76dc5b';
const token = process.argv[2];

if (!token) {
    console.error('No token provided');
    process.exit(1);
}

const updateSite = () => {
    const data = JSON.stringify({
        build_settings: {
            provider: 'github',
            repo_path: 'Atish2101261/chat-app',
            repo_url: 'https://github.com/Atish2101261/chat-app',
            repo_branch: 'main'
        }
    });

    const options = {
        hostname: 'api.netlify.com',
        port: 443,
        path: `/api/v1/sites/${siteId}`,
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'Authorization': `Bearer ${token}`
        }
    };

    const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('✅ Successfully updated Netlify site repository settings!');
                console.log('Response:', responseData);
            } else {
                console.error(`❌ Failed to update site. Status: ${res.statusCode}`);
                console.error('Response:', responseData);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Request error:', error.message);
    });

    req.write(data);
    req.end();
};

updateSite();
