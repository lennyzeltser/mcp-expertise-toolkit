# Example Session: BBQ Competition Scoring Server in Action

This demo shows how [`bbq-scoring.yaml`](bbq-scoring.yaml) works in practice. A competition cook describes their rib entry, and the AI uses the MCP server to provide expert judging feedback based on KCBS standards.

## The User's Request

A BBQ competitor is preparing for their first contest and wants feedback on their practice cook:

```
I'm entering my first BBQ competition next weekend. Can you give me
feedback on my pork ribs based on how they turned out today?

Here's what I did:
- St. Louis cut spare ribs
- Applied my rub the night before
- Smoked at 275°F with hickory for 5 hours
- Wrapped in foil with butter and honey for the last 2 hours
- Finished with Sweet Baby Ray's, applied right before boxing

Results:
- Nice mahogany color
- The meat falls right off the bone when you pick them up
- Good smoke ring
- Very tender - my family loved them
```

## Behind the Scenes

The AI recognizes this as a BBQ scoring task and calls the MCP server:

**Tool call:** `review_bbq_content`
```json
{
  "checkpoints": ["appearance_sauce", "tenderness_ribs", "taste_sauce"],
  "focus": ["overcooked", "sauceOverload"],
  "category": "ribs"
}
```

**Server returns:** Judging criteria specific to competition ribs, including the critical "competition bite" standard, sauce application guidelines, and common mistakes that cost points.

## The AI's Feedback

Using the expertise from the server, the assistant responds:

---

**Competition Feedback: Pork Ribs**

**What you're doing well:**
- St. Louis cut is the right choice for competition (more forgiving than baby backs)
- Overnight rub gives good seasoning penetration
- Mahogany color sounds right for appearance
- Smoke ring shows proper low-and-slow technique

**Critical adjustments for competition:**

**1. Your ribs are overcooked for competition**

"Falls right off the bone" is perfect for backyard BBQ but will cost you significant points in competition. KCBS judges expect "competition bite":

*What you have:* Meat slides off bone when lifted

*Competition standard:* When you bite the rib, your teeth leave clean marks. The meat pulls away from the bone with slight resistance, not by gravity.

**Fix:** Reduce your wrap time. Try 2 hours smoke, 1 hour wrapped, 30 minutes unwrapped to set. The "bend test" helps—ribs should bend and crack on the surface, not fold limply.

**2. Sauce choice and timing need work**

Sweet Baby Ray's is a solid backyard sauce, but competition judges will recognize it—and "applied right before boxing" means it's still wet.

*Issues:*
- Commercial sauce reads as "didn't make their own"
- Wet sauce can pool in the box and drip
- No time for sauce to set and caramelize

**Fix:** Either make your own sauce (shows craft) or significantly doctor a commercial base. Apply sauce 20-30 minutes before turn-in and return ribs to the cooker to let it set/tack up. It should be sticky, not wet.

**3. Consider your wrap technique**

Foil with butter and honey for 2 hours is likely contributing to the over-tenderness. That liquid braises the ribs.

*Competition approach:*
- Use less liquid or switch to butcher paper (less steam)
- Wrap for 45-60 minutes, not 2 hours
- Some competitors don't wrap at all

**4. Turn-in box presentation**

You didn't mention your box presentation, but this matters:
- Six ribs, uniform in size
- Best side up, consistent orientation
- Sauce set (not pooling)
- Clean box liner

---

## How Generic AI Would Miss This

Generic AI gives encouragement. Competition expertise gives specific, actionable corrections:

| What You Said | Generic AI Response | Expert Response |
|---------------|--------------------|-----------------------------|
| "Falls right off the bone" | "Perfect tenderness!" | "Overcooked—need 'competition bite' with slight resistance" |
| "Sweet Baby Ray's" | "Good choice" | "Judges recognize commercial sauce—make your own or doctor it" |
| "Applied right before boxing" | No comment | "Too late—sauce will be wet and may pool in the box" |
| "Very tender, family loved them" | "Sounds delicious!" | "Family standard ≠ competition standard—judges expect specific texture" |

## The Competition Scoring System

KCBS judges score three categories:

| Category | Points | What Judges Look For |
|----------|--------|---------------------|
| **Appearance** | Up to 9 | Color, sauce application, uniformity, no pooling |
| **Taste** | Up to 9 | Balance of smoke, seasoning, sauce, meat flavor |
| **Tenderness** | Up to 9 | "Competition bite"—clean pull, not fall-off-bone |

Based on the description, here's a rough score estimate:

| Category | Likely Score | Why |
|----------|--------------|-----|
| Appearance | 7-8 | Good color, but sauce might pool if wet |
| Taste | 6-7 | Commercial sauce recognized, may taste one-note |
| Tenderness | 5-6 | Fall-off-bone costs major points |

Winning scores average 8+ in each category. The tenderness issue alone drops this entry from competitive to middle-of-pack.

## How Guidelines Shaped the Feedback

| Guideline from YAML | How It Appeared in Feedback |
|---------------------|----------------------------|
| "Ribs should pull clean from the bone with light tug, not fall off" | Explained competition bite vs. fall-off-bone |
| "Sauce should have depth—sweet, savory, tangy, maybe heat" | Noted commercial sauce is one-dimensional |
| "Sauce is set/tacky, not wet and dripping" | Advised applying sauce earlier to let it set |
| "Compare to competition standard, not backyard expectations" | Distinguished family feedback from judge expectations |
