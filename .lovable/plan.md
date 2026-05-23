
# Classifieds Marketplace — Build Plan (v2)

Same as the previously approved plan, with one scope change you requested:

## Geographic seed (updated)

Instead of one country, seed cities for **three countries**:
- **United States** — all 50 states, with major cities per state (~300 cities total)
- **United Kingdom** — all major cities across England, Scotland, Wales, Northern Ireland (~100 cities)
- **Canada** — all provinces and major cities (~80 cities)

Cities table gets a `country` column (US / UK / CA) and a `region` column (state / province / country sub-region). City picker becomes a 2-step: country → city, with search.

Note: "all cities" literally means every town would be tens of thousands of rows. I'll seed all major + mid-size cities (population thresholds: US ≥50k, UK ≥30k, Canada ≥25k). That gives a comprehensive list without bloating the DB. If you want truly every town later, we can import from an open dataset.

## Everything else unchanged from approved plan

- **Design:** Modern utility (teal) direction
- **Build phases:** Cloud + auth → schema + seed → public browsing → posting → messaging/favorites/reports → admin → payments → polish
- All routes, tables, RLS, server functions, payments approach as previously approved

I'll start building immediately on approval.
