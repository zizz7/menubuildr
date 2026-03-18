export const APP_URL = 'https://app.menubuildr.com';
export const BASE_URL = 'https://menubuildr.com';

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
  role: string;
}

export interface HowItWorksStep {
  step: string;
  title: string;
  description: string;
}

export const FEATURES: Feature[] = [
  {
    icon: 'Store',
    title: 'Multi-Restaurant Management',
    description: 'Manage menus across all your locations from a single, unified dashboard.',
  },
  {
    icon: 'LayoutTemplate',
    title: 'Beautiful Templates',
    description: 'Choose from Classic, Card Based, and Coraflow templates to match your brand.',
  },
  {
    icon: 'Languages',
    title: 'Multi-Language Menus',
    description: 'Serve guests in 16+ languages with automatic and manual translations.',
  },
  {
    icon: 'ShieldAlert',
    title: 'Allergen Management',
    description: 'Tag and display allergen info on every item for complete customer safety.',
  },
  {
    icon: 'QrCode',
    title: 'QR Code Generation',
    description: 'Generate scannable QR codes that link directly to your digital menus.',
  },
  {
    icon: 'Palette',
    title: 'Custom Branding',
    description: 'Match your menu design to your restaurant brand with custom colors and fonts.',
  },
];

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    step: '01',
    title: 'Create Your Restaurant',
    description: 'Sign up and add your restaurant details in under two minutes.',
  },
  {
    step: '02',
    title: 'Build Your Menu',
    description: 'Add sections, items, prices, allergens, and translations with our intuitive editor.',
  },
  {
    step: '03',
    title: 'Publish & Share',
    description: 'Generate a beautiful digital menu and share it via QR code or direct link.',
  },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    features: [
      '1 restaurant',
      '1 menu template',
      'Basic allergen tags',
      'Single language',
      'QR code generation',
    ],
    recommended: false,
    ctaLabel: 'Start Free',
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
      'Custom branding',
    ],
    recommended: true,
    ctaLabel: 'Get Pro',
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
      'Dedicated account manager',
      'Custom branding',
      'API access',
    ],
    recommended: false,
    ctaLabel: 'Contact Us',
    ctaHref: '/register',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'MenuBuildr transformed how we manage our menus across three locations. Updates that used to take hours now take minutes.',
    customerName: 'Maria Santos',
    restaurantName: 'Bella Cucina',
    role: 'Owner',
  },
  {
    quote: 'The multi-language support is a game changer. Our international guests love reading the menu in their own language.',
    customerName: 'James Chen',
    restaurantName: 'Golden Dragon',
    role: 'General Manager',
  },
  {
    quote: 'Allergen management alone made it worth switching. We feel confident our customers are safe and informed.',
    customerName: 'Sophie Laurent',
    restaurantName: 'Le Petit Bistro',
    role: 'Head Chef',
  },
];

export const SOCIAL_PROOF = [
  '500+ restaurants',
  '10,000+ menus created',
  '16 languages supported',
  '99.9% uptime',
];

export const TEMPLATES = [
  {
    name: 'Classic',
    description: 'Timeless elegance with clean typography and structured layouts.',
    image: '/template-previews/classic-preview.svg',
  },
  {
    name: 'Card Based',
    description: 'Modern card layout with rich visuals and smooth interactions.',
    image: '/template-previews/card-based-preview.svg',
  },
  {
    name: 'Coraflow',
    description: 'Contemporary flowing design with bold colors and dynamic sections.',
    image: '/template-previews/coraflow-preview.svg',
  },
];
