export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended: boolean;
  ctaLabel: string;
  ctaHref: string;
}

export interface Testimonial {
  quote: string;
  customerName: string;
  restaurantName: string;
}

export const FEATURES: Feature[] = [
  {
    icon: 'Store',
    title: 'Multi-Restaurant Management',
    description: 'Manage menus across all your restaurant locations from a single dashboard.',
  },
  {
    icon: 'LayoutTemplate',
    title: 'Beautiful Menu Templates',
    description: 'Choose from Classic, Card Based, and Coraflow templates to match your brand.',
  },
  {
    icon: 'Languages',
    title: 'Multi-Language Support',
    description: 'Create menus in multiple languages to serve your diverse customer base.',
  },
  {
    icon: 'ShieldAlert',
    title: 'Allergen Management',
    description: 'Tag and display allergen information on every menu item for customer safety.',
  },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    features: [
      '1 restaurant',
      '1 menu template',
      'Basic allergen tags',
      'Single language',
    ],
    recommended: false,
    ctaLabel: 'Get Started',
    ctaHref: '/register',
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    features: [
      'Up to 5 restaurants',
      'All menu templates',
      'Full allergen management',
      'Multi-language support',
      'Priority support',
    ],
    recommended: true,
    ctaLabel: 'Get Started',
    ctaHref: '/register',
  },
  {
    name: 'Enterprise',
    price: '$79',
    period: '/month',
    features: [
      'Unlimited restaurants',
      'All menu templates',
      'Full allergen management',
      'Multi-language support',
      'Dedicated support',
      'Custom branding',
    ],
    recommended: false,
    ctaLabel: 'Get Started',
    ctaHref: '/register',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'MenuBuildr transformed how we manage our menus across three locations. Updates that used to take hours now take minutes.',
    customerName: 'Maria Santos',
    restaurantName: 'Bella Cucina',
  },
  {
    quote: 'The multi-language support is a game changer. Our international customers love being able to read the menu in their own language.',
    customerName: 'James Chen',
    restaurantName: 'Golden Dragon',
  },
  {
    quote: 'Allergen management alone made it worth switching. We feel confident our customers are safe and informed.',
    customerName: 'Sophie Laurent',
    restaurantName: 'Le Petit Bistro',
  },
];


