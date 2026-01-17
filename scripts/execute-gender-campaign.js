
async function run() {
    try {
        console.log('🚀 Starting Gender Update Campaign request...');
        const response = await fetch(
            'https://us-central1-tucitasegura-129cc.cloudfunctions.net/sendGenderUpdateCampaign',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secret: 'GENDER_UPDATE_2026',
                    dryRun: false // Set to true for test
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Success:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Error request:', error.message);
    }
}

run();
