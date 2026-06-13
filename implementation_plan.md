# Dynamic Data Seeding Implementation Plan

The goal is to modify `prisma/seed.ts` so that it dynamically seeds:
1. Exactly 38 districts (using existing data from `tn_locations.json`).
2. **7 Members** per district.
3. **2 Coaches** per district.
4. **50 Players (Students)** per district, evenly split into **5 different Age & Weight categories** (10 players per category per district).

## Proposed Categories

Since the base `Student` model only stores `age`/`dob` but not `weight`, we will create a global **Dummy Tournament** and automatically register the players with their specific weight categories to fully satisfy the requirement.

The 5 proposed categories will be:
- **Category 1:** Age 14, Weight 40kg
- **Category 2:** Age 16, Weight 50kg
- **Category 3:** Age 18, Weight 60kg
- **Category 4:** Age 20, Weight 70kg
- **Category 5:** Age 22, Weight 80kg

*(If you would like different age or weight values, please let me know!)*

## Proposed Changes

### Backend Seeding Logic

#### [MODIFY] [seed.ts](file:///d:/New%20folder/tnja-backend/prisma/seed.ts)
I will modify the `seed.ts` script to:
1. Ensure the 38 districts and their taluks are created from `tn_locations.json`.
2. Create **1 Global Dummy Tournament** (Status: APPROVED) to hold the weight registrations.
3. For **each district** (in a loop of 38 districts):
   - Pick the first `taluk` of that district for address mapping.
   - Create a dummy **Club** for the district to map the players to.
   - Generate **7 Members**: We will generate members dynamically in a loop with sequential IDs and standard test data.
   - Generate **2 Coaches**: We will generate coaches dynamically in a loop with standard test data.
   - Generate **50 Players**:
     - Loop through the 5 categories (10 players each).
     - Set the player's `dob` to match the category's Age.
     - Create a `TournamentRegistration` for the player in the Dummy Tournament, setting the `weight` field to the category's Weight (e.g., "40kg").

## Verification Plan

### Automated Verification
- Run `npx prisma db seed` to execute the new seeding logic.
- Verify that exactly 38 districts are present in the Database.
- Run a verification script to confirm:
  - Total Members = 38 * 7 = 266
  - Total Coaches = 38 * 2 = 76
  - Total Players = 38 * 50 = 1900
  - Total Tournament Registrations = 1900 (each tagged with the correct weight).
