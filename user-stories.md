BACKLOG – EPICS, USER STORIES AND ACCEPTANCE CRITERIA

EPIC 1: Account and Authentication
Description
This epic covers functionality related to user accounts, authentication and protected pages. Players must be able to create an account, log in, log out and access their saved progression.

US-01 Register account
As a player I want to register an account so that my progression can be saved.

AC

Given a valid email and password, when I register, a User is created in the database.

Given that the email already exists, when I register, a clear error is returned.

Passwords are never stored in plain text.

US-02 Login
As a player I want to log in so that I can access my saved character.

AC

Given valid credentials, when I log in, a session is created.

Given invalid credentials, the system returns a generic error message.

After login the user is redirected to the dashboard.

US-03 Logout
As a player I want to log out so that my account remains secure.

AC

When the player logs out the session is destroyed.

Protected pages require login again.

US-04 Protected pages
As a system I want gameplay pages to require authentication.

AC

Dashboard, activities, shop, inventory and log require authentication.

API endpoints reject requests without a valid session.

EPIC 2: Character
Description
This epic handles character creation and viewing character information.

US-05 Create character
As a player I want to create a character so that I can start playing.

AC

The player chooses name, class and stats.

A Character record is stored in the database.

US-05.2 Point-buy system
As a player I want to use a point-buy system so that builds require trade-offs.

AC

Stats must be between 8 and 15.

Total budget is 27 points.

Validation is done server-side.

US-06 Active character
As a player I want the system to know which character is mine.

AC

A User has one active Character.

Dashboard automatically loads the correct character.

US-07 Character overview
As a player I want to see my stats.

AC

Character view shows stats and resources.

Data matches the database.

EPIC 3: Dashboard (Core Loop)

US-08 View resources
As a player I want to see HP, Energy, Gold, XP, Level and Renown.

AC

Dashboard displays all resources.

Values update after actions.

US-09 Resource limits
As a system I want resource limits.

AC

HP cannot go below 0.

Energy cannot go below 0.

Gold cannot become negative.

US-10 Block actions without Energy
As a player I should not be able to start activities without energy.

AC

The system blocks the activity.

No database update occurs.

EPIC 4: Activities

US-11 Roll engine
As a system I want to calculate outcomes using randomness and stat modifiers.

AC

Rolls use random values and stat modifiers.

Results are logged.

US-12 Quest
As a player I want to perform quests for stable progression.

AC

Quest costs energy.

Success grants rewards.

Failure causes penalties.

US-13 Adventures
As a player I want to take riskier adventures.

AC

Higher risk than quests.

Larger rewards.

US-14 Arena
As a player I want to fight in the arena.

AC

Arena costs energy.

Success grants XP and Renown.

US-15 Result view
As a player I want to see the outcome of my actions.

AC

Results display success or failure.

Resource changes are shown.

EPIC 5: Shop and Inventory

US-16 View shop
As a player I want to see items in a shop.

AC

Items display price and effect.

US-17 Buy item
As a player I want to purchase items.

AC

Gold decreases.

Item is added to inventory.

US-18 View inventory
As a player I want to see my items.

AC

Inventory lists owned items.

Equipped items are visible.

US-19 Equip item
As a player I want to equip items.

AC

Equip status is saved in the database.

Stats are affected.

EPIC 6: Activity Log

US-20 Log actions
As a system I want to log player actions.

AC

Each activity creates a log entry.

US-21 View recent actions
As a player I want to see recent actions.

AC

Log view shows latest entries.

US-22 Progress persistence
As a player I want progress saved between sessions.

AC

Resources, inventory and log remain after login.

EPIC 7: Delivery Requirements

US-23 README
As a developer I want installation instructions.

AC

README explains installation and how to start the project.

US-24 Database models
As a system I want database models.

AC

User

Character

Inventory

ActivityLog

US-25 Git strategy
As a student I want proper Git usage.

AC

Branches are used.

Commits have clear prefixes.

US-26 MVP scope
As a project owner I want realistic scope.

AC

All MVP features work.

EPIC 8: Energy and Time Regeneration

US-27 Energy regeneration
As a player I want energy to regenerate over time.

AC

Energy increases automatically.

US-28 Energy timer
As a player I want to see when energy returns.

AC

Dashboard displays a timer.

EPIC 9: Level and Progression

US-29 Level up
As a player I want to level up.

AC

XP exceeding a threshold increases level.

US-30 Level affects gameplay

AC

Level influences rolls or rewards.

EPIC 10: Class Identity

US-31 Class affects stats

AC

Each class grants a stat bonus.

US-32 Class passive ability

AC

Each class has a unique gameplay bonus.

EPIC 11: Game Balance

US-33 Heat affects risk

AC

Higher heat increases risk.

US-34 Maximum stat limits

AC

Stats cannot exceed a defined maximum.

EPIC 12: UI and Feedback

US-35 Action feedback

AC

Result of actions is clearly shown.

US-36 Loading state

AC

Buttons are disabled during requests.

EPIC 13: API Security

US-37 Input validation

AC

Server validates input.

US-38 Server-side resource checks

AC

Energy and Gold validated server-side.

EPIC 14: Data Consistency and Debugging

US-39 Database transactions

AC

Activities save atomically.

US-40 Inventory rules

AC

Same slot cannot equip multiple items.

US-41 Error logging

AC

Server logs errors.

US-42 Debug view

AC

Development view for testing.

EPIC 15: Random Events

US-43 Random event after activity

AC

Activities may trigger a random event.

Event can modify rewards or penalties.

EPIC 16: Critical Success and Failure

US-44 Critical success

AC

Exceptional rolls grant bonus rewards.

US-45 Critical failure

AC

Very low rolls increase penalties.

EPIC 17: Item Rarity

US-46 Item rarity system

AC

Items have rarity tiers (Common, Uncommon, Rare).

Rarity affects stats or price.

EPIC 18: Daily Rewards

US-47 Daily login reward

AC

Player can claim a reward once per day.

EPIC 19: Exploration Areas

US-48 Multiple activity locations

AC

Activities can occur in different areas.

Areas have different risk/reward profiles.

EPIC 20: Achievements

US-49 Achievement system

AC

Achievements unlock after milestones.

EPIC 21: Economy Balancing

US-50 Item price balance

AC

Item price correlates with stat bonuses.

EPIC 22: Flavor Text and Immersion

US-51 Flavor text

AC

Activity results include narrative text.

EPIC 23: Arena NPC Enemies

US-52 NPC fighters

AC

Arena can generate different enemy types.

EPIC 24: Unlockable Content

US-53 Unlock system

AC

Certain features unlock at specific levels.

EPIC 25: Progression Milestones

US-54 Progress milestones

AC

Reaching milestones grants bonuses or unlocks.