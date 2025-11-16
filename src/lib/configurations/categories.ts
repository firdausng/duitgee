import type {Category, CategoryGroup} from "$lib/schemas/categories";

export const categoryData: CategoryData = {
    categoryGroups: [
        {
            name: "Housing & Utilities",
            description: "Home-related expenses including rent, utilities, and maintenance",
            color: "#3B82F6",
            icon: "house",
            iconType: "phosphor",
            isPublic: true
        },
        {
            name: "Transportation",
            description: "Vehicle and travel-related expenses",
            color: "#F59E0B",
            icon: "car",
            iconType: "phosphor",
            isPublic: true
        },
        {
            name: "Food & Groceries",
            description: "Food, dining, and grocery expenses",
            color: "#10B981",
            icon: "hamburger",
            iconType: "phosphor",
            isPublic: true
        },
        {
            name: "Health & Wellness",
            description: "Healthcare, fitness, and wellness expenses",
            color: "#EF4444",
            icon: "heart",
            iconType: "phosphor",
            isPublic: true
        },
        {
            name: "Education & Personal Development",
            description: "Learning, courses, and educational expenses",
            color: "#8B5CF6",
            icon: "book",
            iconType: "phosphor",
            isPublic: true
        },
        {
            name: "Bills & Subscriptions",
            description: "Recurring bills and subscription services",
            color: "#EC4899",
            icon: "lightning",
            iconType: "phosphor",
            isPublic: true
        },
        {
            name: "Family & Children",
            description: "Family and child-related expenses",
            color: "#06B6D4",
            icon: "baby",
            iconType: "phosphor",
            isPublic: true
        },
        {
            name: "Debt & Savings",
            description: "Loan payments, savings, and investments",
            color: "#84CC16",
            icon: "currency-dollar",
            iconType: "phosphor",
            isPublic: true
        },
        {
            name: "Insurance",
            description: "Insurance premiums and coverage",
            color: "#6B7280",
            icon: "shield",
            iconType: "phosphor",
            isPublic: true
        },
        {
            name: "Leisure & Entertainment",
            description: "Entertainment, hobbies, and leisure activities",
            color: "#F97316",
            icon: "gamepad",
            iconType: "phosphor",
            isPublic: true
        },
        {
            name: "Shopping & Personal Care",
            description: "Personal shopping and care items",
            color: "#DB2777",
            icon: "shopping-cart",
            iconType: "phosphor",
            isPublic: true
        }
    ],
    categories: [
        // Housing & Utilities
        { name: "Rent / Mortgage", description: "", icon: "house", iconType: "phosphor", color: "#3B82F6", isPublic: true, group: "Housing & Utilities" },
        { name: "Electricity", description: "", icon: "lightning", iconType: "phosphor", color: "#F59E0B", isPublic: true, group: "Housing & Utilities" },
        { name: "Water", description: "", icon: "drop", iconType: "phosphor", color: "#06B6D4", isPublic: true, group: "Housing & Utilities" },
        { name: "Gas", description: "", icon: "flame", iconType: "phosphor", color: "#F97316", isPublic: true, group: "Housing & Utilities" },
        { name: "Internet & Phone", description: "", icon: "wifi-high", iconType: "phosphor", color: "#8B5CF6", isPublic: true, group: "Housing & Utilities" },
        { name: "Maintenance / Repairs", description: "", icon: "wrench", iconType: "phosphor", color: "#6B7280", isPublic: true, group: "Housing & Utilities" },

        // Transportation
        { name: "Fuel", description: "", icon: "gas-pump", iconType: "phosphor", color: "#F59E0B", isPublic: true, group: "Transportation" },
        { name: "Public transport", description: "", icon: "bus", iconType: "phosphor", color: "#10B981", isPublic: true, group: "Transportation" },
        { name: "Car loan / Lease", description: "", icon: "currency-dollar", iconType: "phosphor", color: "#EF4444", isPublic: true, group: "Transportation" },
        { name: "Insurance", description: "", icon: "shield", iconType: "phosphor", color: "#6B7280", isPublic: true, group: "Transportation" },
        { name: "Maintenance & Repairs", description: "", icon: "gear", iconType: "phosphor", color: "#8B5CF6", isPublic: true, group: "Transportation" },
        { name: "Parking / Tolls", description: "", icon: "parking", iconType: "phosphor", color: "#EC4899", isPublic: true, group: "Transportation" },

        // Food & Groceries
        { name: "Groceries", description: "", icon: "shopping-cart", iconType: "phosphor", color: "#10B981", isPublic: true, group: "Food & Groceries" },
        { name: "Dining out / Takeaway", description: "", icon: "fork-knife", iconType: "phosphor", color: "#F59E0B", isPublic: true, group: "Food & Groceries" },
        { name: "Coffee / Snacks", description: "", icon: "coffee", iconType: "phosphor", color: "#8B5CF6", isPublic: true, group: "Food & Groceries" },

        // Health & Wellness
        { name: "Health insurance", description: "", icon: "shield-plus", iconType: "phosphor", color: "#EF4444", isPublic: true, group: "Health & Wellness" },
        { name: "Medical bills (doctor, dentist, etc.)", description: "", icon: "stethoscope", iconType: "phosphor", color: "#F59E0B", isPublic: true, group: "Health & Wellness" },
        { name: "Pharmacy / Medicine", description: "", icon: "pill", iconType: "phosphor", color: "#10B981", isPublic: true, group: "Health & Wellness" },
        { name: "Gym / Sports / Fitness", description: "", icon: "barbell", iconType: "phosphor", color: "#8B5CF6", isPublic: true, group: "Health & Wellness" },

        // Education
        { name: "Tuition fees", description: "", icon: "graduation-cap", iconType: "phosphor", color: "#8B5CF6", isPublic: true, group: "Education & Personal Development" },
        { name: "Books & Materials", description: "", icon: "book", iconType: "phosphor", color: "#10B981", isPublic: true, group: "Education & Personal Development" },
        { name: "Online courses / Subscriptions", description: "", icon: "monitor-play", iconType: "phosphor", color: "#F59E0B", isPublic: true, group: "Education & Personal Development" },
        { name: "Training / Certifications", description: "", icon: "certificate", iconType: "phosphor", color: "#EF4444", isPublic: true, group: "Education & Personal Development" },

        // Bills & Subscriptions
        { name: "Streaming (Netflix, Spotify, etc.)", description: "", icon: "play", iconType: "phosphor", color: "#EC4899", isPublic: true, group: "Bills & Subscriptions" },
        { name: "Cloud services", description: "", icon: "cloud", iconType: "phosphor", color: "#06B6D4", isPublic: true, group: "Bills & Subscriptions" },
        { name: "Magazine / Membership fees", description: "", icon: "newspaper", iconType: "phosphor", color: "#8B5CF6", isPublic: true, group: "Bills & Subscriptions" },

        // Family & Children
        { name: "Childcare / Babysitting", description: "", icon: "baby", iconType: "phosphor", color: "#06B6D4", isPublic: true, group: "Family & Children" },
        { name: "School fees", description: "", icon: "student", iconType: "phosphor", color: "#10B981", isPublic: true, group: "Family & Children" },
        { name: "Toys & Supplies", description: "", icon: "teddy-bear", iconType: "phosphor", color: "#F59E0B", isPublic: true, group: "Family & Children" },

        // Debt & Savings
        { name: "Loan repayments", description: "", icon: "bank", iconType: "phosphor", color: "#84CC16", isPublic: true, group: "Debt & Savings" },
        { name: "Credit card payments", description: "", icon: "credit-card", iconType: "phosphor", color: "#EF4444", isPublic: true, group: "Debt & Savings" },
        { name: "Emergency fund", description: "", icon: "piggy-bank", iconType: "phosphor", color: "#10B981", isPublic: true, group: "Debt & Savings" },
        { name: "Investments", description: "", icon: "trending-up", iconType: "phosphor", color: "#8B5CF6", isPublic: true, group: "Debt & Savings" },

        // Insurance
        { name: "Life insurance", description: "", icon: "shield-check", iconType: "phosphor", color: "#6B7280", isPublic: true, group: "Insurance" },
        { name: "Health insurance (if not under Health group)", description: "", icon: "shield-plus", iconType: "phosphor", color: "#EF4444", isPublic: true, group: "Insurance" },
        { name: "Property / Car insurance", description: "", icon: "shield-warning", iconType: "phosphor", color: "#F59E0B", isPublic: true, group: "Insurance" },

        // Leisure & Entertainment
        { name: "Travel / Holidays", description: "", icon: "airplane", iconType: "phosphor", color: "#F97316", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Movies / Concerts", description: "", icon: "ticket", iconType: "phosphor", color: "#EC4899", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Hobbies", description: "", icon: "palette", iconType: "phosphor", color: "#8B5CF6", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Games", description: "", icon: "gamepad", iconType: "phosphor", color: "#10B981", isPublic: true, group: "Leisure & Entertainment" },

        // Shopping & Personal Care
        { name: "Clothing & Accessories", description: "", icon: "tshirt", iconType: "phosphor", color: "#DB2777", isPublic: true, group: "Shopping & Personal Care" },
        { name: "Personal Care", description: "", icon: "drop-half-bottom", iconType: "phosphor", color: "#EC4899", isPublic: true, group: "Shopping & Personal Care" }
    ]
};

export interface CategoryData {
    categoryGroups: CategoryGroup[]
    categories: Category[]
}
