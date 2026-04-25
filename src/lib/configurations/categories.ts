import type { Category, CategoryGroup } from "$lib/schemas/categories";

export const categoryData: CategoryData = {
    categoryGroups: [
        {
            name: "Housing",
            description: "Rent, utilities, maintenance, and home essentials",
            color: "#3B82F6",
            icon: "house",
            iconType: "lucide",
            isPublic: true
        },
        {
            name: "Transport",
            description: "Vehicle and travel-related expenses",
            color: "#F59E0B",
            icon: "car",
            iconType: "lucide",
            isPublic: true
        },
        {
            name: "Food",
            description: "Groceries, dining, and beverages",
            color: "#10B981",
            icon: "utensils",
            iconType: "lucide",
            isPublic: true
        },
        {
            name: "Health",
            description: "Medical, fitness, and wellness expenses",
            color: "#EF4444",
            icon: "heart",
            iconType: "lucide",
            isPublic: true
        },
        {
            name: "Family",
            description: "Childcare, school, and family activities",
            color: "#06B6D4",
            icon: "users",
            iconType: "lucide",
            isPublic: true
        },
        {
            name: "Education",
            description: "Tuition, courses, and learning materials",
            color: "#8B5CF6",
            icon: "graduation-cap",
            iconType: "lucide",
            isPublic: true
        },
        {
            name: "Subscriptions",
            description: "Streaming, software, and recurring memberships",
            color: "#EC4899",
            icon: "tv",
            iconType: "lucide",
            isPublic: true
        },
        {
            name: "Electronics & Gadgets",
            description: "Phones, computers, audio, and smart devices",
            color: "#6366F1",
            icon: "laptop",
            iconType: "lucide",
            isPublic: true
        },
        {
            name: "Money",
            description: "Debt, savings, insurance, taxes, and bank fees",
            color: "#84CC16",
            icon: "wallet",
            iconType: "lucide",
            isPublic: true
        },
        {
            name: "Lifestyle",
            description: "Travel, entertainment, hobbies, sports, and personal care",
            color: "#F97316",
            icon: "palette",
            iconType: "lucide",
            isPublic: true
        },
        {
            name: "Giving",
            description: "Charity, religious giving, gifts, and tips",
            color: "#DB2777",
            icon: "heart-handshake",
            iconType: "lucide",
            isPublic: true
        },
        {
            name: "Other",
            description: "Pets, legal, and miscellaneous expenses",
            color: "#9CA3AF",
            icon: "more-horizontal",
            iconType: "lucide",
            isPublic: true
        }
    ],
    categories: [
        // Housing
        { name: "Rent / Mortgage", description: "", icon: "house", iconType: "lucide", color: "#3B82F6", isPublic: true, group: "Housing" },
        { name: "Utilities", description: "Electricity, water, gas", icon: "plug", iconType: "lucide", color: "#F59E0B", isPublic: true, group: "Housing" },
        { name: "Internet", description: "Home internet and phone line", icon: "wifi", iconType: "lucide", color: "#8B5CF6", isPublic: true, group: "Housing" },
        { name: "Maintenance", description: "Repairs, cleaning, security", icon: "wrench", iconType: "lucide", color: "#6B7280", isPublic: true, group: "Housing" },
        { name: "Furniture", description: "Furniture, appliances, decor", icon: "sofa", iconType: "lucide", color: "#8B5CF6", isPublic: true, group: "Housing" },
        { name: "Household Supplies", description: "Cleaning supplies and consumables", icon: "sparkles", iconType: "lucide", color: "#06B6D4", isPublic: true, group: "Housing" },

        // Transport
        { name: "Fuel", description: "", icon: "fuel", iconType: "lucide", color: "#F59E0B", isPublic: true, group: "Transport" },
        { name: "Public Transit", description: "Bus, train, metro", icon: "bus", iconType: "lucide", color: "#10B981", isPublic: true, group: "Transport" },
        { name: "Rideshare / Taxi", description: "Uber, Grab, Lyft, taxi", icon: "car-front", iconType: "lucide", color: "#EC4899", isPublic: true, group: "Transport" },
        { name: "Vehicle Loan", description: "Car loan or lease", icon: "banknote", iconType: "lucide", color: "#EF4444", isPublic: true, group: "Transport" },
        { name: "Vehicle Service", description: "Maintenance, repairs, inspection", icon: "wrench", iconType: "lucide", color: "#8B5CF6", isPublic: true, group: "Transport" },
        { name: "Parking & Tolls", description: "", icon: "parking-circle", iconType: "lucide", color: "#EC4899", isPublic: true, group: "Transport" },

        // Food
        { name: "Groceries", description: "", icon: "shopping-cart", iconType: "lucide", color: "#10B981", isPublic: true, group: "Food" },
        { name: "Dining Out", description: "Restaurants, takeaway", icon: "utensils", iconType: "lucide", color: "#F59E0B", isPublic: true, group: "Food" },
        { name: "Coffee & Snacks", description: "", icon: "coffee", iconType: "lucide", color: "#8B5CF6", isPublic: true, group: "Food" },
        { name: "Delivery", description: "Food delivery services", icon: "pizza", iconType: "lucide", color: "#06B6D4", isPublic: true, group: "Food" },
        { name: "Drinks", description: "Alcohol and beverages", icon: "wine", iconType: "lucide", color: "#EF4444", isPublic: true, group: "Food" },

        // Health
        { name: "Medical", description: "Doctor, dental, vision, lab tests", icon: "stethoscope", iconType: "lucide", color: "#EF4444", isPublic: true, group: "Health" },
        { name: "Pharmacy", description: "Medicine, supplements", icon: "pill", iconType: "lucide", color: "#10B981", isPublic: true, group: "Health" },
        { name: "Fitness", description: "Gym, sports, fitness equipment", icon: "dumbbell", iconType: "lucide", color: "#8B5CF6", isPublic: true, group: "Health" },
        { name: "Wellness", description: "Therapy, spa, massage, alternative medicine", icon: "leaf", iconType: "lucide", color: "#22C55E", isPublic: true, group: "Health" },

        // Family
        { name: "Childcare", description: "Babysitting, daycare", icon: "baby", iconType: "lucide", color: "#06B6D4", isPublic: true, group: "Family" },
        { name: "School Fees", description: "Tuition for kids' school", icon: "school", iconType: "lucide", color: "#10B981", isPublic: true, group: "Family" },
        { name: "Kids Supplies", description: "Toys, baby supplies, clothing for kids", icon: "package", iconType: "lucide", color: "#F59E0B", isPublic: true, group: "Family" },
        { name: "Kids Activities", description: "Classes, sports, hobbies for kids", icon: "party-popper", iconType: "lucide", color: "#F97316", isPublic: true, group: "Family" },
        { name: "Family Outings", description: "Family meals out, trips, recreation", icon: "users", iconType: "lucide", color: "#8B5CF6", isPublic: true, group: "Family" },

        // Education
        { name: "Tuition", description: "Personal tuition fees", icon: "graduation-cap", iconType: "lucide", color: "#8B5CF6", isPublic: true, group: "Education" },
        { name: "Courses", description: "Online courses, workshops, certifications", icon: "presentation", iconType: "lucide", color: "#F59E0B", isPublic: true, group: "Education" },
        { name: "Books & Materials", description: "Books, learning materials, language apps", icon: "book-open", iconType: "lucide", color: "#10B981", isPublic: true, group: "Education" },

        // Subscriptions
        { name: "Streaming", description: "Netflix, Spotify, etc.", icon: "tv", iconType: "lucide", color: "#EC4899", isPublic: true, group: "Subscriptions" },
        { name: "Software", description: "Software and cloud services", icon: "cloud", iconType: "lucide", color: "#3B82F6", isPublic: true, group: "Subscriptions" },
        { name: "Mobile Plan", description: "Cellular plan and data", icon: "smartphone", iconType: "lucide", color: "#F59E0B", isPublic: true, group: "Subscriptions" },
        { name: "Memberships", description: "Magazines, clubs, recurring memberships", icon: "newspaper", iconType: "lucide", color: "#8B5CF6", isPublic: true, group: "Subscriptions" },

        // Electronics & Gadgets
        { name: "Phone & Tablet", description: "Phone or tablet purchases", icon: "smartphone", iconType: "lucide", color: "#3B82F6", isPublic: true, group: "Electronics & Gadgets" },
        { name: "Computer", description: "Laptop or desktop purchases", icon: "laptop", iconType: "lucide", color: "#6366F1", isPublic: true, group: "Electronics & Gadgets" },
        { name: "Audio & Headphones", description: "Headphones, speakers, audio gear", icon: "headphones", iconType: "lucide", color: "#8B5CF6", isPublic: true, group: "Electronics & Gadgets" },
        { name: "Accessories", description: "Cables, chargers, mice, keyboards", icon: "plug", iconType: "lucide", color: "#6B7280", isPublic: true, group: "Electronics & Gadgets" },
        { name: "Smart Home", description: "Smart bulbs, hubs, IoT devices", icon: "lightbulb", iconType: "lucide", color: "#F59E0B", isPublic: true, group: "Electronics & Gadgets" },

        // Money
        { name: "Loan Repayment", description: "Personal and home loan payments", icon: "landmark", iconType: "lucide", color: "#84CC16", isPublic: true, group: "Money" },
        { name: "Credit Card", description: "Credit card payments", icon: "credit-card", iconType: "lucide", color: "#EF4444", isPublic: true, group: "Money" },
        { name: "Savings", description: "Emergency fund and savings deposits", icon: "piggy-bank", iconType: "lucide", color: "#10B981", isPublic: true, group: "Money" },
        { name: "Investment", description: "Stocks, funds, investments", icon: "trending-up", iconType: "lucide", color: "#8B5CF6", isPublic: true, group: "Money" },
        { name: "Insurance", description: "Life, health, property, vehicle insurance", icon: "shield", iconType: "lucide", color: "#6B7280", isPublic: true, group: "Money" },
        { name: "Taxes", description: "Income tax, property tax", icon: "receipt", iconType: "lucide", color: "#EF4444", isPublic: true, group: "Money" },
        { name: "Bank Fees", description: "Transaction fees, ATM fees", icon: "coins", iconType: "lucide", color: "#F59E0B", isPublic: true, group: "Money" },

        // Lifestyle
        { name: "Travel", description: "Flights, hotels, vacations", icon: "plane", iconType: "lucide", color: "#F97316", isPublic: true, group: "Lifestyle" },
        { name: "Entertainment", description: "Movies, concerts, theater, events", icon: "ticket", iconType: "lucide", color: "#EC4899", isPublic: true, group: "Lifestyle" },
        { name: "Hobbies & Crafts", description: "Art, music, photography, collecting", icon: "palette", iconType: "lucide", color: "#8B5CF6", isPublic: true, group: "Lifestyle" },
        { name: "Sports & Recreation", description: "Sports gear, outdoor recreation", icon: "activity", iconType: "lucide", color: "#10B981", isPublic: true, group: "Lifestyle" },
        { name: "Clothing", description: "Apparel, shoes, accessories", icon: "shirt", iconType: "lucide", color: "#DB2777", isPublic: true, group: "Lifestyle" },
        { name: "Personal Care", description: "Salon, beauty, grooming, skincare", icon: "scissors", iconType: "lucide", color: "#EC4899", isPublic: true, group: "Lifestyle" },

        // Giving
        { name: "Charity & NGOs", description: "WWF, Red Cross, secular charities", icon: "heart-handshake", iconType: "lucide", color: "#EF4444", isPublic: true, group: "Giving" },
        { name: "Religious Giving", description: "Zakat, tithe, sedekah, offerings", icon: "heart", iconType: "lucide", color: "#A855F7", isPublic: true, group: "Giving" },
        { name: "Tips & Small Giving", description: "Buskers, beggars, service tips, spontaneous giving", icon: "hand-heart", iconType: "lucide", color: "#F59E0B", isPublic: true, group: "Giving" },
        { name: "Gifts", description: "Birthday, wedding, holiday gifts", icon: "gift", iconType: "lucide", color: "#EC4899", isPublic: true, group: "Giving" },
        { name: "Condolences", description: "Funeral money, sympathy contributions", icon: "mail", iconType: "lucide", color: "#6B7280", isPublic: true, group: "Giving" },

        // Other
        { name: "Pets", description: "Pet food, vet care, supplies", icon: "paw-print", iconType: "lucide", color: "#F59E0B", isPublic: true, group: "Other" },
        { name: "Legal", description: "Legal fees, professional services", icon: "scale", iconType: "lucide", color: "#6B7280", isPublic: true, group: "Other" },
        { name: "Misc", description: "Miscellaneous and uncategorized expenses", icon: "more-horizontal", iconType: "lucide", color: "#9CA3AF", isPublic: true, group: "Other" }
    ]
};

export interface CategoryData {
    categoryGroups: CategoryGroup[];
    categories: Category[];
}
