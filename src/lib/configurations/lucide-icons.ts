import type { Component } from 'svelte';

// Money & Finance
import Wallet from '@lucide/svelte/icons/wallet';
import Banknote from '@lucide/svelte/icons/banknote';
import CreditCard from '@lucide/svelte/icons/credit-card';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import Landmark from '@lucide/svelte/icons/landmark';
import Coins from '@lucide/svelte/icons/coins';
import HandCoins from '@lucide/svelte/icons/hand-coins';
import Receipt from '@lucide/svelte/icons/receipt';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import Scale from '@lucide/svelte/icons/scale';
import FileText from '@lucide/svelte/icons/file-text';

// Housing & Utilities
import House from '@lucide/svelte/icons/house';
import Building from '@lucide/svelte/icons/building';
import Plug from '@lucide/svelte/icons/plug';
import Droplets from '@lucide/svelte/icons/droplets';
import Flame from '@lucide/svelte/icons/flame';
import Wifi from '@lucide/svelte/icons/wifi';
import Wrench from '@lucide/svelte/icons/wrench';
import Sofa from '@lucide/svelte/icons/sofa';
import Sprout from '@lucide/svelte/icons/sprout';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Lock from '@lucide/svelte/icons/lock';
import Lightbulb from '@lucide/svelte/icons/lightbulb';

// Transport
import Car from '@lucide/svelte/icons/car';
import CarFront from '@lucide/svelte/icons/car-front';
import Fuel from '@lucide/svelte/icons/fuel';
import Bus from '@lucide/svelte/icons/bus';
import TrainFront from '@lucide/svelte/icons/train-front';
import Bike from '@lucide/svelte/icons/bike';
import Plane from '@lucide/svelte/icons/plane';
import PlaneTakeoff from '@lucide/svelte/icons/plane-takeoff';
import ParkingCircle from '@lucide/svelte/icons/parking-circle';
import Ship from '@lucide/svelte/icons/ship';

// Food & Dining
import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
import Utensils from '@lucide/svelte/icons/utensils';
import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
import Coffee from '@lucide/svelte/icons/coffee';
import Wine from '@lucide/svelte/icons/wine';
import Pizza from '@lucide/svelte/icons/pizza';
import Beef from '@lucide/svelte/icons/beef';
import Soup from '@lucide/svelte/icons/soup';
import IceCreamCone from '@lucide/svelte/icons/ice-cream-cone';
import Cake from '@lucide/svelte/icons/cake';

// Health & Wellness
import Heart from '@lucide/svelte/icons/heart';
import Hospital from '@lucide/svelte/icons/hospital';
import Stethoscope from '@lucide/svelte/icons/stethoscope';
import Pill from '@lucide/svelte/icons/pill';
import Dumbbell from '@lucide/svelte/icons/dumbbell';
import Brain from '@lucide/svelte/icons/brain';
import Syringe from '@lucide/svelte/icons/syringe';
import Glasses from '@lucide/svelte/icons/glasses';
import Leaf from '@lucide/svelte/icons/leaf';
import Activity from '@lucide/svelte/icons/activity';
import Shield from '@lucide/svelte/icons/shield';

// Education
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import Book from '@lucide/svelte/icons/book';
import BookOpen from '@lucide/svelte/icons/book-open';
import Library from '@lucide/svelte/icons/library';
import Pencil from '@lucide/svelte/icons/pencil';
import Languages from '@lucide/svelte/icons/languages';
import Presentation from '@lucide/svelte/icons/presentation';

// Subscriptions & Tech
import Tv from '@lucide/svelte/icons/tv';
import Cloud from '@lucide/svelte/icons/cloud';
import Smartphone from '@lucide/svelte/icons/smartphone';
import Laptop from '@lucide/svelte/icons/laptop';
import Headphones from '@lucide/svelte/icons/headphones';
import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
import Music from '@lucide/svelte/icons/music';
import Newspaper from '@lucide/svelte/icons/newspaper';

// Family & Pets
import Baby from '@lucide/svelte/icons/baby';
import School from '@lucide/svelte/icons/school';
import Users from '@lucide/svelte/icons/users';
import PartyPopper from '@lucide/svelte/icons/party-popper';
import Gift from '@lucide/svelte/icons/gift';
import Dog from '@lucide/svelte/icons/dog';
import Cat from '@lucide/svelte/icons/cat';
import PawPrint from '@lucide/svelte/icons/paw-print';

// Lifestyle
import Mountain from '@lucide/svelte/icons/mountain';
import Palette from '@lucide/svelte/icons/palette';
import Ticket from '@lucide/svelte/icons/ticket';
import Drama from '@lucide/svelte/icons/drama';
import Camera from '@lucide/svelte/icons/camera';
import Briefcase from '@lucide/svelte/icons/briefcase';
import Hotel from '@lucide/svelte/icons/hotel';

// Shopping & Personal Care
import Shirt from '@lucide/svelte/icons/shirt';
import Footprints from '@lucide/svelte/icons/footprints';
import Watch from '@lucide/svelte/icons/watch';
import Scissors from '@lucide/svelte/icons/scissors';
import ShowerHead from '@lucide/svelte/icons/shower-head';

// General / Misc
import Mail from '@lucide/svelte/icons/mail';
import Package from '@lucide/svelte/icons/package';
import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
import HandHeart from '@lucide/svelte/icons/hand-heart';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';

export type LucideIconMeta = {
    name: string;
    keywords?: string[];
    group: string;
    component: Component;
};

export const LUCIDE_ICONS = {
    // Money & Finance
    wallet: { name: 'Wallet', keywords: ['money', 'cash', 'spending'], group: 'Money & Finance', component: Wallet },
    banknote: { name: 'Banknote', keywords: ['money', 'cash', 'bill'], group: 'Money & Finance', component: Banknote },
    'credit-card': { name: 'Credit Card', keywords: ['payment', 'card', 'debit'], group: 'Money & Finance', component: CreditCard },
    'piggy-bank': { name: 'Piggy Bank', keywords: ['savings', 'emergency', 'fund'], group: 'Money & Finance', component: PiggyBank },
    landmark: { name: 'Bank', keywords: ['bank', 'loan', 'institution'], group: 'Money & Finance', component: Landmark },
    coins: { name: 'Coins', keywords: ['money', 'change', 'cash'], group: 'Money & Finance', component: Coins },
    'hand-coins': { name: 'Allowance', keywords: ['gift', 'allowance', 'pay'], group: 'Money & Finance', component: HandCoins },
    receipt: { name: 'Receipt', keywords: ['bill', 'invoice', 'tax'], group: 'Money & Finance', component: Receipt },
    'trending-up': { name: 'Investment', keywords: ['stock', 'growth', 'invest'], group: 'Money & Finance', component: TrendingUp },
    'trending-down': { name: 'Loss', keywords: ['decline', 'loss'], group: 'Money & Finance', component: TrendingDown },
    scale: { name: 'Legal', keywords: ['law', 'legal', 'justice'], group: 'Money & Finance', component: Scale },
    'file-text': { name: 'Document', keywords: ['document', 'paper', 'tax'], group: 'Money & Finance', component: FileText },

    // Housing & Utilities
    house: { name: 'House', keywords: ['home', 'rent', 'mortgage'], group: 'Housing', component: House },
    building: { name: 'Building', keywords: ['apartment', 'office', 'building'], group: 'Housing', component: Building },
    plug: { name: 'Plug', keywords: ['electricity', 'power', 'utility'], group: 'Housing', component: Plug },
    droplets: { name: 'Water', keywords: ['water', 'utility', 'plumbing'], group: 'Housing', component: Droplets },
    flame: { name: 'Gas', keywords: ['gas', 'fire', 'heating'], group: 'Housing', component: Flame },
    wifi: { name: 'Internet', keywords: ['internet', 'wifi', 'network'], group: 'Housing', component: Wifi },
    wrench: { name: 'Repair', keywords: ['maintenance', 'repair', 'fix'], group: 'Housing', component: Wrench },
    sofa: { name: 'Furniture', keywords: ['furniture', 'sofa', 'home'], group: 'Housing', component: Sofa },
    sprout: { name: 'Plants', keywords: ['plant', 'decor', 'garden'], group: 'Housing', component: Sprout },
    sparkles: { name: 'Cleaning', keywords: ['cleaning', 'sparkle', 'wash'], group: 'Housing', component: Sparkles },
    lock: { name: 'Security', keywords: ['security', 'lock', 'safe'], group: 'Housing', component: Lock },
    lightbulb: { name: 'Lightbulb', keywords: ['idea', 'electricity', 'lamp'], group: 'Housing', component: Lightbulb },

    // Transport
    car: { name: 'Car', keywords: ['vehicle', 'auto', 'transport'], group: 'Transport', component: Car },
    'car-front': { name: 'Vehicle', keywords: ['rideshare', 'taxi', 'car'], group: 'Transport', component: CarFront },
    fuel: { name: 'Fuel', keywords: ['gas', 'petrol', 'fuel'], group: 'Transport', component: Fuel },
    bus: { name: 'Bus', keywords: ['public', 'transit', 'bus'], group: 'Transport', component: Bus },
    'train-front': { name: 'Train', keywords: ['train', 'metro', 'rail'], group: 'Transport', component: TrainFront },
    bike: { name: 'Bike', keywords: ['bicycle', 'scooter', 'bike'], group: 'Transport', component: Bike },
    plane: { name: 'Plane', keywords: ['flight', 'travel', 'airplane'], group: 'Transport', component: Plane },
    'plane-takeoff': { name: 'Flight', keywords: ['takeoff', 'flight', 'travel'], group: 'Transport', component: PlaneTakeoff },
    'parking-circle': { name: 'Parking', keywords: ['parking', 'tolls', 'fees'], group: 'Transport', component: ParkingCircle },
    ship: { name: 'Ship', keywords: ['boat', 'cruise', 'ship'], group: 'Transport', component: Ship },

    // Food & Dining
    'shopping-cart': { name: 'Groceries', keywords: ['shopping', 'cart', 'groceries'], group: 'Food', component: ShoppingCart },
    utensils: { name: 'Dining', keywords: ['restaurant', 'food', 'meal'], group: 'Food', component: Utensils },
    'utensils-crossed': { name: 'Restaurant', keywords: ['dining', 'eat', 'restaurant'], group: 'Food', component: UtensilsCrossed },
    coffee: { name: 'Coffee', keywords: ['coffee', 'cafe', 'drink'], group: 'Food', component: Coffee },
    wine: { name: 'Drinks', keywords: ['alcohol', 'wine', 'beverage'], group: 'Food', component: Wine },
    pizza: { name: 'Pizza', keywords: ['fast food', 'pizza', 'delivery'], group: 'Food', component: Pizza },
    beef: { name: 'Meat', keywords: ['meat', 'steak', 'food'], group: 'Food', component: Beef },
    soup: { name: 'Soup', keywords: ['soup', 'meal', 'catering'], group: 'Food', component: Soup },
    'ice-cream-cone': { name: 'Snacks', keywords: ['snack', 'dessert', 'sweet'], group: 'Food', component: IceCreamCone },
    cake: { name: 'Cake', keywords: ['birthday', 'cake', 'dessert'], group: 'Food', component: Cake },

    // Health & Wellness
    heart: { name: 'Heart', keywords: ['health', 'love', 'wellness'], group: 'Health', component: Heart },
    hospital: { name: 'Hospital', keywords: ['hospital', 'medical', 'health'], group: 'Health', component: Hospital },
    stethoscope: { name: 'Doctor', keywords: ['doctor', 'medical', 'checkup'], group: 'Health', component: Stethoscope },
    pill: { name: 'Pharmacy', keywords: ['medicine', 'pill', 'pharmacy'], group: 'Health', component: Pill },
    dumbbell: { name: 'Fitness', keywords: ['gym', 'fitness', 'workout'], group: 'Health', component: Dumbbell },
    brain: { name: 'Therapy', keywords: ['mental', 'therapy', 'brain'], group: 'Health', component: Brain },
    syringe: { name: 'Injection', keywords: ['vaccine', 'injection', 'shot'], group: 'Health', component: Syringe },
    glasses: { name: 'Vision', keywords: ['glasses', 'vision', 'eye'], group: 'Health', component: Glasses },
    leaf: { name: 'Wellness', keywords: ['natural', 'wellness', 'herbal'], group: 'Health', component: Leaf },
    activity: { name: 'Activity', keywords: ['pulse', 'activity', 'health'], group: 'Health', component: Activity },
    shield: { name: 'Insurance', keywords: ['insurance', 'protect', 'shield'], group: 'Health', component: Shield },

    // Education
    'graduation-cap': { name: 'Tuition', keywords: ['school', 'tuition', 'graduate'], group: 'Education', component: GraduationCap },
    book: { name: 'Book', keywords: ['book', 'study', 'reading'], group: 'Education', component: Book },
    'book-open': { name: 'Reading', keywords: ['reading', 'book', 'open'], group: 'Education', component: BookOpen },
    library: { name: 'Library', keywords: ['library', 'books', 'study'], group: 'Education', component: Library },
    pencil: { name: 'Pencil', keywords: ['write', 'pencil', 'school'], group: 'Education', component: Pencil },
    languages: { name: 'Languages', keywords: ['language', 'translate', 'learning'], group: 'Education', component: Languages },
    presentation: { name: 'Workshop', keywords: ['presentation', 'workshop', 'training'], group: 'Education', component: Presentation },

    // Subscriptions & Tech
    tv: { name: 'Streaming', keywords: ['tv', 'streaming', 'netflix'], group: 'Subscriptions', component: Tv },
    cloud: { name: 'Cloud', keywords: ['cloud', 'storage', 'service'], group: 'Subscriptions', component: Cloud },
    smartphone: { name: 'Mobile', keywords: ['phone', 'mobile', 'app'], group: 'Subscriptions', component: Smartphone },
    laptop: { name: 'Software', keywords: ['software', 'computer', 'laptop'], group: 'Subscriptions', component: Laptop },
    headphones: { name: 'Audio', keywords: ['music', 'audio', 'headphones'], group: 'Subscriptions', component: Headphones },
    'gamepad-2': { name: 'Games', keywords: ['gaming', 'games', 'console'], group: 'Subscriptions', component: Gamepad2 },
    music: { name: 'Music', keywords: ['music', 'song', 'audio'], group: 'Subscriptions', component: Music },
    newspaper: { name: 'News', keywords: ['news', 'magazine', 'subscription'], group: 'Subscriptions', component: Newspaper },

    // Family & Pets
    baby: { name: 'Baby', keywords: ['baby', 'child', 'infant'], group: 'Family', component: Baby },
    school: { name: 'School', keywords: ['school', 'education', 'building'], group: 'Family', component: School },
    users: { name: 'Family', keywords: ['family', 'people', 'group'], group: 'Family', component: Users },
    'party-popper': { name: 'Celebration', keywords: ['party', 'celebration', 'birthday'], group: 'Family', component: PartyPopper },
    gift: { name: 'Gift', keywords: ['gift', 'present', 'birthday'], group: 'Family', component: Gift },
    dog: { name: 'Dog', keywords: ['dog', 'pet', 'animal'], group: 'Family', component: Dog },
    cat: { name: 'Cat', keywords: ['cat', 'pet', 'animal'], group: 'Family', component: Cat },
    'paw-print': { name: 'Pet', keywords: ['pet', 'paw', 'animal'], group: 'Family', component: PawPrint },

    // Lifestyle
    mountain: { name: 'Outdoors', keywords: ['mountain', 'outdoor', 'hiking'], group: 'Lifestyle', component: Mountain },
    palette: { name: 'Hobby', keywords: ['art', 'hobby', 'paint'], group: 'Lifestyle', component: Palette },
    ticket: { name: 'Tickets', keywords: ['ticket', 'event', 'concert'], group: 'Lifestyle', component: Ticket },
    drama: { name: 'Theater', keywords: ['theater', 'show', 'drama'], group: 'Lifestyle', component: Drama },
    camera: { name: 'Photography', keywords: ['camera', 'photo', 'picture'], group: 'Lifestyle', component: Camera },
    briefcase: { name: 'Travel', keywords: ['briefcase', 'travel', 'business'], group: 'Lifestyle', component: Briefcase },
    hotel: { name: 'Hotel', keywords: ['hotel', 'lodging', 'stay'], group: 'Lifestyle', component: Hotel },

    // Shopping & Personal Care
    shirt: { name: 'Clothing', keywords: ['clothes', 'shirt', 'apparel'], group: 'Shopping', component: Shirt },
    footprints: { name: 'Footwear', keywords: ['shoes', 'footwear', 'sneakers'], group: 'Shopping', component: Footprints },
    watch: { name: 'Watch', keywords: ['watch', 'jewelry', 'accessory'], group: 'Shopping', component: Watch },
    scissors: { name: 'Salon', keywords: ['haircut', 'salon', 'scissors'], group: 'Shopping', component: Scissors },
    'shower-head': { name: 'Grooming', keywords: ['shower', 'grooming', 'bath'], group: 'Shopping', component: ShowerHead },

    // General
    mail: { name: 'Mail', keywords: ['mail', 'postage', 'envelope'], group: 'General', component: Mail },
    package: { name: 'Package', keywords: ['package', 'shipping', 'delivery'], group: 'General', component: Package },
    'heart-handshake': { name: 'Donation', keywords: ['donation', 'charity', 'help', 'ngo'], group: 'General', component: HeartHandshake },
    'hand-heart': { name: 'Tip', keywords: ['tip', 'busker', 'beggar', 'spontaneous', 'small giving'], group: 'General', component: HandHeart },
    'more-horizontal': { name: 'Other', keywords: ['other', 'misc', 'more'], group: 'General', component: MoreHorizontal },
} as const satisfies Record<string, LucideIconMeta>;

export type LucideIconKey = keyof typeof LUCIDE_ICONS;

export const isLucideIconKey = (value: string): value is LucideIconKey =>
    Object.prototype.hasOwnProperty.call(LUCIDE_ICONS, value);

export const getLucideIcon = (key: string): Component | undefined =>
    isLucideIconKey(key) ? LUCIDE_ICONS[key].component : undefined;
