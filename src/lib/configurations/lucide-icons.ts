import type { Component } from 'svelte';

// Curated to ONLY the icons referenced by `categoryData` in categories.ts.
// Every additional icon here ships in the Cloudflare Worker bundle even if
// unused — keep this list minimal until we add a user-facing Lucide picker
// for vault/fund/template icons that needs a wider catalogue.

import Activity from '@lucide/svelte/icons/activity';
import Baby from '@lucide/svelte/icons/baby';
import Banknote from '@lucide/svelte/icons/banknote';
import BookOpen from '@lucide/svelte/icons/book-open';
import Bus from '@lucide/svelte/icons/bus';
import Car from '@lucide/svelte/icons/car';
import CarFront from '@lucide/svelte/icons/car-front';
import Cloud from '@lucide/svelte/icons/cloud';
import Coffee from '@lucide/svelte/icons/coffee';
import Coins from '@lucide/svelte/icons/coins';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Dumbbell from '@lucide/svelte/icons/dumbbell';
import Fuel from '@lucide/svelte/icons/fuel';
import Gift from '@lucide/svelte/icons/gift';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import HandHeart from '@lucide/svelte/icons/hand-heart';
import Headphones from '@lucide/svelte/icons/headphones';
import Heart from '@lucide/svelte/icons/heart';
import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
import House from '@lucide/svelte/icons/house';
import Landmark from '@lucide/svelte/icons/landmark';
import Laptop from '@lucide/svelte/icons/laptop';
import Leaf from '@lucide/svelte/icons/leaf';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import Mail from '@lucide/svelte/icons/mail';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
import Newspaper from '@lucide/svelte/icons/newspaper';
import Package from '@lucide/svelte/icons/package';
import Palette from '@lucide/svelte/icons/palette';
import ParkingCircle from '@lucide/svelte/icons/parking-circle';
import PartyPopper from '@lucide/svelte/icons/party-popper';
import PawPrint from '@lucide/svelte/icons/paw-print';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import Pill from '@lucide/svelte/icons/pill';
import Pizza from '@lucide/svelte/icons/pizza';
import Plane from '@lucide/svelte/icons/plane';
import Plug from '@lucide/svelte/icons/plug';
import Presentation from '@lucide/svelte/icons/presentation';
import Receipt from '@lucide/svelte/icons/receipt';
import Scale from '@lucide/svelte/icons/scale';
import School from '@lucide/svelte/icons/school';
import Scissors from '@lucide/svelte/icons/scissors';
import Shield from '@lucide/svelte/icons/shield';
import Shirt from '@lucide/svelte/icons/shirt';
import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
import Smartphone from '@lucide/svelte/icons/smartphone';
import Sofa from '@lucide/svelte/icons/sofa';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Stethoscope from '@lucide/svelte/icons/stethoscope';
import Ticket from '@lucide/svelte/icons/ticket';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Tv from '@lucide/svelte/icons/tv';
import Users from '@lucide/svelte/icons/users';
import Utensils from '@lucide/svelte/icons/utensils';
import Wallet from '@lucide/svelte/icons/wallet';
import Wifi from '@lucide/svelte/icons/wifi';
import Wine from '@lucide/svelte/icons/wine';
import Wrench from '@lucide/svelte/icons/wrench';

export type LucideIconMeta = {
    name: string;
    keywords?: string[];
    group: string;
    component: Component;
};

export const LUCIDE_ICONS = {
    // Money & Finance
    wallet: { name: 'Wallet', keywords: ['money', 'cash', 'spending'], group: 'Money & Finance', component: Wallet },
    banknote: { name: 'Banknote', keywords: ['money', 'cash', 'bill', 'loan'], group: 'Money & Finance', component: Banknote },
    'credit-card': { name: 'Credit Card', keywords: ['payment', 'card', 'debit'], group: 'Money & Finance', component: CreditCard },
    'piggy-bank': { name: 'Piggy Bank', keywords: ['savings', 'emergency'], group: 'Money & Finance', component: PiggyBank },
    landmark: { name: 'Bank', keywords: ['bank', 'loan', 'institution'], group: 'Money & Finance', component: Landmark },
    coins: { name: 'Coins', keywords: ['money', 'change', 'fees'], group: 'Money & Finance', component: Coins },
    receipt: { name: 'Receipt', keywords: ['bill', 'invoice', 'tax'], group: 'Money & Finance', component: Receipt },
    'trending-up': { name: 'Investment', keywords: ['stock', 'growth', 'invest'], group: 'Money & Finance', component: TrendingUp },
    scale: { name: 'Legal', keywords: ['law', 'legal', 'justice'], group: 'Money & Finance', component: Scale },

    // Housing & Utilities
    house: { name: 'House', keywords: ['home', 'rent', 'mortgage'], group: 'Housing', component: House },
    plug: { name: 'Plug', keywords: ['electricity', 'utility', 'accessories'], group: 'Housing', component: Plug },
    wifi: { name: 'Internet', keywords: ['internet', 'wifi', 'network'], group: 'Housing', component: Wifi },
    wrench: { name: 'Repair', keywords: ['maintenance', 'repair', 'service'], group: 'Housing', component: Wrench },
    sofa: { name: 'Furniture', keywords: ['furniture', 'sofa', 'home'], group: 'Housing', component: Sofa },
    sparkles: { name: 'Cleaning', keywords: ['cleaning', 'household'], group: 'Housing', component: Sparkles },
    lightbulb: { name: 'Smart Home', keywords: ['idea', 'electricity', 'smart home'], group: 'Housing', component: Lightbulb },

    // Transport
    car: { name: 'Car', keywords: ['vehicle', 'auto', 'transport'], group: 'Transport', component: Car },
    'car-front': { name: 'Vehicle', keywords: ['rideshare', 'taxi', 'car'], group: 'Transport', component: CarFront },
    fuel: { name: 'Fuel', keywords: ['gas', 'petrol', 'fuel'], group: 'Transport', component: Fuel },
    bus: { name: 'Bus', keywords: ['public', 'transit', 'bus'], group: 'Transport', component: Bus },
    'parking-circle': { name: 'Parking', keywords: ['parking', 'tolls', 'fees'], group: 'Transport', component: ParkingCircle },
    plane: { name: 'Travel', keywords: ['flight', 'travel', 'airplane'], group: 'Transport', component: Plane },

    // Food & Dining
    'shopping-cart': { name: 'Groceries', keywords: ['shopping', 'cart', 'groceries'], group: 'Food', component: ShoppingCart },
    utensils: { name: 'Dining', keywords: ['restaurant', 'food', 'meal'], group: 'Food', component: Utensils },
    coffee: { name: 'Coffee', keywords: ['coffee', 'cafe', 'snacks'], group: 'Food', component: Coffee },
    wine: { name: 'Drinks', keywords: ['alcohol', 'wine', 'beverage'], group: 'Food', component: Wine },
    pizza: { name: 'Delivery', keywords: ['fast food', 'pizza', 'delivery'], group: 'Food', component: Pizza },

    // Health & Wellness
    heart: { name: 'Heart', keywords: ['health', 'love', 'religious'], group: 'Health', component: Heart },
    stethoscope: { name: 'Medical', keywords: ['doctor', 'medical', 'checkup'], group: 'Health', component: Stethoscope },
    pill: { name: 'Pharmacy', keywords: ['medicine', 'pill', 'pharmacy'], group: 'Health', component: Pill },
    dumbbell: { name: 'Fitness', keywords: ['gym', 'fitness', 'workout'], group: 'Health', component: Dumbbell },
    leaf: { name: 'Wellness', keywords: ['natural', 'wellness', 'herbal'], group: 'Health', component: Leaf },
    activity: { name: 'Activity', keywords: ['pulse', 'sports', 'recreation'], group: 'Health', component: Activity },
    shield: { name: 'Insurance', keywords: ['insurance', 'protect', 'shield'], group: 'Health', component: Shield },

    // Education
    'graduation-cap': { name: 'Tuition', keywords: ['school', 'tuition', 'graduate'], group: 'Education', component: GraduationCap },
    'book-open': { name: 'Reading', keywords: ['reading', 'book', 'materials'], group: 'Education', component: BookOpen },
    presentation: { name: 'Workshop', keywords: ['presentation', 'workshop', 'courses'], group: 'Education', component: Presentation },

    // Subscriptions & Tech
    tv: { name: 'Streaming', keywords: ['tv', 'streaming', 'netflix'], group: 'Subscriptions', component: Tv },
    cloud: { name: 'Cloud', keywords: ['cloud', 'storage', 'service', 'software'], group: 'Subscriptions', component: Cloud },
    smartphone: { name: 'Mobile', keywords: ['phone', 'mobile', 'app'], group: 'Subscriptions', component: Smartphone },
    laptop: { name: 'Computer', keywords: ['software', 'computer', 'laptop'], group: 'Subscriptions', component: Laptop },
    headphones: { name: 'Audio', keywords: ['music', 'audio', 'headphones'], group: 'Subscriptions', component: Headphones },
    newspaper: { name: 'News', keywords: ['news', 'magazine', 'membership'], group: 'Subscriptions', component: Newspaper },

    // Family & Pets
    baby: { name: 'Baby', keywords: ['baby', 'child', 'infant'], group: 'Family', component: Baby },
    school: { name: 'School', keywords: ['school', 'education', 'building'], group: 'Family', component: School },
    users: { name: 'Family', keywords: ['family', 'people', 'group', 'outings'], group: 'Family', component: Users },
    'party-popper': { name: 'Celebration', keywords: ['party', 'celebration', 'kids activities'], group: 'Family', component: PartyPopper },
    gift: { name: 'Gift', keywords: ['gift', 'present', 'birthday'], group: 'Family', component: Gift },
    'paw-print': { name: 'Pet', keywords: ['pet', 'paw', 'animal'], group: 'Family', component: PawPrint },

    // Lifestyle
    palette: { name: 'Hobby', keywords: ['art', 'hobby', 'paint'], group: 'Lifestyle', component: Palette },
    ticket: { name: 'Tickets', keywords: ['ticket', 'event', 'entertainment'], group: 'Lifestyle', component: Ticket },

    // Shopping & Personal Care
    shirt: { name: 'Clothing', keywords: ['clothes', 'shirt', 'apparel'], group: 'Shopping', component: Shirt },
    scissors: { name: 'Salon', keywords: ['haircut', 'salon', 'personal care'], group: 'Shopping', component: Scissors },
    package: { name: 'Package', keywords: ['package', 'kids supplies', 'general'], group: 'Shopping', component: Package },

    // General
    mail: { name: 'Mail', keywords: ['mail', 'condolences', 'envelope'], group: 'General', component: Mail },
    'heart-handshake': { name: 'Donation', keywords: ['donation', 'charity', 'ngo'], group: 'General', component: HeartHandshake },
    'hand-heart': { name: 'Tip', keywords: ['tip', 'busker', 'spontaneous giving'], group: 'General', component: HandHeart },
    'more-horizontal': { name: 'Other', keywords: ['other', 'misc', 'more'], group: 'General', component: MoreHorizontal },
} as const satisfies Record<string, LucideIconMeta>;

export type LucideIconKey = keyof typeof LUCIDE_ICONS;

export const isLucideIconKey = (value: string): value is LucideIconKey =>
    Object.prototype.hasOwnProperty.call(LUCIDE_ICONS, value);

export const getLucideIcon = (key: string): Component | undefined =>
    isLucideIconKey(key) ? LUCIDE_ICONS[key].component : undefined;
