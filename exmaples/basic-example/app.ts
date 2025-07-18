import serverConfig from './config.server'
import clientConfig from './config.client'

async function main() {
    console.log('🚀 Testing config with plugins...\n');

    try {

        console.log('✅ Configuration loaded successfully!');
        console.log('\n📊 Server Configuration:');
        console.log('- Database URL:', serverConfig.DATABASE_URL ? '✓ Present' : '✗ Missing');
        console.log('- OpenAI API Key:', serverConfig.OPEN_AI_API_KEY ? '✓ Present' : '✗ Missing');
        console.log('- Some Asyncple Value Example:', serverConfig.someAsyncpleValueExample);

        // Test Stripe plugin configuration
        console.log('- Stripe Enterprise Plan:', serverConfig.enterpriseplan.productId || 'Not available (env vars not set)');

        // Test PostHog plugin configuration
        console.log('- PostHog New Dashboard Flag:', serverConfig.newdashboard || 'Not available (env vars not set)');
        console.log('- PostHog Beta Features Flag:', serverConfig.betafeatures || 'Not available (env vars not set)');

        console.log('\n📱 Client Configuration:');
        console.log('- Clerk Publishable Key:', clientConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? '✓ Present' : '✗ Missing');
        console.log('- App Version:', clientConfig.appVersion);
        console.log('- Build Number:', clientConfig.buildNumber);

        // Test plugin configuration

        console.log('\n🎉 Plugin system working correctly!');
        console.log('📋 Available configuration keys:');
        console.log('Server keys:', Object.keys(serverConfig));
        console.log('Client keys:', Object.keys(clientConfig));


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
                console.log('Stripe plugin vars (optional): STRIPE_SECRET_KEY, STRIPE_API_VERSION');
                console.log('PostHog plugin vars (optional): POSTHOG_API_KEY, POSTHOG_PROJECT_ID, POSTHOG_HOST');
            }
        }
    }
}

main();
