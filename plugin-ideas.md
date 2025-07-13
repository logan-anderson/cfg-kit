# Plugin Ideas for cfg-kit

This document contains ideas for future cfg-kit plugins, focusing on services where dashboard configuration is typically required and would benefit from config-as-code approaches.

## 📧 **Email Services**

### **`cfg-kit-sendgrid`** ⭐⭐⭐⭐⭐
Email templates, sender identities, API keys - all manual setup

```typescript
defineSendGridConfig({
  senderIdentities: [
    defineSenderIdentity({
      email: 'noreply@myapp.com',
      name: 'My App',
      city: 'San Francisco',
      country: 'US'
    })
  ],
  templates: [
    defineTemplate({
      name: 'welcome-email',
      subject: 'Welcome to {{company}}!',
      html: '<h1>Welcome {{first_name}}!</h1>',
      versions: ['v1', 'v2']
    })
  ],
  apiKeys: [
    defineApiKey({
      name: 'production-key',
      scopes: ['mail.send', 'templates.read']
    })
  ]
})
```

### **`cfg-kit-resend`** ⭐⭐⭐⭐
Domains, API keys, webhooks

```typescript
defineResendConfig({
  domains: [
    defineDomain({
      name: 'mail.myapp.com',
      region: 'us-east-1'
    })
  ],
  webhooks: [
    defineWebhook({
      endpoint: 'https://api.myapp.com/webhooks/resend',
      events: ['email.sent', 'email.delivered']
    })
  ]
})
```

## 📊 **Analytics Services**

### **`cfg-kit-mixpanel`** ⭐⭐⭐⭐⭐
Events, funnels, cohorts - tons of dashboard clicking

```typescript
defineMixpanelConfig({
  events: [
    defineEvent({
      name: 'user_signup',
      properties: {
        plan: 'string',
        source: 'string'
      }
    })
  ],
  funnels: [
    defineFunnel({
      name: 'Signup Funnel',
      steps: ['page_view', 'signup_start', 'signup_complete']
    })
  ],
  cohorts: [
    defineCohort({
      name: 'Power Users',
      definition: 'users who triggered "feature_used" > 10 times'
    })
  ]
})
```

### **`cfg-kit-amplitude`** ⭐⭐⭐⭐
Event schemas, user properties, charts

```typescript
defineAmplitudeConfig({
  events: [
    defineEvent({
      name: 'button_clicked',
      properties: {
        button_name: 'string',
        page: 'string'
      }
    })
  ],
  userProperties: [
    defineUserProperty({
      name: 'subscription_tier',
      type: 'string',
      values: ['free', 'pro', 'enterprise']
    })
  ]
})
```

## 🔍 **Search Services**

### **`cfg-kit-algolia`** ⭐⭐⭐⭐⭐
Indexes, rules, synonyms, API keys

```typescript
defineAlgoliaConfig({
  indexes: [
    defineIndex({
      name: 'products',
      searchableAttributes: ['title', 'description'],
      customRanking: ['desc(popularity)'],
      facets: ['category', 'brand']
    })
  ],
  rules: [
    defineRule({
      objectID: 'promote-sale-items',
      condition: { pattern: 'sale', anchoring: 'contains' },
      consequence: { promote: [{ objectID: 'sale-banner' }] }
    })
  ],
  synonyms: [
    defineSynonym({
      objectID: 'phone-synonyms',
      type: 'synonym',
      synonyms: ['phone', 'mobile', 'cell', 'smartphone']
    })
  ]
})
```

## 🎯 **Why These Services?**

These services are particularly well-suited for config-as-code because:

1. **Dashboard-Heavy Setup** - Require extensive clicking through web interfaces
2. **Environment Replication** - Hard to recreate configurations across dev/staging/prod
3. **Version Control** - No built-in way to track configuration changes
4. **Team Collaboration** - Difficult to share and review configuration changes
5. **Complex Configuration** - Multiple interconnected settings that are error-prone

## 🚀 **Implementation Priority**

Based on developer pain points and usage frequency:

1. **`cfg-kit-sendgrid`** - Email setup is required for most apps
2. **`cfg-kit-mixpanel`** - Event tracking setup is very manual
3. **`cfg-kit-algolia`** - Search configuration is complex and repetitive
4. **`cfg-kit-resend`** - Growing popularity, simpler than SendGrid
5. **`cfg-kit-amplitude`** - Popular analytics platform

## 📝 **Plugin Development Guidelines**

When implementing these plugins, follow the established patterns:

- **Create-only approach** - Don't update existing resources unless explicitly configured
- **Type-safe schemas** - Use Zod for validation
- **Environment variables** - Generate typed environment variables for resource IDs
- **Error handling** - Graceful handling of API failures
- **Documentation** - Comprehensive README with examples
- **Testing** - Include working examples in the basic-example app
