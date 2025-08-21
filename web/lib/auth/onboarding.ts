import User from "@/models/User";
import Organization from "@/models/Organization";
import Plan from "@/models/Plan";
import { connectDB } from "@/lib/db";
import type { User as NextAuthUser } from "next-auth";

/**
 * Handles the initial setup for a brand new user.
 * This function is called when a user signs up for the first time.
 * It creates a default "Free" plan if one doesn't exist, creates a new
 * organization for the user, and updates the user's role to "owner".
 */
export async function handleNewUserOnboarding(user: NextAuthUser) {
  try {
    await connectDB();

    // Check if the user already has an organization. If so, they are not a new user.
    const dbUser = await User.findById(user.id);
    if (!dbUser || dbUser.org_id) {
      console.log(`User ${user.email} already has an organization. Skipping new user setup.`);
      return;
    }
    
    console.log(`Performing first-time setup for new user: ${user.email}`);

    // Step 1: Find or create the default "Free" plan.
    let freePlan = await Plan.findOne({ name: "Free" });
    if (!freePlan) {
      console.log("No 'Free' plan found. Creating a default one.");
      freePlan = new Plan({
        name: "Free",
        limits: { users: 1, domains: 1, storage: 1 }, // in GB
        price: 0,
        customizable: false,
        features: ["Basic Email", "1 Domain", "1 User"],
      });
      await freePlan.save();
    }

    // Step 2: Create a new organization for the user.
    // We can name it based on the user's name initially.
    const orgName = `${user.name}'s Organization`;
    const organization = new Organization({
      name: orgName,
      plan_id: freePlan._id,
    });
    await organization.save();

    // Step 3: Update the newly created user document.
    // Set their role to "owner" and link them to the new organization.
    dbUser.org_id = organization._id;
    dbUser.role = "owner";
    dbUser.onboarding = {
      completed: false, // Start the onboarding process
      startedAt: new Date(),
    };
    // By default, the owner does not have mailbox access until they set up a domain/user.
    dbUser.mailboxAccess = false; 
    
    await dbUser.save();

    console.log(`Successfully created organization ${organization._id} for user ${user.id}`);

  } catch (error) {
    console.error("Error during new user onboarding setup:", error);
    // You might want to add more robust error handling here,
    // like sending an alert to an admin.
  }
}