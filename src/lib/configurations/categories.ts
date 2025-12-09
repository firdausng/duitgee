import type {Category, CategoryGroup} from "$lib/schemas/categories";

export const categoryData: CategoryData = {
    categoryGroups: [
        {
            name: "Housing & Utilities",
            description: "Home-related expenses including rent, utilities, and maintenance",
            color: "#3B82F6",
            icon: "🏠",
            iconType: "emoji",
            isPublic: true
        },
        {
            name: "Transportation",
            description: "Vehicle and travel-related expenses",
            color: "#F59E0B",
            icon: "🚗",
            iconType: "emoji",
            isPublic: true
        },
        {
            name: "Food & Groceries",
            description: "Food, dining, and grocery expenses",
            color: "#10B981",
            icon: "🍔",
            iconType: "emoji",
            isPublic: true
        },
        {
            name: "Health & Wellness",
            description: "Healthcare, fitness, and wellness expenses",
            color: "#EF4444",
            icon: "❤️",
            iconType: "emoji",
            isPublic: true
        },
        {
            name: "Education & Personal Development",
            description: "Learning, courses, and educational expenses",
            color: "#8B5CF6",
            icon: "📚",
            iconType: "emoji",
            isPublic: true
        },
        {
            name: "Bills & Subscriptions",
            description: "Recurring bills and subscription services",
            color: "#EC4899",
            icon: "⚡",
            iconType: "emoji",
            isPublic: true
        },
        {
            name: "Family & Children",
            description: "Family and child-related expenses",
            color: "#06B6D4",
            icon: "👶",
            iconType: "emoji",
            isPublic: true
        },
        {
            name: "Debt & Savings",
            description: "Loan payments, savings, and investments",
            color: "#84CC16",
            icon: "💰",
            iconType: "emoji",
            isPublic: true
        },
        {
            name: "Insurance",
            description: "Insurance premiums and coverage",
            color: "#6B7280",
            icon: "🛡️",
            iconType: "emoji",
            isPublic: true
        },
        {
            name: "Leisure & Entertainment",
            description: "Entertainment, hobbies, and leisure activities",
            color: "#F97316",
            icon: "🎮",
            iconType: "emoji",
            isPublic: true
        },
        {
            name: "Shopping & Personal Care",
            description: "Personal shopping and care items",
            color: "#DB2777",
            icon: "🛒",
            iconType: "emoji",
            isPublic: true
        },
        {
            name: "General",
            description: "Miscellaneous and uncategorized expenses",
            color: "#9CA3AF",
            icon: "📋",
            iconType: "emoji",
            isPublic: true
        }
    ],
    categories: [
        // Housing & Utilities
        { name: "Rent / Mortgage", description: "", icon: "🏠", iconType: "emoji", color: "#3B82F6", isPublic: true, group: "Housing & Utilities" },
        { name: "Electricity", description: "", icon: "⚡", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "Housing & Utilities" },
        { name: "Water", description: "", icon: "💧", iconType: "emoji", color: "#06B6D4", isPublic: true, group: "Housing & Utilities" },
        { name: "Gas", description: "", icon: "🔥", iconType: "emoji", color: "#F97316", isPublic: true, group: "Housing & Utilities" },
        { name: "Internet & Phone", description: "", icon: "📡", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Housing & Utilities" },
        { name: "Maintenance / Repairs", description: "", icon: "🔧", iconType: "emoji", color: "#6B7280", isPublic: true, group: "Housing & Utilities" },
        { name: "Property tax", description: "", icon: "🏘️", iconType: "emoji", color: "#EF4444", isPublic: true, group: "Housing & Utilities" },
        { name: "Home insurance", description: "", icon: "🏡", iconType: "emoji", color: "#10B981", isPublic: true, group: "Housing & Utilities" },
        { name: "Furniture / Appliances", description: "", icon: "🛋️", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Housing & Utilities" },
        { name: "Home decor", description: "", icon: "🪴", iconType: "emoji", color: "#22C55E", isPublic: true, group: "Housing & Utilities" },
        { name: "Cleaning services", description: "", icon: "🧹", iconType: "emoji", color: "#06B6D4", isPublic: true, group: "Housing & Utilities" },
        { name: "Security system", description: "", icon: "🔒", iconType: "emoji", color: "#6B7280", isPublic: true, group: "Housing & Utilities" },

        // Transportation
        { name: "Fuel", description: "", icon: "⛽", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "Transportation" },
        { name: "Public transport", description: "", icon: "🚌", iconType: "emoji", color: "#10B981", isPublic: true, group: "Transportation" },
        { name: "Car loan / Lease", description: "", icon: "💵", iconType: "emoji", color: "#EF4444", isPublic: true, group: "Transportation" },
        { name: "Insurance", description: "", icon: "🛡️", iconType: "emoji", color: "#6B7280", isPublic: true, group: "Transportation" },
        { name: "Maintenance & Repairs", description: "", icon: "⚙️", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Transportation" },
        { name: "Parking / Tolls", description: "", icon: "🅿️", iconType: "emoji", color: "#EC4899", isPublic: true, group: "Transportation" },
        { name: "Rideshare (Uber, Lyft)", description: "", icon: "🚕", iconType: "emoji", color: "#EC4899", isPublic: true, group: "Transportation" },
        { name: "Bike / Scooter rental", description: "", icon: "🚲", iconType: "emoji", color: "#10B981", isPublic: true, group: "Transportation" },
        { name: "Train / Metro", description: "", icon: "🚇", iconType: "emoji", color: "#3B82F6", isPublic: true, group: "Transportation" },
        { name: "Taxi", description: "", icon: "🚖", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "Transportation" },

        // Food & Groceries
        { name: "Groceries", description: "", icon: "🛒", iconType: "emoji", color: "#10B981", isPublic: true, group: "Food & Groceries" },
        { name: "Dining out / Takeaway", description: "", icon: "🍽️", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "Food & Groceries" },
        { name: "Coffee / Snacks", description: "", icon: "☕", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Food & Groceries" },
        { name: "Alcohol / Beverages", description: "", icon: "🍷", iconType: "emoji", color: "#EF4444", isPublic: true, group: "Food & Groceries" },
        { name: "Meal delivery services", description: "", icon: "📦", iconType: "emoji", color: "#06B6D4", isPublic: true, group: "Food & Groceries" },
        { name: "Catering / Events", description: "", icon: "🍲", iconType: "emoji", color: "#F97316", isPublic: true, group: "Food & Groceries" },

        // Health & Wellness
        { name: "Health insurance", description: "", icon: "🏥", iconType: "emoji", color: "#EF4444", isPublic: true, group: "Health & Wellness" },
        { name: "Medical bills (doctor, dentist, etc.)", description: "", icon: "🩺", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "Health & Wellness" },
        { name: "Pharmacy / Medicine", description: "", icon: "💊", iconType: "emoji", color: "#10B981", isPublic: true, group: "Health & Wellness" },
        { name: "Gym / Sports / Fitness", description: "", icon: "🏋️", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Health & Wellness" },
        { name: "Therapy / Counseling", description: "", icon: "🧠", iconType: "emoji", color: "#A855F7", isPublic: true, group: "Health & Wellness" },
        { name: "Spa / Massage", description: "", icon: "💆", iconType: "emoji", color: "#EC4899", isPublic: true, group: "Health & Wellness" },
        { name: "Vitamins / Supplements", description: "", icon: "💉", iconType: "emoji", color: "#14B8A6", isPublic: true, group: "Health & Wellness" },
        { name: "Alternative medicine", description: "", icon: "🌿", iconType: "emoji", color: "#22C55E", isPublic: true, group: "Health & Wellness" },
        { name: "Vision care (glasses, contacts)", description: "", icon: "👓", iconType: "emoji", color: "#3B82F6", isPublic: true, group: "Health & Wellness" },
        { name: "Lab tests / Diagnostics", description: "", icon: "🧪", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "Health & Wellness" },
        { name: "Dental care", description: "", icon: "🦷", iconType: "emoji", color: "#06B6D4", isPublic: true, group: "Health & Wellness" },
        { name: "Chiropractor / Physical therapy", description: "", icon: "🤸", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Health & Wellness" },

        // Education
        { name: "Tuition fees", description: "", icon: "🎓", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Education & Personal Development" },
        { name: "Books & Materials", description: "", icon: "📚", iconType: "emoji", color: "#10B981", isPublic: true, group: "Education & Personal Development" },
        { name: "Online courses / Subscriptions", description: "", icon: "💻", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "Education & Personal Development" },
        { name: "Training / Certifications", description: "", icon: "📜", iconType: "emoji", color: "#EF4444", isPublic: true, group: "Education & Personal Development" },
        { name: "Workshops / Seminars", description: "", icon: "🎪", iconType: "emoji", color: "#06B6D4", isPublic: true, group: "Education & Personal Development" },
        { name: "Language learning", description: "", icon: "🗣️", iconType: "emoji", color: "#A855F7", isPublic: true, group: "Education & Personal Development" },
        { name: "Coaching / Mentoring", description: "", icon: "👥", iconType: "emoji", color: "#10B981", isPublic: true, group: "Education & Personal Development" },

        // Bills & Subscriptions
        { name: "Streaming (Netflix, Spotify, etc.)", description: "", icon: "📺", iconType: "emoji", color: "#EC4899", isPublic: true, group: "Bills & Subscriptions" },
        { name: "Cloud services", description: "", icon: "☁️", iconType: "emoji", color: "#06B6D4", isPublic: true, group: "Bills & Subscriptions" },
        { name: "Magazine / Membership fees", description: "", icon: "📰", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Bills & Subscriptions" },
        { name: "Software subscriptions", description: "", icon: "💿", iconType: "emoji", color: "#3B82F6", isPublic: true, group: "Bills & Subscriptions" },
        { name: "Gym membership", description: "", icon: "🏃", iconType: "emoji", color: "#10B981", isPublic: true, group: "Bills & Subscriptions" },
        { name: "Mobile apps / Games", description: "", icon: "📱", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "Bills & Subscriptions" },
        { name: "VPN / Security", description: "", icon: "🔐", iconType: "emoji", color: "#6B7280", isPublic: true, group: "Bills & Subscriptions" },

        // Family & Children
        { name: "Childcare / Babysitting", description: "", icon: "👶", iconType: "emoji", color: "#06B6D4", isPublic: true, group: "Family & Children" },
        { name: "School fees", description: "", icon: "🏫", iconType: "emoji", color: "#10B981", isPublic: true, group: "Family & Children" },
        { name: "Toys & Supplies", description: "", icon: "🧸", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "Family & Children" },
        { name: "Family outings", description: "", icon: "👨‍👩‍👧‍👦", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Family & Children" },
        { name: "Kids activities / Classes", description: "", icon: "⚽", iconType: "emoji", color: "#F97316", isPublic: true, group: "Family & Children" },
        { name: "Birthday parties / Celebrations", description: "", icon: "🎈", iconType: "emoji", color: "#EC4899", isPublic: true, group: "Family & Children" },
        { name: "Allowances", description: "", icon: "💸", iconType: "emoji", color: "#10B981", isPublic: true, group: "Family & Children" },
        { name: "Baby supplies (diapers, formula)", description: "", icon: "🍼", iconType: "emoji", color: "#06B6D4", isPublic: true, group: "Family & Children" },
        { name: "Family sports / Recreation", description: "", icon: "🏀", iconType: "emoji", color: "#EF4444", isPublic: true, group: "Family & Children" },

        // Debt & Savings
        { name: "Loan repayments", description: "", icon: "🏦", iconType: "emoji", color: "#84CC16", isPublic: true, group: "Debt & Savings" },
        { name: "Credit card payments", description: "", icon: "💳", iconType: "emoji", color: "#EF4444", isPublic: true, group: "Debt & Savings" },
        { name: "Emergency fund", description: "", icon: "🐷", iconType: "emoji", color: "#10B981", isPublic: true, group: "Debt & Savings" },
        { name: "Investments", description: "", icon: "📈", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Debt & Savings" },

        // Insurance
        { name: "Life insurance", description: "", icon: "🛡️", iconType: "emoji", color: "#6B7280", isPublic: true, group: "Insurance" },
        { name: "Health insurance (if not under Health group)", description: "", icon: "⚕️", iconType: "emoji", color: "#EF4444", isPublic: true, group: "Insurance" },
        { name: "Property / Car insurance", description: "", icon: "🏠", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "Insurance" },

        // Leisure & Entertainment
        { name: "Travel / Holidays", description: "", icon: "✈️", iconType: "emoji", color: "#F97316", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Flight tickets", description: "", icon: "🛫", iconType: "emoji", color: "#3B82F6", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Hotel / Accommodation", description: "", icon: "🏨", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Vacation activities", description: "", icon: "⛰️", iconType: "emoji", color: "#10B981", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Souvenirs / Travel shopping", description: "", icon: "🎁", iconType: "emoji", color: "#EC4899", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Travel insurance", description: "", icon: "🧳", iconType: "emoji", color: "#6B7280", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Car rental / Transportation", description: "", icon: "🚙", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Movies / Concerts", description: "", icon: "🎟️", iconType: "emoji", color: "#EC4899", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Theater / Shows", description: "", icon: "🎭", iconType: "emoji", color: "#A855F7", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Sports events", description: "", icon: "🏆", iconType: "emoji", color: "#F97316", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Hobbies", description: "", icon: "🎨", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Games", description: "", icon: "🎮", iconType: "emoji", color: "#10B981", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Books / Reading", description: "", icon: "📖", iconType: "emoji", color: "#6366F1", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Photography", description: "", icon: "📷", iconType: "emoji", color: "#14B8A6", isPublic: true, group: "Leisure & Entertainment" },
        { name: "Music / Instruments", description: "", icon: "🎵", iconType: "emoji", color: "#EC4899", isPublic: true, group: "Leisure & Entertainment" },

        // Shopping & Personal Care
        { name: "Clothing & Accessories", description: "", icon: "👕", iconType: "emoji", color: "#DB2777", isPublic: true, group: "Shopping & Personal Care" },
        { name: "Shoes / Footwear", description: "", icon: "👟", iconType: "emoji", color: "#F97316", isPublic: true, group: "Shopping & Personal Care" },
        { name: "Jewelry / Watches", description: "", icon: "⌚", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Shopping & Personal Care" },
        { name: "Haircuts / Salon", description: "", icon: "✂️", iconType: "emoji", color: "#EC4899", isPublic: true, group: "Shopping & Personal Care" },
        { name: "Beauty treatments", description: "", icon: "✨", iconType: "emoji", color: "#A855F7", isPublic: true, group: "Shopping & Personal Care" },
        { name: "Skincare products", description: "", icon: "🧴", iconType: "emoji", color: "#14B8A6", isPublic: true, group: "Shopping & Personal Care" },
        { name: "Cosmetics / Makeup", description: "", icon: "💄", iconType: "emoji", color: "#EC4899", isPublic: true, group: "Shopping & Personal Care" },
        { name: "Grooming supplies", description: "", icon: "🚿", iconType: "emoji", color: "#06B6D4", isPublic: true, group: "Shopping & Personal Care" },
        { name: "Fragrances / Perfumes", description: "", icon: "🧪", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "Shopping & Personal Care" },
        { name: "Nail care / Manicure", description: "", icon: "💅", iconType: "emoji", color: "#EC4899", isPublic: true, group: "Shopping & Personal Care" },

        // General
        { name: "Pets / Pet care", description: "", icon: "🐶", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "General" },
        { name: "Veterinary care", description: "", icon: "🐾", iconType: "emoji", color: "#10B981", isPublic: true, group: "General" },
        { name: "Pet supplies / Food", description: "", icon: "🦴", iconType: "emoji", color: "#8B5CF6", isPublic: true, group: "General" },
        { name: "Donations / Charity", description: "", icon: "💝", iconType: "emoji", color: "#EF4444", isPublic: true, group: "General" },
        { name: "Gifts", description: "", icon: "🎁", iconType: "emoji", color: "#EC4899", isPublic: true, group: "General" },
        { name: "Postage / Shipping", description: "", icon: "✉️", iconType: "emoji", color: "#06B6D4", isPublic: true, group: "General" },
        { name: "Legal fees", description: "", icon: "⚖️", iconType: "emoji", color: "#6B7280", isPublic: true, group: "General" },
        { name: "Taxes", description: "", icon: "🧾", iconType: "emoji", color: "#EF4444", isPublic: true, group: "General" },
        { name: "Bank fees", description: "", icon: "🏧", iconType: "emoji", color: "#F59E0B", isPublic: true, group: "General" },
        { name: "Others", description: "Miscellaneous expenses that don't fit into other categories", icon: "📋", iconType: "emoji", color: "#9CA3AF", isPublic: true, group: "General" }
    ]
};

export interface CategoryData {
    categoryGroups: CategoryGroup[]
    categories: Category[]
}
