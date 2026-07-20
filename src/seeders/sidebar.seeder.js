import { connectDB } from "../config/db.js";
import { Sidebar } from "../modules/sidebar/sidebar.model.js";

/**
 * Default admin sidebar items.
 * Includes the required seed set plus remaining existing menu entries
 * so role filtering and nested navigation keep working.
 *
 * parentKey links children to parents during seed (resolved to parentId).
 * Parent routes that only expand (no direct NavLink) use a unique placeholder route.
 */
const DEFAULT_SIDEBAR_ITEMS = [
    // Required seed set
    { key: "dashboard", title: "Dashboard", route: "/dashboard", icon: "LayoutDashboard", order: 1, slug: "dashboard", parentKey: null },
    { key: "officials", title: "State Officials", route: "/officials", icon: "AdminPanelSettings", order: 2, slug: "officials", parentKey: null },
    { key: "districts", title: "Districts", route: "/districts", icon: "LocationCity", order: 3, slug: "districts", parentKey: null },
    { key: "clubs", title: "Clubs", route: "/clubs", icon: "Groups2", order: 4, slug: "clubs", parentKey: null },
    { key: "discipline", title: "Discipline", route: "/discipline", icon: "Layers", order: 5, slug: "discipline", parentKey: null },
    { key: "about", title: "About Us", route: "/about", icon: "Info", order: 6, slug: "about", parentKey: null },
    { key: "about-us-discipline", title: "About us Discipline", route: "/about-us-discipline", icon: "Layers", order: 7, slug: "about-us-discipline", parentKey: null },
    { key: "about-us-card", title: "About us Card", route: "/about-us-card", icon: "CreditCard", order: 8, slug: "about-us-card", parentKey: null },
    { key: "onboarding", title: "Onboarding", route: "/onboarding", icon: "Smartphone", order: 9, slug: "onboarding", parentKey: null },

    // Remaining existing admin menu (preserve functionality)
    { key: "circulars", title: "Circulars & Guidelines", route: "/circulars", icon: "FileText", order: 10, slug: "circulars", parentKey: null },
    { key: "skaters", title: "Skaters", route: "/skaters", icon: "RollerSkating", order: 11, slug: "skaters", parentKey: null },
    { key: "events", title: "Events", route: "/event", icon: "Folder", order: 12, slug: "events", parentKey: null },
    { key: "events-category", title: "Events-Category", route: "/events/category", icon: "Tags", order: 13, slug: "events-category", parentKey: "events" },
    { key: "events-formula", title: "Rules", route: "/events/formula", icon: "FunctionSquare", order: 14, slug: "events-formula", parentKey: "events" },
    { key: "events-detail", title: "Events", route: "/events/detail", icon: "Layers", order: 15, slug: "events", parentKey: "events" },
    { key: "news", title: "News", route: "/news", icon: "Newspaper", order: 16, slug: "news", parentKey: null },
    { key: "gallery", title: "Gallery", route: "/gallery", icon: "Image", order: 17, slug: "gallery", parentKey: null },
    { key: "contact-us", title: "Contact Us", route: "/contact-us", icon: "Headphones", order: 18, slug: "contact-us", parentKey: null },
    { key: "feedback", title: "Feedback", route: "/feedback", icon: "MessageSquare", order: 19, slug: "feedback", parentKey: null },
    { key: "complains", title: "Complains", route: "/complains", icon: "AlertTriangle", order: 20, slug: "complains", parentKey: null },
    { key: "certification", title: "Certification", route: "/certification", icon: "Award", order: 21, slug: "Certification", parentKey: null },
    { key: "reports", title: "Reports", route: "/reports", icon: "Inbox", order: 22, slug: "reports", parentKey: null },
    { key: "school-reports", title: "School", route: "/reports/school", icon: "School", order: 23, slug: "school-reports", parentKey: "reports" },
    { key: "official-reports", title: "Official", route: "/reports/official", icon: "WorkspacePremium", order: 24, slug: "official-reports", parentKey: "reports" },
    { key: "parent-reports", title: "Parent", route: "/reports/parent", icon: "FamilyRestroom", order: 25, slug: "parent-reports", parentKey: "reports" },
    { key: "academy-reports", title: "Academy", route: "/reports/academy", icon: "Business", order: 26, slug: "academy-reports", parentKey: "reports" },
    { key: "guest-reports", title: "Guest", route: "/reports/guest", icon: "PersonOutlined", order: 27, slug: "guest-reports", parentKey: "reports" },
    { key: "support-hub", title: "Support-Hub", route: "/support-hub", icon: "HelpingHand", order: 28, slug: "Support-Hub", parentKey: null },
    { key: "donation", title: "Donation", route: "/support-hub/donation", icon: "HeartHandshake", order: 29, slug: "Donation", parentKey: "support-hub" },
    { key: "sponsorship", title: "sponsorship", route: "/support-hub/sponsorship", icon: "Handshake", order: 30, slug: "sponsorship", parentKey: "support-hub" },
];

/**
 * Idempotent sidebar seeder.
 * Inserts missing items by unique `route`; never creates duplicates.
 */
export async function seedSidebar() {
    const keyToId = new Map();
    let created = 0;
    let skipped = 0;

    const parents = DEFAULT_SIDEBAR_ITEMS.filter((item) => !item.parentKey);
    const children = DEFAULT_SIDEBAR_ITEMS.filter((item) => item.parentKey);

    for (const item of [...parents, ...children]) {
        const existing = await Sidebar.findOne({ route: item.route }).lean();

        if (existing) {
            keyToId.set(item.key, existing._id);
            skipped += 1;
            continue;
        }

        let parentId = null;
        if (item.parentKey) {
            parentId = keyToId.get(item.parentKey) || null;
            if (!parentId) {
                const parentDef = DEFAULT_SIDEBAR_ITEMS.find((p) => p.key === item.parentKey);
                if (parentDef?.route) {
                    const parentDoc = await Sidebar.findOne({ route: parentDef.route }).lean();
                    if (parentDoc) {
                        parentId = parentDoc._id;
                        keyToId.set(item.parentKey, parentDoc._id);
                    }
                }
            }
        }

        const doc = await Sidebar.create({
            title: item.title,
            route: item.route,
            icon: item.icon,
            parentId,
            order: item.order,
            isActive: true,
            slug: item.slug,
        });

        keyToId.set(item.key, doc._id);
        created += 1;
    }

    return { created, skipped, total: DEFAULT_SIDEBAR_ITEMS.length };
}

/**
 * CLI entry: `npm run seed:sidebar`
 */
async function run() {
    try {
        await connectDB();
        const result = await seedSidebar();
        console.log(
            `Sidebar seeder complete — created: ${result.created}, skipped: ${result.skipped}, total defaults: ${result.total}`
        );
        process.exit(0);
    } catch (error) {
        console.error("Sidebar seeder failed:", error);
        process.exit(1);
    }
}

const isDirectRun =
    process.argv[1] &&
    (process.argv[1].endsWith("sidebar.seeder.js") ||
        process.argv[1].includes("sidebar.seeder"));

if (isDirectRun) {
    run();
}
