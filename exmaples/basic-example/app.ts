import config from './config';

async function main() {
    console.log('🚀 Testing config with plugins...\n');

    try {
        const resolvedConfig = await config;

        console.log('✅ Configuration loaded successfully!');
        console.log('\n📊 Server Configuration:');
        console.log('- Database URL:', resolvedConfig.server.DATABASE_URL ? '✓ Present' : '✗ Missing');
        console.log('- OpenAI API Key:', resolvedConfig.server.OPEN_AI_API_KEY ? '✓ Present' : '✗ Missing');
        console.log('- Stripe Product ID:', resolvedConfig.server.stripeProductId);

        // Test plugin configuration
        console.log('- Stripe Config from Plugin:', resolvedConfig.server.stripeConfig || 'Not available (env vars not set)');

        console.log('\n📱 Client Configuration:');
        console.log('- Clerk Publishable Key:', resolvedConfig.client.PUBLIC_CLERK_PUBLISHABLE_KEY ? '✓ Present' : '✗ Missing');
        console.log('- App Version:', resolvedConfig.client.appVersion);
        console.log('- Build Number:', resolvedConfig.client.buildNumber);

        // Test plugin configuration
        console.log('- Stripe Publishable Key from Plugin:', resolvedConfig.client.stripePublishableKey || 'Not available (env vars not set)');

        console.log('\n🎉 Plugin system working correctly!');
        console.log('📋 Available configuration keys:');
        console.log('Server keys:', Object.keys(resolvedConfig.server));
        console.log('Client keys:', Object.keys(resolvedConfig.client));

    } catch (error) {
        console.error('❌ Configuration error:', error);

        // Show detailed error information
        if (error instanceof Error) {
            console.error('Error message:', error.message);

            // If it's an env validation error, provide helpful info
            if (error.message.includes('validation failed')) {
                console.log('\n💡 Tip: Make sure to set the required environment variables:');
                console.log('Required server vars: DATABASE_URL, OPEN_AI_API_KEY');
                console.log('Required client vars: PUBLIC_CLERK_PUBLISHABLE_KEY');
                console.log('Plugin vars (optional): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PUBLIC_STRIPE_PUBLISHABLE_KEY');
            }
        }
    }
}

main();
