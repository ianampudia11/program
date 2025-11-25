import { storage } from './storage.js';

const englishTranslations = {
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.create': 'Create',
  'common.update': 'Update',
  'common.loading': 'Loading...',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.export': 'Export',
  'common.import': 'Import',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.previous': 'Previous',
  'common.submit': 'Submit',
  'common.confirm': 'Confirm',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.ok': 'OK',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.warning': 'Warning',
  'common.info': 'Information',

  'nav.dashboard': 'Dashboard',
  'nav.inbox': 'Inbox',
  'nav.contacts': 'Contacts',
  'nav.flows': 'Flows',
  'nav.analytics': 'Analytics',
  'nav.settings': 'Settings',
  'nav.profile': 'Profile',
  'nav.calendar': 'Calendar',
  'nav.pipeline': 'Pipeline',
  'nav.campaigns': 'Campaigns',

  'admin.nav.dashboard': 'Admin Dashboard',
  'admin.nav.companies': 'Companies',
  'admin.nav.users': 'Users',
  'admin.nav.plans': 'Plans',
  'admin.nav.analytics': 'Analytics',
  'admin.nav.settings': 'Settings',
  'admin.nav.translations': 'Translations',

  'auth.login': 'Login',
  'auth.register': 'Register',
  'auth.logout': 'Logout',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.confirm_password': 'Confirm Password',
  'auth.forgot_password': 'Forgot Password?',
  'auth.remember_me': 'Remember me',
  'auth.login_button': 'Sign In',
  'auth.register_button': 'Create Account',
  'auth.logging_in': 'Logging in...',
  'auth.creating_account': 'Creating account...',
  'auth.invalid_credentials': 'Invalid email or password',
  'auth.registration_success': 'Account created successfully',
  'auth.login_success': 'Welcome back!',


  'landing.nav.features': 'Features',
  'landing.nav.pricing': 'Pricing',
  'landing.nav.about': 'About',
  'landing.nav.contact': 'Contact',
  'landing.nav.sign_in': 'Sign In',
  'landing.nav.get_started': 'Get Started',

  'landing.hero.title': 'Ready to transform your customer communication?',
  'landing.hero.subtitle': 'Join thousands of businesses using PowerChat to streamline their customer interactions and boost satisfaction rates.',
  'landing.hero.start_free_trial': 'Start Free Trial',
  'landing.hero.sign_in': 'Sign In',

  'landing.trust.enterprise_security': 'Enterprise Security',
  'landing.trust.uptime': '99.9% Uptime',
  'landing.trust.soc2_compliant': 'SOC 2 Compliant',

  'landing.features.title': 'Everything you need to succeed',
  'landing.features.subtitle': 'Powerful features designed to help you manage customer communications effectively.',
  'landing.features.unified_inbox.title': 'Unified Inbox',
  'landing.features.unified_inbox.description': 'Manage all your customer conversations from WhatsApp, Email, and more in one place.',
  'landing.features.smart_automation.title': 'Smart Automation',
  'landing.features.smart_automation.description': 'Create intelligent workflows that respond to customers instantly, 24/7.',
  'landing.features.team_collaboration.title': 'Team Collaboration',
  'landing.features.team_collaboration.description': 'Work together seamlessly with internal notes, assignments, and real-time updates.',
  'landing.features.analytics.title': 'Advanced Analytics',
  'landing.features.analytics.description': 'Track performance, measure satisfaction, and optimize your customer service.',
  'landing.features.integrations.title': 'Powerful Integrations',
  'landing.features.integrations.description': 'Connect with your favorite tools and platforms for a seamless workflow.',
  'landing.features.ai_assistant.title': 'AI Assistant',
  'landing.features.ai_assistant.description': 'Get intelligent suggestions and automate responses with our built-in AI.',

  'landing.pricing.title': 'Simple, transparent pricing',
  'landing.pricing.subtitle': 'Choose the perfect plan for your business. Start free, upgrade when you need more.',
  'landing.pricing.loading': 'Loading pricing plans...',
  'landing.pricing.error': 'Failed to load pricing plans',
  'landing.pricing.retry': 'Retry',
  'landing.pricing.most_popular': 'Most Popular',
  'landing.pricing.per_month': 'per month',
  'landing.pricing.forever': 'forever',
  'landing.pricing.free': 'Free',
  'landing.pricing.get_started_free': 'Get Started Free',
  'landing.pricing.start_trial': 'Start {{days}}-Day Free Trial',
  'landing.pricing.get_started': 'Get Started',
  'landing.pricing.users': 'Up to {{count}} users',
  'landing.pricing.contacts': '{{count}} contacts',
  'landing.pricing.channels': '{{count}} channels',
  'landing.pricing.flows': '{{count}} flows',

  'landing.cta.title': 'Ready to transform your customer communication?',
  'landing.cta.subtitle': 'Join thousands of businesses using PowerChat to streamline their customer interactions and boost satisfaction rates.',
  'landing.cta.start_free_trial': 'Start Free Trial',
  'landing.cta.sign_in': 'Sign In',

  'landing.footer.product': 'Product',
  'landing.footer.features': 'Features',
  'landing.footer.pricing': 'Pricing',
  'landing.footer.integrations': 'Integrations',
  'landing.footer.api': 'API',
  'landing.footer.company': 'Company',
  'landing.footer.about': 'About',
  'landing.footer.blog': 'Blog',
  'landing.footer.careers': 'Careers',
  'landing.footer.contact': 'Contact',
  'landing.footer.support': 'Support',
  'landing.footer.help_center': 'Help Center',
  'landing.footer.documentation': 'Documentation',
  'landing.footer.community': 'Community',
  'landing.footer.status': 'Status',
  'landing.footer.legal': 'Legal',
  'landing.footer.privacy': 'Privacy Policy',
  'landing.footer.terms': 'Terms of Service',
  'landing.footer.cookies': 'Cookie Policy',
  'landing.footer.rights_reserved': 'All rights reserved.',


  'landing.features.title': 'Everything you need to succeed',
  'landing.features.subtitle': 'Powerful features designed to help you manage customer communications effectively.',
  'landing.features.unified_inbox.title': 'Unified Inbox',
  'landing.features.unified_inbox.description': 'Manage all your customer conversations from WhatsApp, Email, and more in one place.',
  'landing.features.smart_automation.title': 'Smart Automation',
  'landing.features.smart_automation.description': 'Create intelligent workflows that respond to customers instantly, 24/7.',
  'landing.features.team_collaboration.title': 'Team Collaboration',
  'landing.features.team_collaboration.description': 'Work together seamlessly with internal notes, assignments, and real-time updates.',
  'landing.features.analytics.title': 'Advanced Analytics',
  'landing.features.analytics.description': 'Track performance, measure satisfaction, and optimize your customer service.',
  'landing.features.integrations.title': 'Powerful Integrations',
  'landing.features.integrations.description': 'Connect with your favorite tools and platforms for a seamless workflow.',
  'landing.features.ai_assistant.title': 'AI Assistant',
  'landing.features.ai_assistant.description': 'Get intelligent suggestions and automate responses with our built-in AI.',

  'admin.settings.title': 'Admin Settings',
  'admin.settings.general': 'General Settings',
  'admin.settings.branding': 'Application Branding',
  'admin.settings.branding_description': 'Customize the appearance of your application',
  'admin.settings.app_name': 'Application Name',
  'admin.settings.primary_color': 'Primary Color',
  'admin.settings.secondary_color': 'Secondary Color',
  'admin.settings.save_branding': 'Save Branding Settings',
  'admin.settings.payment_gateways': 'Payment Gateways',
  'admin.settings.stripe': 'Stripe Settings',
  'admin.settings.mercado_pago': 'Mercado Pago Settings',
  'admin.settings.paypal': 'PayPal Settings',
  'admin.settings.bank_transfer': 'Bank Transfer Settings',
  'admin.settings.save_stripe': 'Save Stripe Settings',
  'admin.settings.save_mercado_pago': 'Save Mercado Pago Settings',
  'admin.settings.save_paypal': 'Save PayPal Settings',
  'admin.settings.save_bank_transfer': 'Save Bank Transfer Settings',
  'admin.settings.save_general': 'Save General Settings',

  'companies.title': 'Companies',
  'companies.new': 'New Company',
  'companies.edit': 'Edit Company',
  'companies.name': 'Company Name',
  'companies.email': 'Email',
  'companies.plan': 'Plan',
  'companies.status': 'Status',
  'companies.created': 'Created',
  'companies.actions': 'Actions',
  'companies.save_changes': 'Save Changes',
  'companies.saving': 'Saving...',

  'users.title': 'Users',
  'users.new': 'New User',
  'users.edit': 'Edit User',
  'users.name': 'Name',
  'users.email': 'Email',
  'users.role': 'Role',
  'users.company': 'Company',
  'users.status': 'Status',
  'users.created': 'Created',
  'users.actions': 'Actions',

  'plans.title': 'Plans',
  'plans.new': 'New Plan',
  'plans.edit': 'Edit Plan',
  'plans.name': 'Plan Name',
  'plans.price': 'Price',
  'plans.features': 'Features',
  'plans.active': 'Active',
  'plans.create_plan': 'Create Plan',
  'plans.update_plan': 'Update Plan',
  'plans.add_feature': 'Add Feature',
  'plans.creating': 'Creating...',
  'plans.updating': 'Updating...',


  'admin.affiliate.title': 'Affiliate Management',
  'admin.affiliate.description': 'Manage affiliate partners, track referrals, and process payouts',
  'admin.affiliate.dashboard.title': 'Dashboard',
  'admin.affiliate.dashboard.short': 'Dashboard',
  'admin.affiliate.affiliates.title': 'Affiliates',
  'admin.affiliate.affiliates.short': 'Affiliates',
  'admin.affiliate.referrals.title': 'Referrals',
  'admin.affiliate.referrals.short': 'Referrals',
  'admin.affiliate.payouts.title': 'Payouts',
  'admin.affiliate.payouts.short': 'Payouts',


  'admin.affiliate.metrics.total_affiliates': 'Total Affiliates',
  'admin.affiliate.metrics.active': 'Active',
  'admin.affiliate.metrics.total_referrals': 'Total Referrals',
  'admin.affiliate.metrics.conversion_rate': 'conversion rate',
  'admin.affiliate.metrics.total_commission': 'Total Commission',
  'admin.affiliate.metrics.from_conversions': 'From {{count}} conversions',
  'admin.affiliate.metrics.pending_payouts': 'Pending Payouts',
  'admin.affiliate.metrics.pending_requests': 'pending requests',


  'admin.affiliate.status.active': 'Active',
  'admin.affiliate.status.pending': 'Pending',
  'admin.affiliate.status.suspended': 'Suspended',
  'admin.affiliate.status.rejected': 'Rejected',


  'admin.affiliate.actions.view_details': 'View Details',
  'admin.affiliate.actions.view': 'View',
  'admin.affiliate.actions.edit_affiliate': 'Edit Affiliate',
  'admin.affiliate.actions.edit': 'Edit',


  'admin.affiliate.create.button': 'Add Affiliate',
  'admin.affiliate.create.short': 'Add',
  'admin.affiliate.create.title': 'Add New Affiliate',
  'admin.affiliate.create.description': 'Create a new affiliate partner account',
  'admin.affiliate.create.success': 'Affiliate created successfully',
  'admin.affiliate.create.submit': 'Create Affiliate',
  'admin.affiliate.edit.title': 'Edit Affiliate',
  'admin.affiliate.edit.description': 'Update affiliate partner information',
  'admin.affiliate.edit.submit': 'Update Affiliate',
  'admin.affiliate.update.success': 'Affiliate updated successfully',
  'admin.affiliate.view.title': 'Affiliate Details',
  'admin.affiliate.view.basic_info': 'Basic Information',
  'admin.affiliate.view.performance': 'Performance',
  'admin.affiliate.view.commission_settings': 'Commission Settings',


  'admin.affiliate.form.name': 'Full Name',
  'admin.affiliate.form.email': 'Email Address',
  'admin.affiliate.form.phone': 'Phone Number',
  'admin.affiliate.form.website': 'Website',
  'admin.affiliate.form.business_name': 'Business Name',
  'admin.affiliate.form.commission_rate': 'Commission Rate',
  'admin.affiliate.form.commission_type': 'Commission Type',
  'admin.affiliate.form.notes': 'Notes',


  'admin.affiliate.commission_type.percentage': 'Percentage',
  'admin.affiliate.commission_type.fixed': 'Fixed Amount',
  'admin.affiliate.commission_type.tiered': 'Tiered',


  'admin.affiliate.affiliates.table.code': 'Code',
  'admin.affiliate.affiliates.table.name': 'Name',
  'admin.affiliate.affiliates.table.email': 'Email',
  'admin.affiliate.affiliates.table.status': 'Status',
  'admin.affiliate.affiliates.table.referrals': 'Referrals',
  'admin.affiliate.affiliates.table.earnings': 'Earnings',
  'admin.affiliate.affiliates.table.commission': 'Commission',
  'admin.affiliate.affiliates.table.joined': 'Joined',
  'admin.affiliate.affiliates.table.actions': 'Actions',


  'admin.affiliate.affiliates.search_placeholder': 'Search affiliates...',
  'admin.affiliate.affiliates.filter.all_statuses': 'All Statuses',


  'admin.affiliate.referrals.table.code': 'Referral Code',
  'admin.affiliate.referrals.table.affiliate': 'Affiliate',
  'admin.affiliate.referrals.table.referred_email': 'Referred Email',
  'admin.affiliate.referrals.table.status': 'Status',
  'admin.affiliate.referrals.table.value': 'Value',
  'admin.affiliate.referrals.table.commission': 'Commission',
  'admin.affiliate.referrals.table.date': 'Date',


  'admin.affiliate.referrals.status.pending': 'Pending',
  'admin.affiliate.referrals.status.converted': 'Converted',
  'admin.affiliate.referrals.status.expired': 'Expired',
  'admin.affiliate.referrals.status.cancelled': 'Cancelled',


  'admin.affiliate.payouts.table.affiliate': 'Affiliate',
  'admin.affiliate.payouts.table.amount': 'Amount',
  'admin.affiliate.payouts.table.status': 'Status',
  'admin.affiliate.payouts.table.method': 'Method',
  'admin.affiliate.payouts.table.period': 'Period',
  'admin.affiliate.payouts.table.processed': 'Processed',


  'admin.affiliate.payouts.status.pending': 'Pending',
  'admin.affiliate.payouts.status.processing': 'Processing',
  'admin.affiliate.payouts.status.completed': 'Completed',
  'admin.affiliate.payouts.status.failed': 'Failed',
  'admin.affiliate.payouts.status.cancelled': 'Cancelled',


  'admin.affiliate.export.button': 'Export Data',
  'admin.affiliate.export.short': 'Export',
  'admin.affiliate.pagination.showing': 'Showing',
  'admin.affiliate.pagination.to': 'to',
  'admin.affiliate.pagination.of': 'of',
  'admin.affiliate.pagination.records': 'records',
  'admin.affiliate.pagination.page': 'Page',
  'admin.affiliate.pagination.previous': 'Previous',
  'admin.affiliate.pagination.next': 'Next',


  'admin.affiliate.overview.title': 'Affiliate Overview',

  'translations.title': 'Translations',
  'translations.add_key': 'Add Translation Key',
  'translations.export': 'Export Translations',
  'translations.import': 'Import Translations',
  'translations.language': 'Language',
  'translations.namespace': 'Namespace',
  'translations.key': 'Key',
  'translations.value': 'Value',
  'translations.create_key': 'Create Key',
  'translations.update_namespace': 'Update Namespace',
  'translations.creating': 'Creating...',
  'translations.updating': 'Updating...',
  'translations.importing': 'Importing...',

  'language_switcher.select_language': 'Select language',

  'messages.success.saved': 'Settings saved successfully',
  'messages.success.created': 'Created successfully',
  'messages.success.updated': 'Updated successfully',
  'messages.success.deleted': 'Deleted successfully',
  'messages.error.save_failed': 'Failed to save settings',
  'messages.error.create_failed': 'Failed to create',
  'messages.error.update_failed': 'Failed to update',
  'messages.error.delete_failed': 'Failed to delete',
  'messages.error.load_failed': 'Failed to load data',
};

async function initializeTranslations() {
  try {

    let englishLanguage = await storage.getLanguageByCode('en');

    if (!englishLanguage) {
      englishLanguage = await storage.createLanguage({
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flagIcon: '🇺🇸',
        isActive: true,
        isDefault: true,
        direction: 'ltr'
      });
    }

    let defaultNamespace = await storage.getNamespaceByName('default');

    if (!defaultNamespace) {
      defaultNamespace = await storage.createNamespace({
        name: 'default',
        description: 'Default namespace for application translations'
      });
    }


    for (const [key, value] of Object.entries(englishTranslations)) {
      try {
        const existingKey = await storage.getKeyByNameAndKey(defaultNamespace.id, key);

        let translationKey;
        if (!existingKey) {
          translationKey = await storage.createKey({
            namespaceId: defaultNamespace.id,
            key: key,
            description: `Translation key for ${key}`
          });
        } else {
          translationKey = existingKey;
        }

        const existingTranslation = await storage.getTranslationByKeyAndLanguage(
          translationKey.id,
          englishLanguage.id
        );

        if (!existingTranslation) {
          await storage.createTranslation({
            keyId: translationKey.id,
            languageId: englishLanguage.id,
            value: value
          });
        } else {
        }
      } catch (error) {
        console.error(`Error adding translation for key ${key}:`, error);
      }
    }

  } catch (error) {
    console.error('Error initializing translations:', error);
  }
}

initializeTranslations();
