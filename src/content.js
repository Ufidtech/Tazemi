// Central content constants for public pages (editable without touching components)
export const meta = {
    home: {
        title: "Tazémi — Bio-Shield & IoT for produce preservation",
        description: "Bio-Shield is an organic edible coating combined with IoT monitoring to extend shelf life of perishable produce without cold chain.",
        url: "https://tazemi.com/",
    },
    about: {
        title: "About Tazémi — Organic, data-driven preservation",
        description: "Learn how Tazémi combines Bio-Shield edible coating with IoT monitoring to reduce post-harvest losses in Nigeria.",
        url: "https://tazemi.com/about",
    },
    product: {
        title: "Product — Bio-Shield & IoT sensor layer",
        description: "Detailed overview of Tazémi's Bio-Shield formulation, sensor stack, and Coating-as-a-Service model.",
        url: "https://tazemi.com/product",
    },
    team: {
        title: "Team — Tazémi founders and technical leads",
        description: "Meet the 8-person team driving Tazémi's bio-digital preservation technology and operational platform.",
        url: "https://tazemi.com/team",
    },
    impact: {
        title: "Impact — social, economic and climate outcomes",
        description: "Projected impact metrics for food waste reduction, CO₂ savings, jobs, and SDG alignment for Tazémi.",
        url: "https://tazemi.com/impact",
    },
    investors: {
        title: "Investors — pitch deck, executive summary, financial model",
        description: "Download investor-ready assets and review Tazémi's traction, awards, and competition wins.",
        url: "https://tazemi.com/investors",
    },
    contact: {
        title: "Contact — investment, grant, and pilot enquiries",
        description: "Reach Tazémi for investment, grant partnerships, pilot programmes, or general enquiries.",
        url: "https://tazemi.com/contact",
    },
};

export const home = {
    hero: {
        headline: "Nigeria loses ₦72 billion in tomatoes every year. We built the solution.",
        sub: "Bio-Shield is an organic, intelligent coating that extends tomato shelf life — without cold chain infrastructure.",
        ctaPrimary: "View Dashboard →",
        ctaSecondary: "How It Works",
    },
    stats: [
        ["₦5T", "Nigeria annual\npost-harvest loss", "(FAO/NBS estimate)"],
        ["₦72B", "Tomato losses\nin transit yearly", "(FAOSTAT-derived)"],
        ["40–60%", "Yield destroyed\nbefore market", "(FAO / World Bank)"],
        ["48 hrs", "Tomato shelf life\nwithout coating", "(ambient conditions)"],
    ],
    steps: [
        ["01", "Hub Intake", "Aggregator delivers tomatoes. Bio-Shield is applied — graded, coated, QR-labelled.", "🏭"],
        ["02", "IoT Deploy", "ESP32 sensor array mounts in truck. Temperature, humidity, gas, GPS tracking begins.", "📡"],
        ["03", "Live Monitoring", "Sensor data streams in real-time. Threshold breaches trigger alerts.", "📲"],
        ["04", "Delivery Scan", "QR scan at destination confirms arrival. Buyer rates condition. Feedback logged.", "✅"],
        ["05", "R&D Feedback", "Transit data drives formulation improvements — a self-improving bio-digital system.", "🔬"],
    ],
    traction: [
        ["🏆", "1st Place", "WTP Green Sustainability Competition 2026 · $600 award"],
        ["🎯", "iDICE Founders Lab", "Cohort 1 — Selected for accelerator programme"],
        ["👥", "8-Person Team", "Hardware · Software · Formulation · Design"],
        ["🔬", "Active R&D", "Bio-Shield BS-v1.2 achieving 17-day shelf life in trials"],
    ],
    teamPreview: [
        { name: "Qamorudeen Oriade Ojo", role: "Founder & CEO · IoT Lead", bio: "Systems thinker building Tazémi's bio-digital architecture. IEEE member.", initials: "QO" },
        { name: "Fatia Oriire Akintoye", role: "Co-Founder & CTO · Bio-Shield Lead", bio: "Food Science specialist driving formulation R&D. BS-v1.2: 17 days and counting.", initials: "FA" },
    ],
};

export const about = {
    hero: {
        label: "About Tazémi",
        title: "Preserving Nigeria's Harvest",
        subtitle: "We build bio-digital technology that solves a ₦5 trillion problem — one crate at a time.",
    },
    mission: {
        label: "Our Mission",
        title: "End Nigeria's post-harvest crisis",
        paragraphs: [
            "Nigeria wastes an estimated ₦5 trillion worth of produce every year. Tomatoes alone account for ₦72 billion — destroyed between farm and market through bruising, heat, and microbial decay.",
            "Our mission is to build the technology layer that closes this gap — organic, data-driven, and built specifically for Nigeria's infrastructure reality.",
        ],
    },
    meaning: {
        title: "What \"Tazémi\" means",
        details: [
            { label: "Taze (Hausa)", value: "fresh, renewed." },
            { label: "Emi (Yoruba)", value: "life, breath." },
        ],
        copy: "Two languages. One mission. Freshness restored to life.",
    },
    concept: {
        label: "The Bio-Digital Concept",
        title: "Not just a coating — a learning system",
        cards: [
            { icon: "🧪", title: "Bio-Shield", copy: "Organic edible coating — Aloe vera gel + Cassava starch. Applied at aggregation hubs. Zero capex for farmers." },
            { icon: "📡", title: "IoT Layer", copy: "ESP32 sensor network in every truck. Real-time temperature, humidity, gas, vibration, and GPS data." },
            { icon: "🔄", title: "The Feedback Loop", copy: "Transit data feeds directly into formulation R&D. Bio-Shield gets smarter with every delivery — a data moat competitors cannot replicate." },
        ],
    },
    values: [
        { title: "Honest Science", copy: "We publish what we know and what we don't. BS-v1.2 achieves 17 days in trials. We say 17, not 23." },
        { title: "Asset-Light", copy: "We control the technology, not the infrastructure. Coating-as-a-Service: zero capex for the aggregator." },
        { title: "Built for Nigeria", copy: "No cold chain assumptions. Our technology works in ambient heat, on bad roads, with intermittent connectivity." },
        { title: "Data-Driven", copy: "Every formulation decision is backed by transit data. Intuition is a starting point, not a conclusion." },
    ],
};

export const product = {
    hero: {
        label: "The Product",
        title: "Bio-Shield — How It Works",
        subtitle: "A 100% organic edible coating combined with an IoT data layer that continuously improves it.",
    },
    validation: {
        notice: "Validation status: Bio-Shield formulation BS-v1.2 has achieved 17-day shelf-life extension in laboratory trials. Independent field validation is in progress. All performance figures are trial results from controlled conditions.",
    },
    formulation: {
        label: "Formulation",
        title: "What Bio-Shield is made of",
        ingredients: [
            { name: "Aloe vera gel", copy: "Primary antimicrobial and moisture-barrier agent. 20% v/v in BS-v1.2. Nigeria-available in bulk." },
            { name: "Cassava starch", copy: "Structural polymer forming the coating matrix. 2% w/v in BS-v1.2. Low cost, widely available." },
            { name: "Water", copy: "Carrier medium. Treated for microbial safety." },
        ],
    },
    trials: {
        label: "Trial Results — BS-v1.2",
        items: [
            { metric: "Shelf life", value: "17 days", note: "Target: 15–23 days ✓" },
            { metric: "Weight loss (Day 7)", value: "6.8%", note: "↓ from 12.4% in BS-v1.0" },
            { metric: "Visual condition (Day 7)", value: "Excellent", note: "Firm, no visible decay" },
            { metric: "Microbial count", value: "1.8 CFU/g", note: "↓ 57% vs uncoated" },
        ],
    },
    literature: {
        label: "Literature Basis",
        title: "Standing on published science",
        citations: [
            { title: "Marpudi et al. (2011)", copy: "Aloe vera coating on mango: 8-day to 22-day shelf-life extension at 25°C. Analogous coating chemistry." },
            { title: "Vieira et al. (2016)", copy: "Cassava starch coating on strawberries: 2–3× shelf-life extension. Confirmed moisture-barrier properties." },
            { title: "Ali et al. (2016)", copy: "Aloe vera on tomatoes specifically: antimicrobial activity against Botrytis cinerea and Alternaria alternata — primary spoilage fungi." },
            { title: "Fagundes et al. (2015)", copy: "Combined starch + polysaccharide coatings on tomatoes: extended shelf life 12–18 days vs 4–6 days control." },
        ],
    },
    iot: {
        label: "IoT Layer",
        title: "The sensor network",
        sensors: [
            { icon: "🌡️", title: "Temperature", copy: "DHT22 sensor. Alert threshold: >34°C" },
            { icon: "💧", title: "Humidity", copy: "%RH sensor. Alert threshold: >70%" },
            { icon: "🌫️", title: "Gas / VOC", copy: "MQ-135 sensor. Alert threshold: >500ppm" },
            { icon: "📍", title: "GPS", copy: "NEO-6M module. Geofence arrival detection." },
            { icon: "📳", title: "Vibration", copy: "MPU6050 IMU. Alert threshold: >2.5g" },
            { icon: "📶", title: "Data Transmission", copy: "SIM800L GSM. Streams to Firebase every 15 min." },
        ],
    },
    caas: {
        values: [
            { value: "₦600–900", label: "Per crate (Coating-as-a-Service)" },
            { value: "₦20,000", label: "Per truck per month (IoT lease)" },
            { value: "Zero", label: "Capex for aggregator client" },
        ],
    },
};

export const teamContent = {
    hero: {
        label: "The Team",
        title: "8 people. One mission.",
        subtitle: "Hardware. Software. Formulation. Design. Every discipline we need, in house.",
    },
};

export const impact = {
    hero: {
        label: "Impact",
        title: "Measuring what matters",
        subtitle: "All figures below are projections based on current trial data and literature estimates. Field-validated metrics will be published post-pilot.",
    },
    metrics: [
        { value: "₦6–8.4M", label: "Saved per aggregator per year (at scale)", category: "Economic" },
        { value: "4.4 tonnes", label: "CO₂ saved per tonne of food waste prevented", category: "Climate" },
        { value: "300–450", label: "Direct jobs by Year 5 (15 facilities)", category: "Employment" },
        { value: "20–30", label: "Direct jobs per hub facility", category: "Employment" },
    ],
    sdgs: [
        { title: "SDG 2 — Zero Hunger", copy: "Reducing post-harvest losses directly increases food availability and stabilises farm-gate prices." },
        { title: "SDG 8 — Decent Work", copy: "Each Tazémi hub creates 20–30 jobs requiring no university degree. Inclusive employment." },
        { title: "SDG 12 — Responsible Consumption", copy: "Organic coating. No synthetic preservatives. Biodegradable application process." },
        { title: "SDG 13 — Climate Action", copy: "4.4 tonnes CO₂ saved per tonne of food waste prevented. Measurable climate contribution." },
    ],
};

export const investors = {
    hero: {
        label: "Investor Resources",
        title: "Due Diligence Assets",
        subtitle: "Everything you need to evaluate Tazémi — in one place.",
    },
    resources: [
        { icon: "📊", title: "Pitch Deck", description: "10-slide business profile deck covering problem, solution, team, traction, financials, and ask.", action: "Request deck" },
        { icon: "📄", title: "One-Page Summary", description: "Single-page overview: problem, solution, market, team, ask. PDF format.", action: "Request summary" },
        { icon: "💰", title: "Financial Model", description: "18-month projection with assumptions, scenarios, and use-of-funds breakdown.", action: "Request model" },
    ],
    traction: [
        { icon: "🏆", title: "1st Place — World Technology Partners Green Sustainability Competition 2026", copy: "April 2026 · $600 honorarium · Virtual international competition · Bio-digital solution selected from global applicants." },
        { icon: "🎯", title: "iDICE Founders Lab — Cohort 1 Selected", copy: "Innovation accelerator selection · Lab access and mentorship programme." },
    ],
};

export const contact = {
    hero: {
        label: "Contact",
        title: "Get in Touch",
        subtitle: "Investment enquiries, grant partnerships, pilot partnerships — we'd like to hear from you.",
    },
    details: [
        { icon: "📧", label: "Email", value: "ojoqamorudeen88@gmail.com" },
        { icon: "🌐", label: "Website", value: "tazemi.com" },
        { icon: "📱", label: "Social", value: "@tazemi" },
        { icon: "📍", label: "Location", value: "FUTMinna, Niger State, Nigeria" },
    ],
    subjects: ["Investment Enquiry", "Grant Partnership", "Pilot Partnership", "General"],
    success: {
        title: "Message sent",
        subtitle: "We'll respond within 48 hours.",
    },
};

export default { meta, home, about, product, teamContent, impact, investors, contact };
