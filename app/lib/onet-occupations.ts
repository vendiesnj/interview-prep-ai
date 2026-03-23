/**
 * O*NET-informed occupation database
 * RIASEC codes: R=Realistic I=Investigative A=Artistic S=Social E=Enterprising C=Conventional
 * aiRisk: 0-100 (% of tasks automatable, based on Brookings/McKinsey/Oxford research)
 * salary: [min, max] in $K/year (entry to experienced)
 */

export type Education =
  | "no_degree"       // no formal credential required
  | "certificate"     // trade cert, bootcamp, 6-18 mo program
  | "associate"       // 2-year degree or apprenticeship
  | "bachelor"        // 4-year degree
  | "master"          // graduate degree
  | "doctoral";       // PhD, MD, JD

export interface Occupation {
  id: string;
  title: string;
  riasec: string;           // top 2-3 codes, ordered by strength e.g. "RIE"
  category: string;         // broad industry label
  aiRisk: number;           // 0-100
  salary: [number, number]; // [min, max] in $K
  education: Education;
  description: string;
  sideHustles: string[];    // directly matchable side income ideas
  entrepreneurPath?: string; // if high E, entrepreneurship angle
  trades?: boolean;         // flag for vocational/trade paths
}

const OCCUPATIONS: Occupation[] = [

  // ── REALISTIC (R) ─────────────────────────────────────────────────────────

  { id: "electrician", title: "Electrician", riasec: "RCI", category: "Skilled Trades", aiRisk: 15, salary: [55, 105], education: "certificate", description: "Install, maintain, and repair electrical systems in homes, businesses, and industrial facilities.", sideHustles: ["Residential electrical side work", "Smart home installation", "EV charger installation"], entrepreneurPath: "Electrical contracting business", trades: true },
  { id: "plumber", title: "Plumber", riasec: "RCI", category: "Skilled Trades", aiRisk: 12, salary: [55, 110], education: "certificate", description: "Install and repair pipes, fixtures, and systems for water, gas, and drainage.", sideHustles: ["Weekend plumbing repairs", "Water heater installation", "Bathroom remodeling"], entrepreneurPath: "Plumbing contracting business", trades: true },
  { id: "hvac_tech", title: "HVAC/R Technician", riasec: "RCI", category: "Skilled Trades", aiRisk: 18, salary: [50, 100], education: "certificate", description: "Install, maintain, and repair heating, cooling, ventilation, and refrigeration systems.", sideHustles: ["Residential HVAC side jobs", "Commercial maintenance contracts"], entrepreneurPath: "HVAC service company", trades: true },
  { id: "welder", title: "Welder / Fabricator", riasec: "RCI", category: "Skilled Trades", aiRisk: 40, salary: [45, 90], education: "certificate", description: "Fuse metal parts using welding equipment for manufacturing, construction, and repair.", sideHustles: ["Custom metalwork/fabrication", "Welding repairs", "Artistic metal sculpture"], entrepreneurPath: "Custom fabrication shop", trades: true },
  { id: "auto_tech", title: "Automotive Technician", riasec: "RIC", category: "Skilled Trades", aiRisk: 25, salary: [45, 90], education: "certificate", description: "Diagnose, maintain, and repair vehicles including engines, brakes, and electronics.", sideHustles: ["Mobile mechanic service", "Fleet maintenance contracts", "Auto detailing"], entrepreneurPath: "Independent auto repair shop", trades: true },
  { id: "diesel_tech", title: "Diesel Mechanic", riasec: "RIC", category: "Skilled Trades", aiRisk: 22, salary: [50, 95], education: "certificate", description: "Maintain and repair diesel engines in trucks, buses, construction equipment, and generators.", sideHustles: ["Truck fleet maintenance", "Mobile diesel repair"], entrepreneurPath: "Diesel repair business", trades: true },
  { id: "cnc_machinist", title: "CNC Machinist", riasec: "RCI", category: "Advanced Manufacturing", aiRisk: 55, salary: [48, 88], education: "certificate", description: "Set up and operate computer-controlled machining tools to produce precision metal and plastic parts.", sideHustles: ["Prototype manufacturing", "Custom parts for hobbyists"], entrepreneurPath: "CNC job shop", trades: true },
  { id: "aircraft_mechanic", title: "Aircraft Mechanic", riasec: "RIC", category: "Aviation", aiRisk: 20, salary: [60, 115], education: "certificate", description: "Inspect, maintain, and repair aircraft structures, engines, and avionic systems.", sideHustles: ["Aviation consulting", "Private aircraft maintenance"], trades: true },
  { id: "wind_turbine_tech", title: "Wind Turbine Technician", riasec: "RIC", category: "Clean Energy", aiRisk: 18, salary: [55, 90], education: "certificate", description: "Install, inspect, maintain, and repair wind turbines.", sideHustles: ["Solar panel installation", "Renewable energy consulting"], trades: true },
  { id: "solar_installer", title: "Solar Panel Installer", riasec: "RCI", category: "Clean Energy", aiRisk: 22, salary: [45, 80], education: "certificate", description: "Assemble, install, and maintain solar panel systems on rooftops and in solar farms.", sideHustles: ["Residential solar side jobs", "EV charger installation"], entrepreneurPath: "Solar installation company", trades: true },
  { id: "construction_manager", title: "Construction Manager", riasec: "ERC", category: "Construction", aiRisk: 20, salary: [75, 155], education: "bachelor", description: "Plan, coordinate, budget, and supervise construction projects from start to completion.", sideHustles: ["Real estate flipping", "Construction consulting"], entrepreneurPath: "General contracting firm" },
  { id: "civil_engineer", title: "Civil Engineer", riasec: "RIE", category: "Engineering", aiRisk: 30, salary: [70, 130], education: "bachelor", description: "Design and oversee construction of infrastructure including roads, bridges, and water systems.", sideHustles: ["Engineering consulting", "Land development analysis"], entrepreneurPath: "Civil engineering firm" },
  { id: "mechanical_engineer", title: "Mechanical Engineer", riasec: "RIC", category: "Engineering", aiRisk: 32, salary: [72, 138], education: "bachelor", description: "Design, develop, and test mechanical devices and systems.", sideHustles: ["Product design consulting", "3D printing service"], entrepreneurPath: "Product development firm" },
  { id: "industrial_engineer", title: "Industrial Engineer", riasec: "RCI", category: "Engineering", aiRisk: 35, salary: [70, 130], education: "bachelor", description: "Optimize production systems, workflows, and processes to reduce waste and increase efficiency.", sideHustles: ["Operations consulting", "Process improvement freelancing"] },
  { id: "landscape_arch", title: "Landscape Architect", riasec: "RAI", category: "Design & Environment", aiRisk: 22, salary: [58, 110], education: "bachelor", description: "Design outdoor spaces including parks, campuses, and residential landscapes.", sideHustles: ["Residential landscape design", "Garden consultation"], entrepreneurPath: "Landscape design studio" },
  { id: "carpenter", title: "Carpenter", riasec: "RCE", category: "Skilled Trades", aiRisk: 28, salary: [45, 90], education: "no_degree", description: "Build, install, and repair structures and fixtures made of wood and other materials.", sideHustles: ["Custom furniture building", "Home renovation side work", "Deck and fence installation"], entrepreneurPath: "Custom woodworking or contracting business", trades: true },
  { id: "pipefitter", title: "Pipefitter / Steamfitter", riasec: "RCI", category: "Skilled Trades", aiRisk: 15, salary: [60, 115], education: "certificate", description: "Install and repair high-pressure pipe systems for industrial and commercial facilities.", sideHustles: ["Industrial maintenance contracts"], trades: true },
  { id: "millwright", title: "Millwright", riasec: "RCI", category: "Skilled Trades", aiRisk: 20, salary: [60, 105], education: "certificate", description: "Install, maintain, and repair industrial machinery in manufacturing plants and power stations.", trades: true, sideHustles: ["Industrial equipment consulting"] },
  { id: "ironworker", title: "Ironworker / Structural Steel", riasec: "RCE", category: "Skilled Trades", aiRisk: 30, salary: [55, 100], education: "no_degree", description: "Erect steel frameworks for buildings, bridges, and other structures.", trades: true, sideHustles: ["Custom metal railing installation", "Ornamental iron work"] },
  { id: "heavy_equip_operator", title: "Heavy Equipment Operator", riasec: "RCE", category: "Construction", aiRisk: 40, salary: [50, 90], education: "certificate", description: "Operate bulldozers, cranes, excavators, and other heavy machinery on construction sites.", trades: true, sideHustles: ["Land clearing side jobs", "Equipment rental"], entrepreneurPath: "Equipment rental company" },

  // ── INVESTIGATIVE (I) ─────────────────────────────────────────────────────

  { id: "data_scientist", title: "Data Scientist", riasec: "ICA", category: "Technology", aiRisk: 28, salary: [95, 175], education: "master", description: "Extract insights from complex data sets using statistics, machine learning, and programming.", sideHustles: ["Freelance data analysis", "Kaggle competitions", "Data consulting"], entrepreneurPath: "Data consulting firm" },
  { id: "software_engineer", title: "Software Engineer", riasec: "ICR", category: "Technology", aiRisk: 32, salary: [90, 185], education: "bachelor", description: "Design, build, and maintain software applications and systems.", sideHustles: ["Freelance app development", "SaaS side project", "Open source consulting"], entrepreneurPath: "Software startup or dev agency" },
  { id: "machine_learning_eng", title: "Machine Learning Engineer", riasec: "ICA", category: "Technology", aiRisk: 22, salary: [110, 210], education: "master", description: "Build and deploy machine learning models and AI systems at scale.", sideHustles: ["AI consulting", "ML model freelancing"], entrepreneurPath: "AI product company" },
  { id: "biomedical_engineer", title: "Biomedical Engineer", riasec: "IRS", category: "Healthcare Technology", aiRisk: 25, salary: [75, 140], education: "bachelor", description: "Design medical devices, diagnostic equipment, and biotechnology products.", sideHustles: ["Medical device consulting", "Healthcare technology advising"] },
  { id: "research_scientist", title: "Research Scientist", riasec: "IRA", category: "Research & Academia", aiRisk: 18, salary: [75, 155], education: "doctoral", description: "Conduct original research to advance scientific knowledge in a specific domain.", sideHustles: ["Technical writing", "Academic consulting", "Online course creation"] },
  { id: "statistician", title: "Statistician / Quantitative Analyst", riasec: "ICE", category: "Finance & Analytics", aiRisk: 35, salary: [80, 155], education: "master", description: "Apply statistical methods to design surveys, analyze data, and inform decisions.", sideHustles: ["Freelance statistical analysis", "Survey design consulting"] },
  { id: "cybersecurity_analyst", title: "Cybersecurity Analyst", riasec: "ICR", category: "Technology", aiRisk: 22, salary: [80, 155], education: "bachelor", description: "Protect computer networks and systems from cyberattacks and data breaches.", sideHustles: ["Security consulting", "Penetration testing freelance", "IT security auditing"], entrepreneurPath: "Cybersecurity consulting firm" },
  { id: "ux_researcher", title: "UX Researcher", riasec: "IAS", category: "Technology / Design", aiRisk: 28, salary: [75, 145], education: "bachelor", description: "Study user behavior to inform product design through interviews, surveys, and testing.", sideHustles: ["Freelance usability testing", "UX consulting for startups"] },
  { id: "financial_analyst", title: "Financial Analyst", riasec: "ICE", category: "Finance", aiRisk: 48, salary: [70, 135], education: "bachelor", description: "Evaluate investments, analyze financial data, and advise on business decisions.", sideHustles: ["Investment research freelancing", "Financial modeling consulting"] },
  { id: "actuary", title: "Actuary", riasec: "ICE", category: "Insurance & Finance", aiRisk: 38, salary: [80, 175], education: "bachelor", description: "Assess financial risks using mathematics, statistics, and financial theory.", sideHustles: ["Risk consulting", "Insurance modeling freelancing"] },
  { id: "geologist", title: "Geologist / Earth Scientist", riasec: "IRE", category: "Earth Sciences", aiRisk: 25, salary: [65, 130], education: "bachelor", description: "Study the composition, structure, and history of the Earth and its resources.", sideHustles: ["Environmental consulting", "Mining/oil consulting"] },
  { id: "environmental_scientist", title: "Environmental Scientist", riasec: "IRS", category: "Environmental", aiRisk: 28, salary: [60, 115], education: "bachelor", description: "Research environmental problems and develop solutions to protect ecosystems and human health.", sideHustles: ["Environmental impact consulting", "Sustainability auditing"], entrepreneurPath: "Environmental consulting firm" },
  { id: "network_engineer", title: "Network Engineer", riasec: "ICR", category: "Technology", aiRisk: 30, salary: [80, 150], education: "bachelor", description: "Design, implement, and manage computer networks for organizations.", sideHustles: ["IT consulting", "Network setup for small businesses", "Home network installation"] },
  { id: "pharmacist", title: "Pharmacist", riasec: "ISC", category: "Healthcare", aiRisk: 45, salary: [105, 155], education: "doctoral", description: "Dispense medications, counsel patients, and ensure safe drug use.", sideHustles: ["Medication therapy management consulting", "Health coaching"] },
  { id: "physician", title: "Physician / Doctor", riasec: "ISI", category: "Healthcare", aiRisk: 12, salary: [180, 350], education: "doctoral", description: "Diagnose and treat illnesses and injuries, prescribe medications, and coordinate patient care.", sideHustles: ["Medical consulting", "Telehealth practice", "Medical writing"] },
  { id: "dentist", title: "Dentist", riasec: "ISR", category: "Healthcare", aiRisk: 15, salary: [140, 250], education: "doctoral", description: "Diagnose and treat oral health conditions including cavities, gum disease, and misalignment.", sideHustles: ["Mobile dental consulting", "Dental product reviews"], entrepreneurPath: "Private dental practice" },
  { id: "veterinarian", title: "Veterinarian", riasec: "IRS", category: "Healthcare", aiRisk: 18, salary: [90, 165], education: "doctoral", description: "Diagnose, treat, and prevent diseases in animals.", sideHustles: ["Mobile vet practice", "Pet health consulting"], entrepreneurPath: "Private veterinary clinic" },
  { id: "economist", title: "Economist", riasec: "ICE", category: "Research & Policy", aiRisk: 35, salary: [85, 165], education: "master", description: "Study production and distribution of resources, goods, and services.", sideHustles: ["Economic consulting", "Policy research freelancing"] },
  { id: "biochemist", title: "Biochemist / Molecular Biologist", riasec: "IRA", category: "Life Sciences", aiRisk: 20, salary: [70, 145], education: "doctoral", description: "Study the chemical processes within and related to living organisms.", sideHustles: ["Biotech consulting", "Science writing"] },

  // ── ARTISTIC (A) ─────────────────────────────────────────────────────────

  { id: "graphic_designer", title: "Graphic Designer", riasec: "AEC", category: "Creative & Design", aiRisk: 42, salary: [50, 100], education: "bachelor", description: "Create visual concepts for advertising, branding, publications, and digital media.", sideHustles: ["Freelance logo design", "Brand identity for small businesses", "Print-on-demand products"], entrepreneurPath: "Design studio or agency" },
  { id: "ux_ui_designer", title: "UX/UI Designer", riasec: "AIE", category: "Technology / Design", aiRisk: 35, salary: [75, 145], education: "bachelor", description: "Design digital interfaces and experiences that are usable, accessible, and visually compelling.", sideHustles: ["Freelance app design", "Website design for small businesses", "Design system consulting"], entrepreneurPath: "Design studio" },
  { id: "art_director", title: "Art Director", riasec: "AEC", category: "Creative & Design", aiRisk: 30, salary: [75, 145], education: "bachelor", description: "Lead visual style and imagery in advertising, publishing, film, and TV.", sideHustles: ["Freelance creative direction", "Brand consulting"] },
  { id: "copywriter", title: "Copywriter / Content Strategist", riasec: "AEC", category: "Marketing & Media", aiRisk: 55, salary: [50, 110], education: "bachelor", description: "Write persuasive content for ads, websites, emails, and social media.", sideHustles: ["Freelance copywriting", "Email newsletter service", "Content agency"], entrepreneurPath: "Copywriting agency" },
  { id: "film_director", title: "Film / Video Director", riasec: "AEI", category: "Media & Entertainment", aiRisk: 20, salary: [55, 165], education: "bachelor", description: "Oversee the artistic and technical aspects of film, TV, and video production.", sideHustles: ["Wedding videography", "Corporate video production", "YouTube channel"], entrepreneurPath: "Video production company" },
  { id: "animator", title: "Animator / Motion Designer", riasec: "ARC", category: "Creative & Design", aiRisk: 40, salary: [52, 115], education: "bachelor", description: "Create animated visuals for film, TV, games, and digital media.", sideHustles: ["Freelance animation", "Explainer video production", "Social media content"], entrepreneurPath: "Animation studio" },
  { id: "architect", title: "Architect", riasec: "AIR", category: "Architecture & Design", aiRisk: 28, salary: [70, 140], education: "master", description: "Design buildings and spaces that are functional, safe, and aesthetically meaningful.", sideHustles: ["Residential design consulting", "Interior space planning"], entrepreneurPath: "Architecture firm" },
  { id: "interior_designer", title: "Interior Designer", riasec: "AER", category: "Design", aiRisk: 32, salary: [48, 100], education: "bachelor", description: "Plan and design interior spaces for residential and commercial clients.", sideHustles: ["E-design service", "Furniture flipping / staging", "Virtual design consulting"], entrepreneurPath: "Interior design studio" },
  { id: "photographer", title: "Photographer", riasec: "AER", category: "Creative Arts", aiRisk: 38, salary: [38, 90], education: "no_degree", description: "Create still images for commercial, artistic, journalistic, or personal use.", sideHustles: ["Portrait/wedding photography", "Real estate photography", "Stock photo licensing"], entrepreneurPath: "Photography studio" },
  { id: "fashion_designer", title: "Fashion Designer", riasec: "AEC", category: "Creative Arts", aiRisk: 35, salary: [50, 120], education: "bachelor", description: "Design clothing, footwear, and accessories, considering style, aesthetics, and market trends.", sideHustles: ["Custom clothing design", "Etsy fashion shop", "Fashion styling"], entrepreneurPath: "Fashion brand" },
  { id: "game_designer", title: "Video Game Designer", riasec: "AIE", category: "Technology / Creative", aiRisk: 30, salary: [65, 145], education: "bachelor", description: "Create the concepts, rules, and gameplay mechanics of video games.", sideHustles: ["Indie game development", "Game asset creation", "Game consulting"] },
  { id: "creative_director", title: "Creative Director", riasec: "AES", category: "Marketing & Media", aiRisk: 22, salary: [90, 185], education: "bachelor", description: "Lead the creative vision for brands, campaigns, or media properties.", sideHustles: ["Brand consulting", "Creative strategy workshops"], entrepreneurPath: "Creative agency" },
  { id: "music_producer", title: "Music Producer / Audio Engineer", riasec: "ARC", category: "Entertainment", aiRisk: 28, salary: [45, 115], education: "no_degree", description: "Develop musical sounds, oversee recording sessions, and mix final audio tracks.", sideHustles: ["Beat selling", "Podcast audio editing", "Jingle production"], entrepreneurPath: "Recording studio" },
  { id: "writer_author", title: "Writer / Author", riasec: "AIS", category: "Media & Publishing", aiRisk: 50, salary: [42, 105], education: "bachelor", description: "Create books, articles, scripts, or other written content for publication or media.", sideHustles: ["Freelance writing", "Self-publishing", "Ghostwriting", "Newsletter"] },
  { id: "web_designer", title: "Web Designer", riasec: "ACE", category: "Technology / Design", aiRisk: 45, salary: [50, 105], education: "certificate", description: "Design the visual layout and user experience of websites.", sideHustles: ["Small business website design", "Shopify store setup", "Website maintenance retainers"], entrepreneurPath: "Web design agency" },

  // ── SOCIAL (S) ─────────────────────────────────────────────────────────────

  { id: "registered_nurse", title: "Registered Nurse", riasec: "SIC", category: "Healthcare", aiRisk: 12, salary: [65, 120], education: "bachelor", description: "Provide and coordinate patient care, educate patients and families, and support physician teams.", sideHustles: ["Health coaching", "Medical staffing consulting", "Healthcare blogging"] },
  { id: "school_counselor", title: "School Counselor", riasec: "SAE", category: "Education", aiRisk: 15, salary: [52, 95], education: "master", description: "Help students with academic, social, and emotional development and career planning.", sideHustles: ["Private tutoring", "College application coaching", "Life coaching"] },
  { id: "social_worker", title: "Social Worker", riasec: "SEC", category: "Social Services", aiRisk: 18, salary: [48, 88], education: "master", description: "Help individuals and families cope with challenges including poverty, addiction, and mental illness.", sideHustles: ["Private practice therapy", "Community workshop facilitation", "Nonprofit consulting"] },
  { id: "physical_therapist", title: "Physical Therapist", riasec: "SIR", category: "Healthcare", aiRisk: 15, salary: [75, 120], education: "doctoral", description: "Rehabilitate patients with physical injuries or disabilities through exercise and treatment.", sideHustles: ["Personal training", "Sports rehab consulting", "Wellness coaching"], entrepreneurPath: "Private PT practice" },
  { id: "teacher_k12", title: "K-12 Teacher", riasec: "SAC", category: "Education", aiRisk: 20, salary: [45, 82], education: "bachelor", description: "Educate students in core academic subjects and support their social and cognitive development.", sideHustles: ["Private tutoring", "Curriculum development", "Online course creation", "Test prep coaching"], entrepreneurPath: "Tutoring center" },
  { id: "speech_therapist", title: "Speech-Language Pathologist", riasec: "SIA", category: "Healthcare", aiRisk: 18, salary: [70, 115], education: "master", description: "Diagnose and treat communication disorders including speech, language, and swallowing.", sideHustles: ["Private practice", "Teletherapy practice"], entrepreneurPath: "Private SLP practice" },
  { id: "hr_specialist", title: "HR Specialist / People Operations", riasec: "SEC", category: "Human Resources", aiRisk: 40, salary: [55, 105], education: "bachelor", description: "Recruit, support, and develop employees; manage benefits and organizational culture.", sideHustles: ["HR consulting for small businesses", "Resume coaching", "Career coaching"] },
  { id: "occupational_therapist", title: "Occupational Therapist", riasec: "SIR", category: "Healthcare", aiRisk: 15, salary: [72, 118], education: "master", description: "Help people regain or improve their ability to perform daily activities after illness or injury.", sideHustles: ["Accessibility consulting", "Adaptive product design"], entrepreneurPath: "Private OT practice" },
  { id: "public_health_officer", title: "Public Health Officer", riasec: "SIE", category: "Government / Public Health", aiRisk: 22, salary: [58, 108], education: "master", description: "Plan and implement programs to improve the health of communities.", sideHustles: ["Health program consulting", "Grant writing"], entrepreneurPath: "Public health consulting firm" },
  { id: "counselor_therapist", title: "Counselor / Psychotherapist", riasec: "SAI", category: "Mental Health", aiRisk: 12, salary: [50, 105], education: "master", description: "Help clients address mental health challenges through talk therapy and evidence-based interventions.", sideHustles: ["Private practice", "Online therapy", "Workshop facilitation"], entrepreneurPath: "Private therapy practice" },
  { id: "nonprofit_manager", title: "Nonprofit Program Manager", riasec: "SEA", category: "Nonprofit", aiRisk: 25, salary: [48, 88], education: "bachelor", description: "Develop and manage programs addressing social, environmental, or community issues.", sideHustles: ["Grant writing freelancing", "Nonprofit consulting"], entrepreneurPath: "Social enterprise founder" },
  { id: "community_health_worker", title: "Community Health Worker", riasec: "SCA", category: "Public Health", aiRisk: 18, salary: [38, 68], education: "certificate", description: "Serve as a liaison between healthcare services and communities to improve health outcomes.", sideHustles: ["Health education content", "Wellness coaching"] },
  { id: "personal_trainer", title: "Personal Trainer / Fitness Coach", riasec: "SRE", category: "Fitness & Wellness", aiRisk: 20, salary: [38, 85], education: "certificate", description: "Design and lead individualized exercise programs for clients.", sideHustles: ["Online fitness coaching", "Nutrition coaching", "Fitness content creation"], entrepreneurPath: "Personal training studio or online coaching brand" },
  { id: "professor", title: "College Professor", riasec: "SIA", category: "Education", aiRisk: 22, salary: [65, 150], education: "doctoral", description: "Teach undergraduate or graduate courses and conduct original research in an academic discipline.", sideHustles: ["Online course creation", "Academic consulting", "Book writing"] },
  { id: "pediatric_nurse", title: "Pediatric Nurse / Nurse Practitioner", riasec: "SIC", category: "Healthcare", aiRisk: 12, salary: [75, 135], education: "master", description: "Provide specialized healthcare for infants, children, and adolescents.", sideHustles: ["Parenting/infant care consulting", "Health writing"] },

  // ── ENTERPRISING (E) ─────────────────────────────────────────────────────

  { id: "entrepreneur", title: "Entrepreneur / Startup Founder", riasec: "EAI", category: "Entrepreneurship", aiRisk: 10, salary: [0, 500], education: "no_degree", description: "Identify market opportunities and build new businesses from the ground up.", sideHustles: ["Consulting in your domain", "Angel investing", "Business coaching"], entrepreneurPath: "This IS the path" },
  { id: "product_manager", title: "Product Manager", riasec: "EIC", category: "Technology", aiRisk: 25, salary: [95, 185], education: "bachelor", description: "Define product vision, strategy, and roadmap; work with engineering and design to ship features.", sideHustles: ["Product consulting", "PM coaching", "SaaS side project"], entrepreneurPath: "Product-led startup" },
  { id: "mgmt_consultant", title: "Management Consultant", riasec: "EIC", category: "Consulting", aiRisk: 30, salary: [90, 200], education: "bachelor", description: "Help organizations improve performance by analyzing problems and recommending strategies.", sideHustles: ["Independent consulting practice", "Business strategy advising", "Keynote speaking"], entrepreneurPath: "Boutique consulting firm" },
  { id: "investment_banker", title: "Investment Banker", riasec: "ECR", category: "Finance", aiRisk: 35, salary: [100, 300], education: "bachelor", description: "Help organizations raise capital through debt and equity and advise on mergers and acquisitions.", sideHustles: ["Financial modeling freelancing", "Angel investing", "Finance content creation"] },
  { id: "attorney", title: "Attorney / Lawyer", riasec: "EIS", category: "Legal", aiRisk: 28, salary: [80, 250], education: "doctoral", description: "Provide legal advice and representation to clients in civil, criminal, or specialized law.", sideHustles: ["Legal writing", "Contract review for freelancers", "Online legal advice platform"], entrepreneurPath: "Law firm or legal tech startup" },
  { id: "sales_director", title: "Sales Manager / Director", riasec: "ESC", category: "Sales", aiRisk: 30, salary: [80, 175], education: "bachelor", description: "Lead sales teams, develop strategies, and manage client relationships to drive revenue.", sideHustles: ["Sales consulting", "Commission-based side selling", "Sales coaching"], entrepreneurPath: "Sales agency or SaaS company" },
  { id: "marketing_manager", title: "Marketing Manager", riasec: "EAC", category: "Marketing", aiRisk: 38, salary: [70, 150], education: "bachelor", description: "Develop and execute marketing strategies to grow brand awareness and drive customer acquisition.", sideHustles: ["Freelance marketing strategy", "Social media management", "Performance marketing consulting"], entrepreneurPath: "Marketing agency" },
  { id: "real_estate_agent", title: "Real Estate Agent / Broker", riasec: "ESC", category: "Real Estate", aiRisk: 40, salary: [45, 150], education: "certificate", description: "Help clients buy, sell, and rent properties; guide transactions from listing to closing.", sideHustles: ["Real estate investing", "Property management", "Real estate photography"], entrepreneurPath: "Real estate brokerage or investing firm" },
  { id: "operations_manager", title: "Operations Manager", riasec: "ECS", category: "Business Operations", aiRisk: 30, salary: [70, 140], education: "bachelor", description: "Oversee day-to-day business operations to ensure efficiency and profitability.", sideHustles: ["Business process consulting", "Operations fractional work"], entrepreneurPath: "Operations consulting firm" },
  { id: "financial_advisor", title: "Financial Advisor / Planner", riasec: "ESC", category: "Finance", aiRisk: 30, salary: [60, 175], education: "bachelor", description: "Help individuals and families plan investments, retirement, insurance, and estate strategies.", sideHustles: ["Fee-only financial consulting", "Personal finance content creation", "Financial coaching"], entrepreneurPath: "Independent RIA practice" },
  { id: "brand_strategist", title: "Brand Strategist", riasec: "EAC", category: "Marketing", aiRisk: 28, salary: [65, 140], education: "bachelor", description: "Develop the positioning, messaging, and identity that defines how a brand is perceived.", sideHustles: ["Freelance brand strategy", "Brand identity consulting"], entrepreneurPath: "Brand consulting firm" },
  { id: "executive_recruiter", title: "Executive Recruiter / Talent Agent", riasec: "ESC", category: "Human Resources", aiRisk: 38, salary: [65, 175], education: "bachelor", description: "Identify and place senior leaders and executives at organizations.", sideHustles: ["Independent recruiting", "Career coaching", "LinkedIn talent strategy consulting"], entrepreneurPath: "Recruiting firm" },
  { id: "insurance_agent", title: "Insurance Agent / Broker", riasec: "ESC", category: "Insurance", aiRisk: 42, salary: [45, 120], education: "certificate", description: "Sell life, health, property, and casualty insurance and help clients choose appropriate coverage.", sideHustles: ["Independent broker side book", "Financial planning referral network"], entrepreneurPath: "Independent insurance agency" },
  { id: "franchise_owner", title: "Franchise Owner / Operator", riasec: "ERC", category: "Entrepreneurship", aiRisk: 25, salary: [50, 250], education: "no_degree", description: "Own and operate a business under a franchise brand with established systems and support.", sideHustles: ["Multiple franchise units", "Franchise consulting"], entrepreneurPath: "This IS the path" },
  { id: "chief_of_staff", title: "Chief of Staff / Executive Ops", riasec: "ECS", category: "Business Operations", aiRisk: 22, salary: [90, 175], education: "bachelor", description: "Support senior executives by managing priorities, communications, and strategic initiatives.", sideHustles: ["Executive coaching", "Fractional CoS work"], entrepreneurPath: "Executive services firm" },
  { id: "venture_capitalist", title: "Venture Capitalist / Angel Investor", riasec: "EIA", category: "Finance / Investing", aiRisk: 15, salary: [100, 500], education: "bachelor", description: "Invest in early-stage companies in exchange for equity; support portfolio companies to scale.", sideHustles: ["Angel investing", "Startup advising", "Investment writing"], entrepreneurPath: "Venture fund" },

  // ── CONVENTIONAL (C) ─────────────────────────────────────────────────────

  { id: "accountant", title: "Accountant / CPA", riasec: "CEI", category: "Finance", aiRisk: 55, salary: [58, 120], education: "bachelor", description: "Prepare financial statements, analyze financial data, and ensure tax compliance.", sideHustles: ["Freelance bookkeeping", "Tax prep side business", "CFO consulting for small businesses"], entrepreneurPath: "Accounting firm" },
  { id: "bookkeeper", title: "Bookkeeper", riasec: "CEI", category: "Finance", aiRisk: 72, salary: [40, 72], education: "certificate", description: "Record financial transactions and maintain accurate financial records.", sideHustles: ["Freelance bookkeeping for small businesses", "QuickBooks setup consulting"], entrepreneurPath: "Virtual bookkeeping business" },
  { id: "paralegal", title: "Paralegal / Legal Assistant", riasec: "CEI", category: "Legal", aiRisk: 58, salary: [48, 88], education: "associate", description: "Support attorneys by conducting research, preparing documents, and managing case files.", sideHustles: ["Freelance legal research", "Contract drafting for small businesses"] },
  { id: "data_analyst", title: "Data Analyst", riasec: "CIE", category: "Technology / Analytics", aiRisk: 38, salary: [60, 115], education: "bachelor", description: "Collect, clean, and analyze data to identify trends and support business decisions.", sideHustles: ["Freelance data analysis", "Dashboard building for businesses", "SQL consulting"] },
  { id: "supply_chain_analyst", title: "Supply Chain Analyst", riasec: "CIE", category: "Operations / Logistics", aiRisk: 42, salary: [58, 112], education: "bachelor", description: "Analyze and optimize procurement, inventory, and logistics operations.", sideHustles: ["Amazon FBA business", "Vending machine route ownership", "Import/export consulting"], entrepreneurPath: "Logistics consulting or vending/distribution business" },
  { id: "logistics_coordinator", title: "Logistics Coordinator", riasec: "CER", category: "Operations / Logistics", aiRisk: 48, salary: [45, 85], education: "bachelor", description: "Coordinate the movement of goods between suppliers, warehouses, and customers.", sideHustles: ["Amazon FBA", "Freight broker side business", "Trucking dispatch consulting"], entrepreneurPath: "Freight brokerage or logistics business" },
  { id: "project_coordinator", title: "Project Coordinator / Manager", riasec: "CEI", category: "Business Operations", aiRisk: 32, salary: [55, 110], education: "bachelor", description: "Plan and coordinate projects, manage timelines, budgets, and stakeholder communication.", sideHustles: ["Freelance project management", "PMO consulting"], entrepreneurPath: "Project management consulting" },
  { id: "compliance_officer", title: "Compliance Officer", riasec: "CEI", category: "Finance / Legal", aiRisk: 40, salary: [65, 130], education: "bachelor", description: "Ensure an organization operates in accordance with laws, regulations, and internal policies.", sideHustles: ["Compliance consulting", "Regulatory risk advising"] },
  { id: "medical_biller", title: "Medical Biller / Coder", riasec: "CSI", category: "Healthcare Administration", aiRisk: 68, salary: [38, 68], education: "certificate", description: "Translate medical procedures and diagnoses into billing codes and process insurance claims.", sideHustles: ["Remote medical coding freelancing", "Healthcare billing consulting"] },
  { id: "administrative_coord", title: "Administrative Coordinator / EA", riasec: "CSE", category: "Business Operations", aiRisk: 55, salary: [42, 78], education: "associate", description: "Support executives and teams with scheduling, communications, and administrative tasks.", sideHustles: ["Virtual assistant business", "Event planning", "Office setup consulting"] },
  { id: "tax_preparer", title: "Tax Preparer", riasec: "CES", category: "Finance", aiRisk: 62, salary: [38, 80], education: "certificate", description: "Prepare tax returns for individuals and small businesses during tax season.", sideHustles: ["Year-round tax consulting", "Small business accounting"], entrepreneurPath: "Tax preparation franchise" },
  { id: "property_manager", title: "Property Manager", riasec: "CER", category: "Real Estate", aiRisk: 38, salary: [48, 95], education: "certificate", description: "Oversee day-to-day operations of residential or commercial rental properties.", sideHustles: ["Property management for private landlords", "Real estate investing"], entrepreneurPath: "Property management company" },
  { id: "insurance_underwriter", title: "Insurance Underwriter", riasec: "CEI", category: "Insurance", aiRisk: 58, salary: [62, 115], education: "bachelor", description: "Evaluate insurance applications and determine coverage terms and pricing based on risk.", sideHustles: ["Risk assessment consulting", "Insurance tech advising"] },
  { id: "inventory_manager", title: "Inventory / Warehouse Manager", riasec: "CER", category: "Operations", aiRisk: 45, salary: [48, 88], education: "associate", description: "Oversee inventory control, warehouse operations, and supply chain accuracy.", sideHustles: ["Warehouse consulting", "Fulfillment setup for small businesses", "E-commerce fulfillment"], entrepreneurPath: "E-commerce / fulfillment business" },

  // ── ADDITIONAL HIGH-DEMAND / EMERGING ROLES ───────────────────────────────

  { id: "nurse_practitioner", title: "Nurse Practitioner", riasec: "SIC", category: "Healthcare", aiRisk: 12, salary: [100, 155], education: "master", description: "Provide advanced nursing care including diagnosis, treatment, and prescribing medications.", sideHustles: ["Telehealth practice", "Health coaching", "Medical writing"], entrepreneurPath: "Independent NP practice" },
  { id: "radiologist", title: "Radiologist", riasec: "ISR", category: "Healthcare", aiRisk: 30, salary: [200, 400], education: "doctoral", description: "Interpret medical images (X-ray, MRI, CT) to diagnose diseases and guide treatment.", sideHustles: ["Teleradiology reading", "Medical education content"] },
  { id: "cloud_architect", title: "Cloud Solutions Architect", riasec: "ICR", category: "Technology", aiRisk: 25, salary: [120, 210], education: "bachelor", description: "Design and manage cloud computing architecture and infrastructure for organizations.", sideHustles: ["Cloud migration consulting", "AWS/Azure freelancing"], entrepreneurPath: "Cloud consulting firm" },
  { id: "devops_engineer", title: "DevOps / Platform Engineer", riasec: "ICR", category: "Technology", aiRisk: 28, salary: [100, 185], education: "bachelor", description: "Build and maintain the infrastructure and pipelines that enable rapid software deployment.", sideHustles: ["DevOps consulting", "Infrastructure automation freelancing"] },
  { id: "product_designer", title: "Product Designer (Industrial)", riasec: "AIR", category: "Design / Manufacturing", aiRisk: 30, salary: [65, 130], education: "bachelor", description: "Design physical consumer products for manufacturing, balancing aesthetics and usability.", sideHustles: ["Freelance product design", "3D printing and prototyping"], entrepreneurPath: "Product company or design consultancy" },
  { id: "social_media_manager", title: "Social Media Manager", riasec: "AEC", category: "Marketing / Media", aiRisk: 52, salary: [45, 95], education: "bachelor", description: "Build and manage brand presence across social platforms through content, engagement, and ads.", sideHustles: ["Freelance social media management", "Content creation", "Influencer partnerships"], entrepreneurPath: "Social media agency" },
  { id: "event_planner", title: "Event Planner / Coordinator", riasec: "EAS", category: "Events & Hospitality", aiRisk: 22, salary: [42, 88], education: "bachelor", description: "Plan and execute events including corporate conferences, weddings, and nonprofit fundraisers.", sideHustles: ["Wedding planning side business", "Corporate event coordination"], entrepreneurPath: "Event planning company" },
  { id: "dietitian", title: "Registered Dietitian / Nutritionist", riasec: "SIC", category: "Healthcare / Wellness", aiRisk: 20, salary: [55, 95], education: "bachelor", description: "Assess nutritional needs and develop dietary plans for individuals and groups.", sideHustles: ["Private nutrition coaching", "Meal planning service", "Food blog/content"], entrepreneurPath: "Nutrition practice" },
  { id: "pilot", title: "Commercial Pilot", riasec: "RIE", category: "Aviation / Transportation", aiRisk: 18, salary: [80, 200], education: "associate", description: "Fly commercial aircraft transporting passengers or cargo on scheduled or charter routes.", sideHustles: ["Flight instruction", "Charter service"], entrepreneurPath: "Charter flight or flight school" },
  { id: "urban_planner", title: "Urban / Regional Planner", riasec: "ISE", category: "Government / Planning", aiRisk: 25, salary: [60, 110], education: "master", description: "Develop land use plans and programs that help create communities and accommodate growth.", sideHustles: ["Real estate consulting", "Urban design freelancing"] },
  { id: "epidemiologist", title: "Epidemiologist", riasec: "ISC", category: "Public Health", aiRisk: 22, salary: [70, 130], education: "master", description: "Study patterns, causes, and effects of diseases in populations to inform public health policy.", sideHustles: ["Public health consulting", "Health data analysis freelancing"] },
  { id: "ai_ethicist", title: "AI Ethicist / Responsible AI Analyst", riasec: "ISA", category: "Technology / Policy", aiRisk: 15, salary: [85, 165], education: "master", description: "Evaluate the ethical implications of AI systems and develop guidelines for responsible deployment.", sideHustles: ["Ethics consulting", "Policy writing", "Speaking/training"], entrepreneurPath: "AI ethics consulting firm" },
  { id: "talent_coach", title: "Career / Talent Coach", riasec: "SEA", category: "Coaching & Development", aiRisk: 18, salary: [50, 120], education: "certificate", description: "Help clients navigate career transitions, develop professional skills, and achieve their goals.", sideHustles: ["Online coaching program", "Resume writing service", "LinkedIn optimization service"], entrepreneurPath: "Coaching practice or platform" },
  { id: "supply_chain_manager", title: "Supply Chain Manager", riasec: "ECR", category: "Operations", aiRisk: 32, salary: [80, 150], education: "bachelor", description: "Oversee procurement, manufacturing, and distribution to ensure efficient supply chain operations.", sideHustles: ["Vending machine business", "Product sourcing consulting", "Amazon FBA brand"], entrepreneurPath: "Product distribution company" },
  { id: "electrician_master", title: "Master Electrician / Electrical Contractor", riasec: "RCE", category: "Skilled Trades / Business", aiRisk: 12, salary: [85, 160], education: "certificate", description: "Hold the highest level of electrical license; run a contracting business or manage large projects.", sideHustles: ["Smart home consulting", "EV infrastructure installation", "Solar integration"], entrepreneurPath: "Electrical contracting company", trades: true },
  { id: "court_reporter", title: "Court Reporter / Transcriptionist", riasec: "CIS", category: "Legal", aiRisk: 65, salary: [48, 95], education: "associate", description: "Create verbatim written records of legal proceedings and other events.", sideHustles: ["Freelance transcription", "CART captioning for events"] },
];

export default OCCUPATIONS;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get top N occupations matching a RIASEC profile string */
export function matchOccupations(riasecProfile: string, options?: { limit?: number; excludeIds?: string[] }): Occupation[] {
  const limit = options?.limit ?? 12;
  const exclude = new Set(options?.excludeIds ?? []);

  // Score each occupation by how many RIASEC letters overlap and positional weight
  function score(occ: Occupation): number {
    let s = 0;
    for (let i = 0; i < riasecProfile.length; i++) {
      const letter = riasecProfile[i];
      const pos = occ.riasec.indexOf(letter);
      if (pos === -1) continue;
      // Position in profile and position in occupation both matter
      s += (riasecProfile.length - i) * (occ.riasec.length - pos);
    }
    return s;
  }

  return OCCUPATIONS
    .filter(o => !exclude.has(o.id))
    .map(o => ({ occ: o, score: score(o) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.occ);
}

/** Get side hustle ideas matching a RIASEC profile */
export function matchSideHustles(riasecProfile: string): string[] {
  const matched = matchOccupations(riasecProfile, { limit: 20 });
  const hustles = matched.flatMap(o => o.sideHustles);
  // Deduplicate
  return [...new Set(hustles)].slice(0, 12);
}

/** Get entrepreneurship paths matching a RIASEC profile */
export function matchEntrepreneurPaths(riasecProfile: string): string[] {
  const matched = matchOccupations(riasecProfile, { limit: 20 });
  return matched
    .map(o => o.entrepreneurPath)
    .filter(Boolean) as string[];
}

/** AI risk label */
export function aiRiskLabel(risk: number): { label: string; color: string } {
  if (risk >= 65) return { label: "High automation risk", color: "#EF4444" };
  if (risk >= 40) return { label: "Moderate automation risk", color: "#F59E0B" };
  if (risk >= 20) return { label: "Low automation risk", color: "#10B981" };
  return { label: "Very low automation risk", color: "#10B981" };
}

/** Education label */
export function educationLabel(edu: Education): string {
  const labels: Record<Education, string> = {
    no_degree: "No degree required",
    certificate: "Certificate / Trade program",
    associate: "Associate degree / Apprenticeship",
    bachelor: "Bachelor's degree",
    master: "Master's degree",
    doctoral: "Doctoral / Professional degree",
  };
  return labels[edu];
}
